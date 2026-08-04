import { Lock } from "lucide-react";
import SchoolScopeSelect from "../Finance/SchoolScopeSelect";
import { useSchoolQuery } from "../../features/schools/useSchool";

/**
 * Read-only school display for pages reached from a school's detail hub.
 *
 * When you arrive from a school, the school is already decided — the URL
 * carries `?schoolId=` and the breadcrumb names it. Leaving the filter editable
 * there is a trap: change it and you're looking at a different institution than
 * the breadcrumb above you claims, with no indication anything moved.
 *
 * Uses the same `["school", id]` query key as the hub, so the name is already
 * in cache and renders without a second request.
 */
export function LockedSchoolField({ schoolId, className = "" }) {
  const schoolQuery = useSchoolQuery(schoolId);
  const name =
    schoolQuery.data?.schoolName ?? (schoolQuery.isPending ? "Loading..." : "Institution");

  return (
    <div
      title={`Scoped to ${name}. Go back to Institution Management to pick a different one.`}
      className={`flex h-[40px] items-center gap-2 rounded-[12px] border border-[#dce3e7] bg-[#f4f8f9] px-4 text-[14px] text-[#20242a] ${className}`}
    >
      <Lock size={13} className="shrink-0 text-[#8b939b]" />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
    </div>
  );
}

/**
 * Locked when scoped to a school, a normal picker otherwise — so these pages
 * still work if someone lands on them from a bookmark with no `schoolId`.
 */
export default function SchoolScopeField({
  schoolId,
  onChange,
  locked = false,
  includeAll = true,
  placeholder,
  className = "",
}) {
  if (locked) return <LockedSchoolField schoolId={schoolId} className={className} />;

  return (
    <SchoolScopeSelect
      value={schoolId}
      onChange={onChange}
      includeAll={includeAll}
      placeholder={placeholder}
    />
  );
}
