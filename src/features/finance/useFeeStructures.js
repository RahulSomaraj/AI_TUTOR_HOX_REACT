import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    deleteFeeStructure,
    fetchFeeStructures,
    createFeeStructure,
    updateFeeStructure,
} from "../../api/services/finance";
import { fetchAcademicYears } from "../../api/services/academicYears";
import { extractList, extractPagination } from "../../api/normalize";
import { buildListParams } from "../../api/listParams";

const FEE_STRUCTURES_ROOT = "feeStructures";
export const feeStructuresKey = (params) => [FEE_STRUCTURES_ROOT, params];

/**
 * Server-side paging, search and filtering.
 *
 * `search` matches the fee type's name or code. Note it no longer matches the
 * academic year's name, as the old client-side filter did — the server-side
 * search covers the fee type only. Scoping by year is now the `academicYearId`
 * filter, which is exact rather than a substring guess.
 *
 * `schoolId` filters through `academicYear.schoolId`: a fee structure has no
 * school of its own, it inherits one from the year it belongs to.
 */
export function useFeeStructuresQuery(params) {
  return useQuery({
    queryKey: feeStructuresKey(params),
    queryFn: async () => {
      const response = await fetchFeeStructures(buildListParams(params));
      return {
        raw: extractList(response, ["feeStructures"]),
        pagination: extractPagination(response, 0, params?.limit),
      };
    },
    placeholderData: (previous) => previous,
  });
}

// Full fee-structure list (with nested feeType + academicYear) for pickers —
// e.g. the Student Fee Assignment page filters this to one school client-side.
export function useFeeStructureOptionsQuery() {
  return useQuery({
    queryKey: [FEE_STRUCTURES_ROOT, "options"],
    queryFn: async () => {
      const response = await fetchFeeStructures();
      return extractList(response, ["feeStructures"]).filter((item) => item?.isActive !== false);
    },
    staleTime: 60_000,
  });
}

export function useInvalidateFeeStructures() {
    const queryClient = useQueryClient();
    return () => 
        queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURES_ROOT] });
}

export function useDeleteFeeStructure() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => deleteFeeStructure(id),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURES_ROOT] })
    });
}

export function useSaveFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateFeeStructure(id, payload) : createFeeStructure(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURES_ROOT] })
  });
}

export function useToggleFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (row) => updateFeeStructure(row.id, { isActive: !row.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURES_ROOT] }),
  });
}

// Full academic-year list (with nested school) for the Fee Structure form's picker.
export function useAcademicYearOptionsQuery() {
  return useQuery({
    queryKey: ["academicYears", "options"],
    queryFn: async () => {
      const response = await fetchAcademicYears({ limit: 50 });
      return extractList(response, ["academicYears"]);
    },
    staleTime: 60_000,
  });
}