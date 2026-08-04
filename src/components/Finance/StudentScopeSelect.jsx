import { useCallback, useMemo, useState } from "react";
import SearchableSelect from "../ui/SearchableSelect";
import { fetchAllStudents } from "../../api/services/students";
import { extractList, safeId } from "../../api/normalize";
import logger from "../../lib/logger";

const DROPDOWN_LIMIT = 10;

function mapStudentOption(student) {
  const id = safeId(student?.id);
  const code = student?.studentCode;
  return {
    value: id,
    id,
    label: code ? `${student?.name ?? "Student"} · ${code}` : (student?.name ?? "Student"),
    student,
  };
}

/**
 * Student picker scoped to a school (and optionally a class).
 *
 * Searches server-side on every keystroke rather than filtering a preloaded
 * list — `/users` is paginated and a large school won't fit in one page, so a
 * client-side filter would quietly hide most students.
 */
export default function StudentScopeSelect({
  schoolId,
  gradeId,
  value,
  onChange,
  disabled = false,
  placeholder,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (query = "") => {
      if (!schoolId) {
        setStudents([]);
        return;
      }
      try {
        setLoading(true);
        const params = { page: 1, limit: DROPDOWN_LIMIT, schoolId: Number(schoolId) };
        if (gradeId) params.gradeId = Number(gradeId);
        if (query.trim()) params.name = query.trim();

        const response = await fetchAllStudents(params);
        setStudents(extractList(response, ["users", "students"]).map(mapStudentOption));
      } catch (err) {
        logger.error("Failed to load students:", err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    },
    [schoolId, gradeId]
  );

  const selected = useMemo(() => {
    if (!value) return null;
    return (
      students.find((option) => option.value === safeId(value.id)) ?? {
        value: safeId(value.id),
        label: value.studentCode ? `${value.name} · ${value.studentCode}` : value.name,
      }
    );
  }, [students, value]);

  return (
    <SearchableSelect
      value={selected}
      onChange={(option) => onChange(option?.student ?? null)}
      onSearch={search}
      options={students}
      placeholder={placeholder ?? (schoolId ? "Select student" : "Select a school first")}
      searchPlaceholder="Search by name..."
      disabled={disabled || !schoolId}
      loading={loading}
      emptyLabel="No students found"
    />
  );
}
