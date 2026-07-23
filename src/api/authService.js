// Barrel module — preserves the historical `../api/authService` import path used
// across all pages while the implementation is progressively split into focused
// domain services under `./services/`. New code should import from the specific
// service module; existing imports here keep working unchanged.
import api from "./axiosInstance";

// ─── Re-exported from split services ────────────────────────────────────────
export {
  loginAndGetToken,
  adminLogout,
  deleteAdminAccount,
  fetchMyProfile,
  refreshAccessToken,
} from "./services/auth";

export {
  fetchSubjects,
  fetchSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  fetchBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  fetchBoardGrades,
  createBoardGrade,
  deleteBoardGrade,
  updateBoardGrade,
  uploadFile,
} from "./services/catalog";

export * from "./services/finance";

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

// ─── Notifications ───────────────────────────────────────────────────────────
export async function sendNotification(payload) {
  const { data } = await api.post("/notifications/send", payload);
  return data;
}

export async function fetchNotifications(params = {}) {
  const { data } = await api.get("/notifications", { params });
  return data;
}

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

// ─── Banners ─────────────────────────────────────────────────────────────────
export async function fetchBanners(params = {}) {
  const { data } = await api.get("/banners", { params });
  return data;
}

export async function fetchBannerById(id) {
  const { data } = await api.get(`/banners/${id}`);
  return data;
}

export async function createBanner(payload) {
  const { data } = await api.post("/banners", payload);
  return data;
}

export async function updateBanner(id, payload) {
  const { data } = await api.patch(`/banners/${id}`, payload);
  return data;
}

export async function deleteBanner(id) {
  const { data } = await api.delete(`/banners/${id}`);
  return data;
}

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
