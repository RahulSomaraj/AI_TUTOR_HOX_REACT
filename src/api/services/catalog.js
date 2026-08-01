import api from "../axiosInstance";

// ─── Subjects ──────────────────────────────────────────────────────────────
export async function fetchSubjects(params = {}) {
  const { data } = await api.get("/subject", { params });
  return data;
} 

export async function fetchSubjectById(id) {
  const { data } = await api.get(`/subject/${id}`);
  return data;
}

export async function createSubject(payload) {
  const { data } = await api.post("/subject", payload);
  return data;
}

export async function updateSubject(id, payload) {
  const { data } = await api.put(`/subject/${id}`, payload);
  return data;
}

export async function deleteSubject(id) {
  const { data } = await api.delete(`/subject/${id}`);
  return data;
}

// ─── Education boards ───────────────────────────────────────────────────────
export async function fetchBoards(params = {}) {
  const { data } = await api.get("/education-board", { params });
  return data;
}

export async function fetchBoardById(id) {
  const { data } = await api.get(`/education-board/${id}`);
  return data;
}

export async function createBoard(payload) {
  const { data } = await api.post("/education-board", payload);
  return data;
}

export async function updateBoard(id, payload) {
  const { data } = await api.patch(`/education-board/${id}`, payload);
  return data;
}

export async function deleteBoard(id) {
  const { data } = await api.delete(`/education-board/${id}`);
  return data;
}

// ─── Board grades ───────────────────────────────────────────────────────────
export async function fetchBoardGrades(params = {}) {
  const { data } = await api.get("/board-grades", { params });
  return data;
}

export async function createBoardGrade(payload) {
  const { data } = await api.post("/board-grades", payload);
  return data;
}

export async function deleteBoardGrade(id) {
  const { data } = await api.delete(`/board-grades/${id}`);
  return data;
}

export async function updateBoardGrade(id, payload) {
  const { data } = await api.patch(`/board-grades/${id}`, payload);
  return data;
}

// ─── File upload (shared) ───────────────────────────────────────────────────
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/upload/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return (
    data?.data?.url ||
    data?.data?.fileUrl ||
    data?.data?.location ||
    data?.data?.path ||
    data?.url ||
    data?.fileUrl ||
    data?.location ||
    data?.path ||
    ""
  );
}
