import { useCallback, useEffect, useMemo, useState } from "react"; // Removed 'createContext' and 'useContext'
import { clearSession, getStoredUser, isAuthenticated as hasToken, setStoredUser, } from "../lib/session";
import { loginAndGetToken, adminLogout, fetchMyProfile } from "../api/services/auth";
import logger from "../lib/logger";

// 1. Import the shared context from your hooks folder
import { AuthContext } from "../hooks/useAuth"; 

// 2. This file now strictly exports ONE single React component. 
// Fast Refresh is now 100% happy and will never throw a warning here.
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
