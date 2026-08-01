import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClassFee,
  fetchClassFeesByGrade,
} from "../../api/services/finance";
import { extractList, safeId } from "../../api/normalize";

const CLASS_FEES_ROOT = "classFees";

export function useClassFeesByGradeQuery(gradeId) {
  return useQuery({
    queryKey: [CLASS_FEES_ROOT, "grade", gradeId],
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
      queryClient.invalidateQueries({ queryKey: [CLASS_FEES_ROOT, "grade", gradeId] });
    },
  });
}
