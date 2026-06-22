import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearSession,
  getStoredUser,
  isAuthenticated as hasToken,
  setStoredUser,
} from "../lib/session";
import { loginAndGetToken, adminLogout, fetchMyProfile } from "../api/services/auth";
import logger from "../lib/logger";

// Centralized auth/session state. Replaces scattered localStorage reads in
// ProtectedRoute, Navbar, loginPage, and authService. Token persistence is still
// localStorage-backed for now (see session.js); the Phase-2 move to httpOnly
// cookies only needs to change session.js, not this context.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [authed, setAuthed] = useState(() => hasToken());

  const login = useCallback(async (username, password) => {
    await loginAndGetToken(username, password);
    setUser(getStoredUser());
    setAuthed(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } catch (err) {
      logger.error("Logout API failed (clearing session anyway):", err);
    } finally {
      clearSession();
      setUser(null);
      setAuthed(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await fetchMyProfile();
      if (!profile) return;
      const merged = {
        id: profile.id || profile._id || user?.id || null,
        name: profile.name || profile.fullName || user?.name || "Admin User",
        role: profile.role || profile.userType || user?.role || "Admin",
        avatar: profile.avatar || profile.profileImage || user?.avatar || "",
      };
      setStoredUser(merged);
      setUser(merged);
    } catch (err) {
      logger.error("Profile refresh failed:", err);
    }
  }, [user]);

  // Keep context in sync if another tab logs out (clears the token).
  useEffect(() => {
    function onStorage() {
      setAuthed(hasToken());
      setUser(getStoredUser());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: authed, login, logout, refreshUser, setUser }),
    [user, authed, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export default AuthContext;
