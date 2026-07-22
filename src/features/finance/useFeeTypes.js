import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFeeType, fetchFeeTypes } from "../../api/services/finance";
import { extractList } from "../../api/normalize";

const FEE_TYPES_ROOT = "feeTypes";
export const feeTypesKey = (params) => [FEE_TYPES_ROOT, params];

export function selectFeeTypes(all, { page, limit, search }) {
  const term = search?.trim().toLowerCase();
  const filtered = term
    ? all.filter(
      (item) =>
        item?.name?.toLowerCase().includes(term) ||
      item?.code?.toLowerCase().includes(term)
    )
  : all;

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

export function useFeeTypesQuery(params) {
  return useQuery({
    queryKey: feeTypesKey(params),
    queryFn: async () => {
      const response = await fetchFeeTypes();
      return selectFeeTypes(extractList(response, ["feeTypes"]), params);
    },
    placeholderData: (previous) => previous
  });
}

export function useInvalidateFeeTypes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [FEE_TYPES_ROOT] });
}

export function useDeleteFeeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteFeeType(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FEE_TYPES_ROOT] }),
  });
}