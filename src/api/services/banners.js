import api from "../axiosInstance";

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
