import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateAcademicYear,
  createAcademicYear,
  deleteAcademicYear,
  fetchAcademicYears,
  updateAcademicYear,
} from "../../api/services/academicYears";
import { extractList } from "../../api/normalize";

const ACADEMIC_YEARS_ROOT = "academicYears";
export const academicYearsKey = (params) => [ACADEMIC_YEARS_ROOT, params];

export function selectAcademicYears(all, { page, limit, search }) {
  const term = search?.trim().toLowerCase();
  const filtered = term
    ? all.filter((item) => item?.name?.toLowerCase().includes(term))
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

// GET /academic-years supports real server pagination, but a single school
// realistically has a handful of years — fetch one page (capped at the
// backend's max of 50) scoped by school, then search/paginate client-side,
// matching the hybrid pattern used elsewhere in this app.
export function useAcademicYearsQuery({ schoolId, page, limit, search }) {
  return useQuery({
    queryKey: academicYearsKey({ schoolId, page, limit, search }),
    queryFn: async () => {
      const response = await fetchAcademicYears({ schoolId, limit: 50, order: "desc" });
      return selectAcademicYears(extractList(response, ["academicYears"]), { page, limit, search });
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
