import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    deleteFeeStructure,
    fetchFeeStructures,
    createFeeStructure,
    updateFeeStructure,
    fetchAcademicYears
} from "../../api/services/finance";
import { extractList } from "../../api/normalize";

const FEE_STRUCTURES_ROOT = "feeStructures";
export const feeStructuresKey = (params) => [FEE_STRUCTURES_ROOT, params];

export function selectFeeStructures(all, { page, limit, search }) {
  const term = search?.trim().toLowerCase();
  const filtered = all.filter((item) => {
    if (!term) return true;
    return (
      item?.feeType?.name?.toLowerCase().includes(term) ||
      item?.feeType?.code?.toLowerCase().includes(term) ||
      item?.academicYear?.name?.toLowerCase().includes(term)
    );
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * limit;

  return {
    raw: filtered.slice(start, start + limit),
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      pageSize: limit,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
    },
  };
}

export function useFeeStructuresQuery(params) {
  return useQuery({
    queryKey: feeStructuresKey(params),
    queryFn: async () => {
      const response = await fetchFeeStructures();
      return selectFeeStructures(extractList(response, ["feeStructures"]), params);
    },
    placeholderData: (previous) => previous,
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