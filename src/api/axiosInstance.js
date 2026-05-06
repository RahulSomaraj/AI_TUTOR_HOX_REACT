import axios from "axios";

const BASE_URL = "https://uatai.hoxinfotech.com";

// Tracks whether a refresh call is already in flight
let isRefreshing = false;

// Requests that arrived while a refresh was in progress are queued here.
// Once we get a new token, we replay them all at once.
let pendingRequests = [];

function resolvePending(newToken) {
  pendingRequests.forEach(({ resolve }) => resolve(newToken));
  pendingRequests = [];
}

function rejectPending(error) {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
}

function clearSessionAndRedirect() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("adminUser");
  window.location.href = "/login";
}

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ────────────────────────────────────────────────────
// Automatically attach the stored access token to every outgoing request.
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────
// On a 401 (token expired), silently fetch a new access token and replay
// the original request. The caller never knows a refresh happened.
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const is401            = error.response?.status === 401;
    const isRefreshRoute   = original.url?.includes("/refresh-token");
    const alreadyRetried   = original._retry;

    // Don't attempt refresh if:
    //  - It wasn't a 401
    //  - The failing request WAS the refresh call (avoid infinite loop)
    //  - We've already retried this exact request once
    if (!is401 || isRefreshRoute || alreadyRetried) {
      if (is401 && isRefreshRoute) clearSessionAndRedirect();
      return Promise.reject(error);
    }

    // If another request already started a refresh, queue this one and wait
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(original);
      });
    }

    // Mark this request so it won't be retried more than once
    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token stored.");

      // Call /refresh-token with raw axios so this request bypasses our
      // interceptor and won't trigger another refresh attempt.
      const { data } = await axios.post(
        `${BASE_URL}/refresh-token`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const raw = data?.data?.token;
      if (!raw) throw new Error("Refresh response missing token.");

      const newToken = raw.replace(/^Bearer\s+/i, "");
      localStorage.setItem("accessToken", newToken);

      // Unblock every request that was queued while we were refreshing
      resolvePending(newToken);

      // Replay the original failed request with the fresh token
      original.headers.Authorization = `Bearer ${newToken}`;
      return axiosInstance(original);
    } catch (refreshError) {
      rejectPending(refreshError);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosInstance;
