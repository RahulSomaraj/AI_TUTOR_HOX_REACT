import api from "../axiosInstance";

// ─── Parents ─────────────────────────────────────────────────────────────────
export async function fetchParents(params = {}) {
  const { data } = await api.get("/parents", { params });
  return data;
}

export async function fetchParentById(id) {
  const { data } = await api.get(`/parents/${id}`);
  return data;
}

export async function createParent(payload) {
  const { data } = await api.post("/parents", payload);
  return data;
}

export async function updateParent(id, payload) {
  const { data } = await api.put(`/parents/${id}`, payload);
  return data;
}

export async function deleteParent(id) {
  const { data } = await api.delete(`/parents/${id}`);
  return data;
}
