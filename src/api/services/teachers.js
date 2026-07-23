import api from "../axiosInstance";

// ─── Admin users ─────────────────────────────────────────────────────────────
export async function fetchAdminUsers(params = {}) {
  const { data } = await api.get("/admin/users", { params });
  return data;
}

// ─── Teachers ────────────────────────────────────────────────────────────────
export async function fetchTeachers(params = {}) {
  const { data } = await api.get("/admin/users", {
    params: { userType: "TEACHER", ...params },
  });
  return data;
}

export async function createTeacher(payload) {
  const { data } = await api.post("/admin/users", payload);
  return data;
}

export async function updateTeacher(id, payload) {
  const { data } = await api.put(`/admin/users/${id}`, payload);
  return data;
}

export async function deleteTeacher(id) {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
}
