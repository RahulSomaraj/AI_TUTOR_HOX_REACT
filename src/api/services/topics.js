import api from "../axiosInstance";

// ─── Topics ──────────────────────────────────────────────────────────────────
export async function fetchTopics(params = {}) {
  const { data } = await api.get("/topics", { params });
  return data;
}

export async function fetchTopicById(id) {
  const { data } = await api.get(`/topics/${id}`);
  return data;
}

export async function createTopic(payload) {
  const { data } = await api.post("/topics", payload);
  return data;
}

export async function updateTopic(id, payload) {
  const { data } = await api.put(`/topics/${id}`, payload);
  return data;
}

export async function deleteTopic(id) {
  const { data } = await api.delete(`/topics/${id}`);
  return data;
}

export async function updateTopicConcept(id, concept) {
  const { data } = await api.patch(`/topics/details/${id}`, { concept });
  return data;
}

export async function fetchQuizByTopic(topicId) {
  const { data } = await api.get(`/quiz/topic/${topicId}`);
  return data;
}

export async function fetchPracticeByTopic(topicId) {
  const { data } = await api.get(`/practice/topic/${topicId}`);
  return data;
}

export async function fetchPracticeQuestionsByTopic(topicId) {
  const { data } = await api.get(`/practice/question/topic/${topicId}`);
  return data;
}
