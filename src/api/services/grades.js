import api from "../axiosInstance";

// ─── Grades ─────────────────────────────────────────────────────────────────
export async function fetchGrades() {
  const { data } = await api.get("/grades");
  return data;
}

export async function fetchGradeById(id) {
  const { data } = await api.get(`/grades/${id}`);
  return data;
}

export async function fetchStudentsByGrade(id, params = {}) {
  const { data } = await api.get(`/users`, { params: { gradeId: id, ...params } });
  return data;
}

// ─── Classes (grades) ────────────────────────────────────────────────────────
export async function fetchClasses(params = {}) {
  const { data } = await api.get("/grades", { params });
  return data;
}

export async function createClass(payload) {
  const { data } = await api.post("/grades", payload);
  return data;
}

export async function updateClass(id, payload) {
  const { data } = await api.patch(`/grades/${id}`, payload);
  return data;
}

export async function deleteClass(id) {
  const { data } = await api.delete(`/grades/${id}`);
  return data;
}
