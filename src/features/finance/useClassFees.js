import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClassFee,
  deleteClassFee,
  fetchClassFeesByGrade,
  updateClassFee,
} from "../../api/services/finance";
import { extractList, safeId } from "../../api/normalize";
import { toPaise } from "../../lib/money";

const CLASS_FEES_ROOT = "classFees";

export function useClassFeesByGradeQuery(gradeId) {
  return useQuery({
    // safeId so a numeric and a string grade id can't produce two cache
    // entries that invalidation then misses.
    queryKey: [CLASS_FEES_ROOT, "grade", safeId(gradeId)],
    queryFn: async () => {
      const response = await fetchClassFeesByGrade(gradeId);
      return extractList(response, ["classFees"]);
    },
    enabled: Boolean(gradeId),
  });
}

function findClassFee(list, feeStructureId) {
  return list.find(
    (classFee) => safeId(classFee?.feeStructureId ?? classFee?.feeStructure?.id) === safeId(feeStructureId)
  );
}

// Fee structures attach to students indirectly via a ClassFee (structure ↔ grade)
// link. This finds that link for the given (feeStructureId, gradeId) pair,
// creating it on first use — callers don't need to know ClassFee exists.
export function useEnsureClassFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ feeStructureId, gradeId }) => {
      const existingResponse = await fetchClassFeesByGrade(gradeId);
      const existingList = extractList(existingResponse, ["classFees"]);
      const match = findClassFee(existingList, feeStructureId);
      if (match) return match;

      try {
        const created = await createClassFee({
          feeStructureId: Number(feeStructureId),
          gradeId: Number(gradeId),
        });
        return created?.data;
      } catch (err) {
        // Another admin may have created the same link concurrently (409).
        if (err?.response?.status === 409) {
          const retryResponse = await fetchClassFeesByGrade(gradeId);
          const retryMatch = findClassFee(extractList(retryResponse, ["classFees"]), feeStructureId);
          if (retryMatch) return retryMatch;
        }
        throw err;
      }
    },
    onSuccess: (_data, { gradeId }) => {
      queryClient.invalidateQueries({ queryKey: [CLASS_FEES_ROOT, "grade", safeId(gradeId)] });
    },
  });
}

// ─── Class-level assignment ────────────────────────────────────────────────

/**
 * Flatten a class-fee row for display.
 *
 * Note the nested `feeStructure` here carries `feeType` but **not**
 * `academicYear` — the /fee-structures endpoints include both, these don't. So
 * this screen can't show the academic year without a second fetch, and
 * deliberately doesn't claim to.
 */
export function mapClassFeeRow(classFee) {
  const structure = classFee?.feeStructure;
  return {
    id: safeId(classFee?.id),
    feeStructureId: safeId(classFee?.feeStructureId ?? structure?.id),
    name: structure?.feeType?.name ?? "Fee",
    code: structure?.feeType?.code ?? "",
    // Money crosses the wire as a decimal string ("1500.00"); keep it exact.
    amount: toPaise(structure?.amount),
    frequency: structure?.frequency ?? "",
    isActive: classFee?.isActive !== false,
  };
}

function useInvalidateGrade() {
  const queryClient = useQueryClient();
  return (gradeId) =>
    queryClient.invalidateQueries({ queryKey: [CLASS_FEES_ROOT, "grade", safeId(gradeId)] });
}

/** Assign a fee structure to a whole class. 409 means it's already assigned. */
export function useAssignClassFee() {
  const invalidate = useInvalidateGrade();
  return useMutation({
    mutationFn: ({ feeStructureId, gradeId }) =>
      createClassFee({ feeStructureId: Number(feeStructureId), gradeId: Number(gradeId) }),
    onSuccess: (_data, { gradeId }) => invalidate(gradeId),
  });
}

/** Enable/disable a mapping without removing it. Only `isActive` is ever sent —
 *  see the uniqueness caveat on updateClassFee. */
export function useToggleClassFee() {
  const invalidate = useInvalidateGrade();
  return useMutation({
    mutationFn: ({ id, isActive }) => updateClassFee(id, { isActive }),
    onSuccess: (_data, { gradeId }) => invalidate(gradeId),
  });
}

export function useRemoveClassFee() {
  const invalidate = useInvalidateGrade();
  return useMutation({
    mutationFn: ({ id }) => deleteClassFee(id),
    onSuccess: (_data, { gradeId }) => invalidate(gradeId),
  });
}
