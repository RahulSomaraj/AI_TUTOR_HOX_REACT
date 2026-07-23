import api from "../axiosInstance";

// ─── Attendance ──────────────────────────────────────────────────────────────
export async function fetchAttendance(params = {}) {
  const { data } = await api.get("/attendance", { params });
  return data;
}

export async function fetchAttendanceById(id) {
  const { data } = await api.get(`/attendance/${id}`);
  return data;
}

export async function createAttendance(payload) {
  const { data } = await api.post("/attendance", payload);
  return data;
}

export async function updateAttendance(id, payload) {
  const { data } = await api.put(`/attendance/${id}`, payload);
  return data;
}

export async function deleteAttendance(id) {
  const { data } = await api.delete(`/attendance/${id}`);
  return data;
}

export async function exportAttendanceCsv(params = {}) {
  const { data } = await api.get("/attendance/export-file", { params });
  return data;
}
