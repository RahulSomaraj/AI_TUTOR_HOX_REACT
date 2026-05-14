import axios from "axios";
import api from "./axiosInstance";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function isEmail(value) {
  return typeof value === "string" && value.includes("@");
}

function getAdminDisplayName(user) {
  const firstLastName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const displayName =
    user.name ||
    user.fullName ||
    user.displayName ||
    firstLastName ||
    user.username;

  return displayName && !isEmail(displayName) ? displayName : "Admin User";
}

export async function loginAndGetToken(username, password) {
  try {
    const { data } = await api.post("/admin/login", { username, password });

    const rawToken = data?.data?.token;
    if (!rawToken) throw new Error("Token not found in login response");

    const cleanToken = rawToken.replace(/^Bearer\s+/i, "");
    const loggedInUser = data?.data?.user || data?.data?.admin || data?.user || {};
    const adminUser = {
      name: getAdminDisplayName(loggedInUser),
      role: loggedInUser.role || "Admin",
      avatar: loggedInUser.avatar || loggedInUser.profileImage || "",
    };

    const refreshToken = data?.data?.refreshToken;

    localStorage.setItem("accessToken", cleanToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("adminUser", JSON.stringify(adminUser));
    return cleanToken;
  } catch (err) {
    console.error("Login failed:", err);
    throw err;
  }
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token available. Please log in again.");

  // Uses raw axios (not the intercepted instance) to avoid an infinite retry loop
  const { data } = await axios.post(
    `${BASE_URL}/refresh-token`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } }
  );

  const raw = data?.data?.token;
  if (!raw) throw new Error("Refresh response did not contain a new token.");

  const newToken = raw.replace(/^Bearer\s+/i, "");
  localStorage.setItem("accessToken", newToken);
  return newToken;
}

export async function fetchGrades() {
  const { data } = await api.get("/grades");
  return data;
}

export async function fetchGradeById(id) {
  const { data } = await api.get(`/grades/${id}`);
  return data;
}

export async function fetchStudentsByGrade(id, params = {}) {
  const { data } = await api.get(`/users`, { params: { gradeId: id, ...params } });
  return data;
}

export async function fetchSchools(params = {}) {
  const { data } = await api.get("/school", { params });
  return data;
}

export async function createSchool(payload) {
  const { data } = await api.post("/school", payload);
  return data;
}

export async function updateSchool(id, payload) {
  const { data } = await api.patch(`/school/${id}`, payload);
  return data;
}

export async function deleteSchool(id) {
  const { data } = await api.delete(`/school/${id}`);
  return data;
}

export async function fetchAdminUsers(params = {}) {
  const { data } = await api.get("/admin/users", { params });
  return data;
}

export async function fetchSyllabusByGrade(boardGradeId) {
  console.log("Fetching syllabus with boardGradeId:", boardGradeId);
  const { data } = await api.get(`/syllabus`, { params: { boardGradeId } });
  return data;
}

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

export async function fetchTextbooks(params = {}) {
  const { data } = await api.get("/textbooks", { params });
  return data;
}

export async function fetchTextbookById(id) {
  const { data } = await api.get(`/textbooks/${id}`);
  return data;
}

export async function createTextbook(payload) {
  const { data } = await api.post("/textbooks", payload);
  return data;
}

export async function updateTextbook(id, payload) {
  const { data } = await api.put(`/textbooks/${id}`, payload);
  return data;
}

export async function deleteTextbook(id) {
  const { data } = await api.delete(`/textbooks/${id}`);
  return data;
}

export async function fetchChapters(params = {}) {
  const { data } = await api.get("/chapters", { params });
  return data;
}

export async function createChapter(payload) {
  const { data } = await api.post("/chapters", payload);
  return data;
}

export async function updateChapter(id, payload) {
  const { data } = await api.patch(`/chapters/${id}`, payload);
  return data;
}

export async function deleteChapter(id) {
  const { data } = await api.delete(`/chapters/${id}`);
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

export async function fetchTopics(params = {}) {
  const { data } = await api.get("/topics", { params });
  return data;
}

export async function createTopic(payload) {
  const { data } = await api.post("/topics", payload);
  return data;
}

export async function fetchSyllabi(params = {}) {
  const { data } = await api.get("/syllabus", { params });
  return data;
}

export async function fetchSyllabusById(id) {
  const { data } = await api.get(`/syllabus/${id}`);
  return data;
}

export async function createSyllabus(payload) {
  const { data } = await api.post("/syllabus", payload);
  return data;
}

export async function updateSyllabus(id, payload) {
  const { data } = await api.patch(`/syllabus/${id}`, payload);
  return data;
}

export async function deleteSyllabus(id) {
  const { data } = await api.delete(`/syllabus/${id}`);
  return data;
}

export async function updateSyllabusApproval(id, payload) {
  const { data } = await api.put(`/syllabus/${id}/approval`, payload);
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


export async function fetchAllStudents(params = {}) {
  const { data } = await api.get("/users", { params });
  return data;
}

export async function createStudent(payload) {
  const { data } = await api.post("/users", payload);
  console.log("Submitting student payload:", payload);
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

export async function fetchBoards(params = {}) {
  const { data } = await api.get("/education-board", { params });
  console.log(data);
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

export async function fetchStudentById(id) {
  const { data } = await api.get(`/users/${id}`);
  return data?.data ?? data;
}
// ─── Classes  ─────────────────────────────────────────────────────────

export async function fetchClasses(params = {}) {
  const { data } = await api.get("/grades", { params });
  return data;
}

export async function createClass(payload) {
  const { data } = await api.post("/grades", payload);
  return data;
}

export async function updateClass(id, payload) {
  const { data } = await api.patch(`/grades/${id}`, payload);
  return data;
}

export async function deleteClass(id) {
  const { data } = await api.delete(`/grades/${id}`);
  return data;
}

export async function fetchTeachers(params = {}) {
  const { data } = await api.get("/admin/users", {
    params: {userType: "TEACHER",...params,},
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

export async function sendNotification(payload) {
  const { data } = await api.post("/notifications/send", payload);
  return data;
}

export async function fetchNotifications(params = {}) {
  const { data } = await api.get("/notifications", { params });
  return data;
}


// ─── parent ─────────────────────────────────────────────────────────
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

export async function fetchStudentsForParent(params = {}) {
  const { schoolId } = params;
  const { data } = await api.get("/users", {
    params: {schoolId: Number(schoolId),},
  });
  return data;
}

// ─── Banners ──────────────────────────────────────────────────────────────────
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
 
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/upload/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return (
    data?.data?.url      ||
    data?.data?.fileUrl  ||
    data?.data?.location ||
    data?.data?.path     ||
    data?.url            ||
    data?.fileUrl        ||
    data?.location       ||
    data?.path           ||
    ""
  );
}
// ─── Attendance───────────────────────────────────────────────── 
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
