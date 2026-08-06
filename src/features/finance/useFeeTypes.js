import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFeeType, fetchFeeTypes, updateFeeType } from "../../api/services/finance";
import { extractList, extractPagination } from "../../api/normalize";
import { buildListParams } from "../../api/listParams";

const FEE_TYPES_ROOT = "feeTypes";
export const feeTypesKey = (params) => [FEE_TYPES_ROOT, params];

// Server-side paging and search. `search` matches the fee type's name or code,
// case-insensitively — the same fields the old client-side filter used, so the
// behaviour a user sees is unchanged.
export function useFeeTypesQuery(params) {
  return useQuery({
    queryKey: feeTypesKey(params),
    queryFn: async () => {
      const response = await fetchFeeTypes(buildListParams(params));
      return {
        raw: extractList(response, ["feeTypes"]),
        pagination: extractPagination(response, 0, params?.limit),
      };
    },
    placeholderData: (previous) => previous
  });
}

// Full active fee-type list for pickers (e.g. the Fee Structure form) — not paginated.
export function useFeeTypeOptionsQuery() {
  return useQuery({
    queryKey: [FEE_TYPES_ROOT, "options"],
    queryFn: async () => {
      const response = await fetchFeeTypes();
      return extractList(response, ["feeTypes"]).filter((item) => item?.isActive !== false);
    },
    staleTime: 60_000,
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

export function useToggleFeeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (row) => updateFeeType(row.id, { isActive: !row.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FEE_TYPES_ROOT] }),
  });
}