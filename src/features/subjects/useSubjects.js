import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSubject, fetchSubjects } from "../../api/services/catalog";
import { extractList, extractPagination } from "../../api/normalize";

// Query-key factory — all subject caches hang off this root so a single
// invalidate refreshes every page/filter combination after a mutation.
const SUBJECTS_ROOT = "subjects";
export const subjectsKey = (params) => [SUBJECTS_ROOT, params];

/**
 * Server cache for the subjects list. Replaces the page's manual
 * useState + useEffect + loading/error/refetch bookkeeping.
 *
 * Returns the raw list and normalized pagination; row mapping stays in the
 * component because it depends on the separately-loaded boards/grades.
 */
export function useSubjectsQuery(params) {
  return useQuery({
    queryKey: subjectsKey(params),
    queryFn: async () => {
      const response = await fetchSubjects({
        page: params.page,
        limit: params.limit,
        order: "desc",
        name: params.search?.trim() || undefined,
        boardGradeId: params.boardGradeId || undefined,
        boardId: params.boardId || undefined,
      });
      const raw = extractList(response, ["subjects"]);
      return {
        raw,
        pagination: extractPagination(response, raw.length, params.limit),
      };
    },
    // Keep the previous page visible while the next one loads (v5 equivalent of
    // keepPreviousData) — avoids a flash of empty table on page/filter change.
    placeholderData: (previous) => previous,
  });
}

/** Invalidate every subjects cache (call after create/update). */
export function useInvalidateSubjects() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [SUBJECTS_ROOT] });
}

/** Delete mutation; auto-refreshes the list on success. */
export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteSubject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SUBJECTS_ROOT] }),
  });
}
