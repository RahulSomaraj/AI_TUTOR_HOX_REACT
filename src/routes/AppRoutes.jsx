import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import Dashboard from "../pages/Dashboard";
import EducationBoardsPage from "../pages/EducationBoardsPage";
import ClassesPage from "../pages/ClassesPage";
import SchoolsPage from "../pages/SchoolsPage";
import TeachersPage from "../pages/TeachersPage";
import StudentsPage from "../pages/StudentsPage";
import SubjectsPage from "../pages/SubjectsPage";
import TextbooksPage from "../pages/TextbooksPage";
import ChaptersPage from "../pages/ChaptersPage";
import TopicsPage from "../pages/TopicsPage";
import TopicDetailPage from "../pages/TopicDetailPage";
import ParentsPage from "../pages/ParentsPage";
import LoginPage from "../pages/loginPage";
import NotificationsPage from "../pages/NotificationsPage";
import BannerPage from "../pages/BannerPage";

import BoardGradesPage from "../pages/BoardGradesPage";

import AttendancePage from "../pages/AttendancePage";

import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="education-boards" element={<EducationBoardsPage />} />
          <Route path="education-boards/:boardId/grades" element={<BoardGradesPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="schools" element={<SchoolsPage />} />
          <Route path="syllabus" element={<TextbooksPage />} />
          <Route path="syllabus/:textbookId/chapters" element={<ChaptersPage />} />
          <Route
            path="syllabus/:textbookId/chapters/:chapterId/topics"
            element={<TopicsPage />}
          />
          <Route
            path="syllabus/:textbookId/chapters/:chapterId/topics/:topicId"
            element={<TopicDetailPage />}
          />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="parents" element={<ParentsPage />} />
          <Route path="banner" element={<BannerPage />} />
          <Route path="attendance" element={<AttendancePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
