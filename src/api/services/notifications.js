import api from "../axiosInstance";

// ─── Notifications ───────────────────────────────────────────────────────────
export async function sendNotification(payload) {
  const { data } = await api.post("/notifications/send", payload);
  return data;
}

export async function fetchNotifications(params = {}) {
  const { data } = await api.get("/notifications", { params });
  return data;
}
