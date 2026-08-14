import { useQueries, useQuery } from "@tanstack/react-query";
import { fetchSchools } from "../../api/services/schools";
import { fetchAllStudents } from "../../api/services/students";
import { fetchTeachers } from "../../api/services/teachers";
import { fetchParents } from "../../api/services/parents";
import { fetchClasses } from "../../api/services/grades";
import { fetchDueStudents } from "../../api/services/reports";
import { extractPagination } from "../../api/normalize";
import { retryTransientOnly } from "../../lib/apiError";
import { toPaise } from "../../lib/money";
import { mapDueStudentRows } from "../finance/useReports";

const DASHBOARD_ROOT = "dashboard";

// Every list endpoint returns a `pagination` block carrying the full
// `totalCount`, so a count costs one row rather than the whole table.
// `limit: 1` is the cheapest honest way to ask "how many are there?".
const COUNT_PARAMS = { page: 1, limit: 1 };

export const COUNT_ENTITIES = [
  { key: "schools", label: "Institutions", to: "/schools", fetcher: fetchSchools },
  { key: "students", label: "Students", to: "/students", fetcher: fetchAllStudents },
  { key: "teachers", label: "Teachers", to: "/teachers", fetcher: fetchTeachers },
  { key: "parents", label: "Parents", to: "/parents", fetcher: fetchParents },
];

async function countOf(fetcher) {
  const response = await fetcher(COUNT_PARAMS);
  return extractPagination(response, 0, 1).totalCount;
}

/**
 * Headline counts for the admin dashboard.
 *
 * `useQueries` rather than a loop of `useQuery` — same fan-out, but a real hook
 * instead of a rules-of-hooks violation that happens to work while the list
 * length never changes.
 *
 * One query per entity, not one combined call: they fail independently, so a
 * permissions problem on parents shouldn't blank the student count too.
 */
export function useDashboardCounts() {
  const results = useQueries({
    queries: COUNT_ENTITIES.map((entity) => ({
      queryKey: [DASHBOARD_ROOT, "count", entity.key],
      queryFn: () => countOf(entity.fetcher),
      retry: retryTransientOnly,
      staleTime: 60_000,
    })),
  });

  return COUNT_ENTITIES.map((entity, index) => ({ ...entity, result: results[index] }));
}

/** Total classes across every school — shown as context beside the counts. */
export function useClassCountQuery() {
  return useQuery({
    queryKey: [DASHBOARD_ROOT, "count", "classes"],
    queryFn: () => countOf(fetchClasses),
    retry: retryTransientOnly,
    staleTime: 60_000,
  });
}

/**
 * Students who currently owe money, worst first.
 *
 * `summary` covers the whole filtered set while `data` is only this page, so the
 * headline figures stay right even though a handful of rows are shown. Status is
 * left at its default, which means everything still owing (due + overdue) —
 * settled students aren't news on a dashboard.
 */
export function useOutstandingSnapshot(limit = 6) {
  return useQuery({
    queryKey: [DASHBOARD_ROOT, "outstanding", limit],
    queryFn: async () => {
      const response = await fetchDueStudents({ page: 1, limit });
      const body = response?.data ?? response;
      return {
        rows: mapDueStudentRows(Array.isArray(body?.data) ? body.data : []),
        totalStudents: body?.summary?.totalStudents ?? 0,
        totalOutstanding: toPaise(body?.summary?.totalOutstanding),
      };
    },
    retry: retryTransientOnly,
    staleTime: 60_000,
  });
}
