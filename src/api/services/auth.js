import axios from "axios";
import api from "../axiosInstance";
import {
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setStoredUser,
} from "../../lib/session";
import logger from "../../lib/logger";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available. Please log in again.");

  // Raw axios (not the intercepted instance) to avoid an infinite retry loop.
  const { data } = await axios.post(
    `${BASE_URL}/refresh-token`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } }
  );

  const raw = data?.data?.token;
  if (!raw) throw new Error("Refresh response did not contain a new token.");

  setAccessToken(raw);
  return raw.replace(/^Bearer\s+/i, "");
}
