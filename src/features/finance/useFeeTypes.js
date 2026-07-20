// 1. Fixed: Removed duplicate useQueryClient import
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFeeType, fetchFeeTypes } from "../../api/services/finance";
import { extractList, extractPagination } from "../../api/normalize";

const FEE_TYPES_ROOT = "feeTypes";
export const feeTypesKey = (params) => [FEE_TYPES_ROOT, params];

export function useFeeTypesQuery(params) {
    return useQuery({
        queryKey: feeTypesKey(params),
        queryFn: async () => {
            const response = await fetchFeeTypes({
                page: params.page,
                limit: params.limit,
                order: "desc",
                name: params.search?.trim() || undefined
            });
            const raw = extractList(response, ["feeTypes"]);
            return {
                raw,
                pagination: extractPagination(response, raw.length, params.limit)
            };
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [FEE_TYPES_ROOT] });
        }
    });
}
