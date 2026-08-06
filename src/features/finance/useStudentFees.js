import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkAssignStudentFee,
  createStudentFee,
  deleteStudentFee,
  fetchStudentFees,
} from "../../api/services/finance";
import { extractList, safeId } from "../../api/normalize";

const STUDENT_FEES_ROOT = "studentFees";

/**
 * The student-fee rows for one class-fee.
 *
 * `classFeeId` is now a server-side filter. This used to fetch every
 * student-fee row in the system and filter in the browser, which grew as
 * students × fees — tens of thousands of rows to render ten.
 *
 * Deliberately unpaginated: the caller cross-references this against a page of
 * students to mark who's already assigned, so it needs every row for the
 * class-fee, not the first ten. Bounded by class size, so that's cheap.
 */
export function useStudentFeesQuery(classFeeId) {
  return useQuery({
    queryKey: [STUDENT_FEES_ROOT, "byClassFee", safeId(classFeeId)],
    queryFn: async () => {
      const response = await fetchStudentFees({ classFeeId: Number(classFeeId) });
      return extractList(response, ["studentFees"]);
    },
    enabled: Boolean(classFeeId),
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
