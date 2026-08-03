import api from "../axiosInstance";
import {
  setAccessToken,
  setRefreshToken,
  setStoredUser,
} from "../../lib/session";
import logger from "../../lib/logger";

function isEmail(value) {
  return typeof value === "string" && value.includes("@");
}

function getAdminDisplayName(user) {
  const firstLastName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const displayName =
    user.name || user.fullName || user.displayName || firstLastName || user.username;
  return displayName && !isEmail(displayName) ? displayName : "Admin User";
}

export async function loginAndGetToken(username, password) {
  try {
    const { data } = await api.post("/admin/login", { username, password });

    const rawToken = data?.data?.token;
    if (!rawToken) throw new Error("Token not found in login response");

    const loggedInUser =
      data?.data?.user || data?.data?.admin || data?.user || {};
    const adminUser = {
      id: loggedInUser.id || loggedInUser._id || null,
      name: getAdminDisplayName(loggedInUser),
      role: loggedInUser.role || loggedInUser.userType || "Admin",
      avatar: loggedInUser.avatar || loggedInUser.profileImage || "",
    };

    setAccessToken(rawToken);
    if (data?.data?.refreshToken) setRefreshToken(data.data.refreshToken);
    setStoredUser(adminUser);

    return rawToken.replace(/^Bearer\s+/i, "");
  } catch (err) {
    logger.error("Login failed:", err);
    throw err;
  }
}

export async function adminLogout() {
  const { data } = await api.post("/admin/logout");
  return data;
}

export async function deleteAdminAccount(id) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}

export async function fetchMyProfile() {
  const { data } = await api.get("/my-profile");
  return data?.data ?? data;
}

// NOTE: refreshing is deliberately NOT exposed here. `src/api/axiosInstance.js`
// owns the only refresh path, because refresh tokens are single-use (rotation)
// and only one refresh may be in flight at a time — a second entry point would
// race it and burn the token. Let the 401 interceptor handle it.
