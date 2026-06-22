// Single source of truth for session persistence.
//
// Every read/write of the access token, refresh token, and cached admin profile
// goes through here instead of touching `localStorage` directly all over the app.
// Centralizing it means: (a) one place to reason about what we persist, and
// (b) a clean seam for the planned Phase-2 migration to httpOnly cookies — only
// this file changes, not every component.
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const ADMIN_USER_KEY = "adminUser";

function stripBearer(raw) {
  return typeof raw === "string" ? raw.replace(/^Bearer\s+/i, "") : raw;
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, stripBearer(token));
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}
