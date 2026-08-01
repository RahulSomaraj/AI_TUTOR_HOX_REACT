import api from '../axiosInstance';

export async function fetchFeeTypes(params = {}) {
    const { data } = await api.get('/fee-types', { params});
    return data;
}

export async function createFeeType(payload) {
    const { data } = await api.post('/fee-types', payload);
    return data;
}

export async  function updateFeeType(id, payload) {
    const { data } = await api.put(`/fee-types/${id}`, payload);
    return data;
}

export async function deleteFeeType(id) {
    const { data } = await api.delete(`/fee-types/${id}`);
    return data;
}

// ─── Fee structures ─────────────────────────────────────────────────────────
export async function fetchFeeStructures(params = {}) {
    const { data } = await api.get('/fee-structures', { params });
    return data;
}

export async function fetchFeeStructureById(id) {
    const { data } = await api.get(`/fee-structures/${id}`);
    return data;
};

export async function createFeeStructure(payload) {
    const { data } = await api.post('/fee-structures', payload);
    return data;
}

export async function updateFeeStructure(id, payload) {
    const { data } = await api.put(`/fee-structures/${id}`, payload);
    return data;
};

export async function deleteFeeStructure(id) {
    const { data } = await api.delete(`/fee-structures/${id}`);
    return data;
}

// ─── Class fees (fee structure ↔ grade) ─────────────────────────────────────
export async function fetchClassFees(params = {}) {
    const { data } = await api.get('/class-fees', { params });
    return data;
}

export async function fetchClassFeesByGrade(gradeId) {
    const { data } = await api.get(`/class-fees/grade/${gradeId}`);
    return data;
}

export async function createClassFee(payload) {
    const { data } = await api.post('/class-fees', payload);
    return data;
}

export async function deleteClassFee(id) {
    const { data } = await api.delete(`/class-fees/${id}`);
    return data;
}

// ─── Student fees (class fee ↔ student) ─────────────────────────────────────
export async function fetchStudentFees(params = {}) {
    const { data } = await api.get('/student-fees', { params });
    return data;
}

export async function fetchStudentFeesByStudent(studentId) {
    const { data } = await api.get(`/student-fees/student/${studentId}`);
    return data;
}

export async function createStudentFee(payload) {
    const { data } = await api.post('/student-fees', payload);
    return data;
}

export async function bulkAssignStudentFee(payload) {
    const { data } = await api.post('/student-fees/bulk-assign', payload);
    return data;
}

export async function deleteStudentFee(id) {
    const { data } = await api.delete(`/student-fees/${id}`);
    return data;
}