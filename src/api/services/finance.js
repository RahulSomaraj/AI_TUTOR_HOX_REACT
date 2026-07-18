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

