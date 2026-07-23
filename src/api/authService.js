// Barrel module — preserves the historical `../api/authService` import path used
// across all pages while the implementation is progressively split into focused
// domain services under `./services/`. New code should import from the specific
// service module; existing imports here keep working unchanged.
// ─── Re-exported from split services ────────────────────────────────────────
export {
  loginAndGetToken,
  adminLogout,
  deleteAdminAccount,
  fetchMyProfile,
  refreshAccessToken,
} from "./services/auth";

export {
  fetchSubjects,
  fetchSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  fetchBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  fetchBoardGrades,
  createBoardGrade,
  deleteBoardGrade,
  updateBoardGrade,
  uploadFile,
} from "./services/catalog";

export * from "./services/finance";

