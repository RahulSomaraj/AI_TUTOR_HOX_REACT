import api from "../axiosInstance";

// ─── Schools ─────────────────────────────────────────────────────────────────
export async function fetchSchools(params = {}) {
  const { data } = await api.get("/school", { params });
  return data;
}

export async function fetchSchoolById(id) {
  const { data } = await api.get(`/school/${id}`);
  return data;
}

export async function createSchool(payload) {
  const { data } = await api.post("/school", payload);
  return data;
}

export async function updateSchool(id, payload) {
  const { data } = await api.patch(`/school/${id}`, payload);
  return data;
}

export async function deleteSchool(id) {
  const { data } = await api.delete(`/school/${id}`);
  return data;
}
