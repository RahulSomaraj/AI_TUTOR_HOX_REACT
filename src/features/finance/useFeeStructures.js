import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    deleteFeeStructure,
    fetchFeeStructures
} from "../../api/services/finance";
import { extractList } from "../../api/normalize";

const FEE_STRUCTURES_ROOT = "feeStructures";
export const feeStructuresKey = (params) => [FEE_STRUCTURES_ROOT, params];

export function selectFeeStructures(all, { page, limit, search, schoolId }) {
  const term = search?.trim().toLowerCase();
  const filtered = all.filter((item) => {
    const matchesTerm = term
      ? item?.name?.toLowerCase().includes(term)
      : true;
    const matchesSchool = schoolId
      ? String(item?.schoolId ?? item?.school?.id) === String(schoolId)
      : true;
    return matchesTerm && matchesSchool;
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
            queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURES_ROOT] });
    });
}