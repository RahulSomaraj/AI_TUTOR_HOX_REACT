import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import Dashboard from "../pages/Dashboard";
import EducationBoardsPage from "../pages/EducationBoardsPage";
import ClassesPage from "../pages/ClassesPage";
import SchoolsPage from "../pages/SchoolsPage";
import SchoolDetailPage from "../pages/SchoolDetailPage";
import AcademicYearsPage from "../pages/AcademicYearsPage";
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
import FeeManagementPage from "../pages/finance/FeeManagementPage";
import FeeTypesPage from "../pages/finance/FeeTypesPage";
import FeeStructurePage from "../pages/finance/FeeStructurePage";
import StudentFeeAssignmentPage from "../pages/finance/StudentFeeAssignmentPage";

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
          <Route path="academic-years" element={<AcademicYearsPage />} />
          <Route path="schools" element={<SchoolsPage />} />
          <Route path="schools/:schoolId" element={<SchoolDetailPage />} />
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
          <Route path="finance" element={<FeeManagementPage />} />
          <Route path="finance/fee-types" element={<FeeTypesPage />}/>
          <Route path="finance/fee-structures" element={<FeeStructurePage />} />
          <Route path="finance/student-fees" element={<StudentFeeAssignmentPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
