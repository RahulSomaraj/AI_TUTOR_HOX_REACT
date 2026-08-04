import api from "../axiosInstance";
import logger from "../../lib/logger";

// ─── Students (users) ────────────────────────────────────────────────────────
export async function fetchAllStudents(params = {}) {
  const { data } = await api.get("/users", { params });
  return data;
}

export async function fetchStudentById(id) {
  const { data } = await api.get(`/users/${id}`);
  return data?.data ?? data;
}

export async function createStudent(payload) {
  logger.debug("Submitting student payload:", payload);
  const { data } = await api.post("/users", payload);
  return data;
}

export async function deleteStudent(id) {
  const { data } = await api.delete(`/users/${id}`);
  return data;
}

export async function updateStudent(id, payload) {
  const { data } = await api.put(`/users/${id}`, payload);
  return data;
}

/**
 * Admin override for the OTP verification requirement.
 *
 * `isVerified` can't be set at create time, so an admin-created student needs
 * this second call before they're eligible for attendance. Allowed for
 * SUPER_ADMIN, SCHOOL_ADMIN, DIRECTOR and PRINCIPAL.
 */
export async function setStudentVerified(id, isVerified = true) {
  const { data } = await api.patch(`/users/${id}/is-verified`, { isVerified });
  return data;
}

export async function fetchStudentsForParent(params = {}) {
  const { schoolId } = params;
  const { data } = await api.get("/users", { params: { schoolId: Number(schoolId) } });
  return data;
}
