import api from "../axiosInstance";

// ─── Academic years ──────────────────────────────────────────────────────────
export async function fetchAcademicYears(params = {}) {
    const { data } = await api.get("/academic-years", { params });
    return data;
}

export async function fetchAcademicYearById(id) {
    const { data } = await api.get(`/academic-years/${id}`);
    return data;
}

export async function createAcademicYear(payload) {
    const { data } = await api.post("/academic-years", payload);
    return data;
}

export async function updateAcademicYear(id, payload) {
    const { data } = await api.patch(`/academic-years/${id}`, payload);
    return data;
}

export async function deleteAcademicYear(id) {
    const { data } = await api.delete(`/academic-years/${id}`);
    return data;
}

// Deactivates every other academic year for the same school and activates
// this one — the backend enforces "at most one active year per school" via
// this dedicated endpoint rather than a plain isActive toggle.
export async function activateAcademicYear(id) {
    const { data } = await api.patch(`/academic-years/${id}/activate`);
    return data;
}
