import api from "../axiosInstance";

// ─── Textbooks ───────────────────────────────────────────────────────────────
export async function fetchTextbooks(params = {}) {
  const { data } = await api.get("/textbooks", { params });
  return data;
}

export async function fetchTextbookById(id) {
  const { data } = await api.get(`/textbooks/${id}`);
  return data;
}

export async function createTextbook(payload) {
  const { data } = await api.post("/textbooks", payload);
  return data;
}

export async function updateTextbook(id, payload) {
  const { data } = await api.put(`/textbooks/${id}`, payload);
  return data;
}

export async function deleteTextbook(id) {
  const { data } = await api.delete(`/textbooks/${id}`);
  return data;
}

// ─── Chapters ────────────────────────────────────────────────────────────────
export async function fetchChapters(params = {}) {
  const { data } = await api.get("/chapters", { params });
  return data;
}

export async function createChapter(payload) {
  const { data } = await api.post("/chapters", payload);
  return data;
}

export async function updateChapter(id, payload) {
  const { data } = await api.patch(`/chapters/${id}`, payload);
  return data;
}

export async function deleteChapter(id) {
  const { data } = await api.delete(`/chapters/${id}`);
  return data;
}
