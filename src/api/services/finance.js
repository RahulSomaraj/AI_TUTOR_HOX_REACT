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