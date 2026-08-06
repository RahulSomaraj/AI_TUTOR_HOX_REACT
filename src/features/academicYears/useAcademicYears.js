import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateAcademicYear,
  createAcademicYear,
  deleteAcademicYear,
  fetchAcademicYears,
  updateAcademicYear,
} from "../../api/services/academicYears";
import { extractList, extractPagination } from "../../api/normalize";
import { buildListParams } from "../../api/listParams";

const ACADEMIC_YEARS_ROOT = "academicYears";
export const academicYearsKey = (params) => [ACADEMIC_YEARS_ROOT, params];

// Fully server-side now that /academic-years accepts `search`. This previously
// fetched one page of 50 and searched client-side, which silently capped a
// school at 50 years — showing 50 with no indication more existed.
export function useAcademicYearsQuery({ schoolId, page, limit, search }) {
  return useQuery({
    queryKey: academicYearsKey({ schoolId, page, limit, search }),
    queryFn: async () => {
      const response = await fetchAcademicYears(
        buildListParams({ schoolId, page, limit, search, order: "desc" })
      );
      return {
        raw: extractList(response, ["academicYears"]),
        pagination: extractPagination(response, 0, limit),
      };
    },
    enabled: Boolean(schoolId),
    placeholderData: (previous) => previous,
  });
}

export function useSaveAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateAcademicYear(id, payload) : createAcademicYear(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ACADEMIC_YEARS_ROOT] }),
  });
}

export function useDeleteAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteAcademicYear(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ACADEMIC_YEARS_ROOT] }),
  });
}

export function useActivateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => activateAcademicYear(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ACADEMIC_YEARS_ROOT] }),
  });
}
