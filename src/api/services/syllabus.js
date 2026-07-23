import api from "../axiosInstance";

// ─── Syllabus ────────────────────────────────────────────────────────────────
export async function fetchSyllabusByGrade(boardGradeId) {
  const { data } = await api.get(`/syllabus`, { params: { boardGradeId } });
  return data;
}

export async function fetchSyllabi(params = {}) {
  const { data } = await api.get("/syllabus", { params });
  return data;
}

export async function fetchSyllabusById(id) {
  const { data } = await api.get(`/syllabus/${id}`);
  return data;
}

export async function createSyllabus(payload) {
  const { data } = await api.post("/syllabus", payload);
  return data;
}

export async function updateSyllabus(id, payload) {
  const { data } = await api.patch(`/syllabus/${id}`, payload);
  return data;
}

export async function deleteSyllabus(id) {
  const { data } = await api.delete(`/syllabus/${id}`);
  return data;
}

export async function updateSyllabusApproval(id, payload) {
  const { data } = await api.put(`/syllabus/${id}/approval`, payload);
  return data;
}
