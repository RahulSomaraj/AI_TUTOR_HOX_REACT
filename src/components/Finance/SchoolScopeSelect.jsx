import { useCallback, useMemo, useState } from "react";
import SearchableSelect from "../ui/SearchableSelect";
import { fetchSchools } from "../../api/services/schools";
import { extractList, safeId } from "../../api/normalize";
import logger from "../../lib/logger";

// The server caps `limit` at 50. 25 fills the dropdown without turning it into
// a wall of names — this is a picker, not a browsing list. Anything past it is
// reached by typing, not scrolling.
const DROPDOWN_LIMIT = 25;
const ALL_SCHOOLS = { value: "", id: "", label: "All Schools" };

function mapSchoolOption(school) {
  const id = safeId(school?.id ?? school?._id);
  return {
    value: id,
    id,
    label: school?.name ?? school?.schoolName ?? "School",
  };
}

// Per-school filter shared by every finance screen. Pass `includeAll={false}`
// where a school must be chosen before the page can load data.
export default function SchoolScopeSelect({
  value,
  onChange,
  includeAll = true,
  disabled = false,
  placeholder,
}) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);

  // Server-side search on every settled keystroke — SearchableSelect debounces
  // the query (350ms) before calling this, so typing a long school name costs
  // one request rather than one per character. Never loads the full list: a
  // deployment with thousands of schools would otherwise pull all of them into
  // memory to render ten.
  const search = useCallback(async (query = "") => {
    try {
      setLoading(true);
      const response = await fetchSchools({
        page: 1,
        limit: DROPDOWN_LIMIT,
        // Alphabetical, not newest-first: when someone types "Silver" they
        // expect the matches in name order, not creation order.
        order: "asc",
        schoolName: query.trim() || undefined,
      });
      const list = extractList(response, ["schools"]);
      setSchools(list.map(mapSchoolOption));
      setTruncated(list.length >= DROPDOWN_LIMIT);
    } catch (err) {
      logger.error("Failed to load schools:", err);
      setSchools([]);
      setTruncated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const options = useMemo(
    () => (includeAll ? [ALL_SCHOOLS, ...schools] : schools),
    [includeAll, schools]
  );

  const selected = useMemo(() => {
    if (!value) return includeAll ? ALL_SCHOOLS : null;
    return (
      options.find((option) => option.value === value) ?? {
        value,
        id: value,
        label: "Selected School",
      }
    );
  }, [includeAll, options, value]);

  return (
    <SearchableSelect
      value={selected}
      onChange={(option) => onChange(option?.value || "")}
      onSearch={search}
      options={options}
      placeholder={placeholder ?? (includeAll ? "All Schools" : "Select School")}
      searchPlaceholder="Search school by name..."
      disabled={disabled}
      loading={loading}
      emptyLabel="No schools match that name"
      footnote={
        truncated
          ? `Showing the first ${DROPDOWN_LIMIT} matches — type more to narrow it down.`
          : ""
      }
    />
  );
}
