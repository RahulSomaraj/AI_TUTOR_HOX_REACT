import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkAssignStudentFee,
  createStudentFee,
  deleteStudentFee,
  fetchStudentFees,
} from "../../api/services/finance";
import { extractList, safeId } from "../../api/normalize";

const STUDENT_FEES_ROOT = "studentFees";

// The backend has no "assigned students for this class-fee" endpoint — only a
// full, unpaginated /student-fees list (matches the rest of fee-management).
// Callers filter this client-side by classFeeId.
export function useStudentFeesQuery() {
  return useQuery({
    queryKey: [STUDENT_FEES_ROOT],
    queryFn: async () => {
      const response = await fetchStudentFees();
      return extractList(response, ["studentFees"]);
    },
  });
}

export function useAssignStudentFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, classFeeId }) => createStudentFee({ studentId, classFeeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [STUDENT_FEES_ROOT] }),
  });
}

export function useBulkAssignStudentFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classFeeId, gradeId }) => bulkAssignStudentFee({ classFeeId, gradeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [STUDENT_FEES_ROOT] }),
  });
}

export function useUnassignStudentFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteStudentFee(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [STUDENT_FEES_ROOT] }),
  });
}

// Pure mapper: join a page of students with the full student-fee list for one
// classFee, so the table knows which rows are already assigned.
export function mapAssignmentRows(students, studentFeesForClassFee) {
  const byStudentId = new Map(
    (studentFeesForClassFee ?? []).map((studentFee) => [safeId(studentFee?.studentId), studentFee])
  );

  return (students ?? []).map((student) => {
    const id = safeId(student?.id);
    const studentFee = byStudentId.get(id);
    return {
      id,
      name: student?.name ?? "Unnamed Student",
      studentCode: student?.studentCode ?? "-",
      contactEmail: student?.contactEmail ?? "",
      isAssigned: Boolean(studentFee),
      studentFeeId: studentFee ? safeId(studentFee.id) : null,
    };
  });
}
