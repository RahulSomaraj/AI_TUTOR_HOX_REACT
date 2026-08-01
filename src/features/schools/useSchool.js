import { useQuery } from "@tanstack/react-query";
import { fetchSchoolById } from "../../api/services/schools";

// Shared by the Institution Detail hub and every page reachable from its
// shortcut tiles (Teachers/Students/Parents/Attendance) — same queryKey, so
// navigating from the hub reuses its already-fetched data instead of
// re-fetching.
export function useSchoolQuery(schoolId) {
  return useQuery({
    queryKey: ["school", schoolId],
    queryFn: async () => {
      const response = await fetchSchoolById(schoolId);
      return response?.data ?? null;
    },
    enabled: Boolean(schoolId),
  });
}
