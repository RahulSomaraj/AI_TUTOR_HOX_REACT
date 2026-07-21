import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFeeType, fetchFeeTypes } from "../../api/services/finance";
import { extractList } from "../../api/normalize";

const FEE_TYPES_ROOT = "feeTypes";
export const feeTypesKey = (params) => [FEE_TYPES_ROOT, params];

export function useFeeTypesQuery(params) {
  return useQuery({
    queryKey: feeTypesKey(params),
    queryFn: async () => {
      // GET /fee-types takes no query params — it returns the full list, so
      // search and pagination are applied client-side.
      const response = await fetchFeeTypes();
      const all = extractList(response, ["feeTypes"]);

      const term = params.search?.trim().toLowerCase();
      const filtered = term
        ? all.filter(
            (item) =>
              item?.name?.toLowerCase().includes(term) ||
              item?.code?.toLowerCase().includes(term)
          )
        : all;

      const totalCount = filtered.length;
      const totalPages = Math.max(Math.ceil(totalCount / params.limit), 1);
      const currentPage = Math.min(params.page, totalPages);
      const start = (currentPage - 1) * params.limit;

      return {
        raw: filtered.slice(start, start + params.limit),
        pagination: {
          currentPage,
          totalPages,
          totalCount,
          pageSize: params.limit,
          hasPrev: currentPage > 1,
          hasNext: currentPage < totalPages,
        },
      };
    },
    placeholderData: (previous) => previous,
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