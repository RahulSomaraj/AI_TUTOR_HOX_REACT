import { useCallback, useMemo, useState } from "react";
import SearchableSelect from "../ui/SearchableSelect";
import { fetchSchools } from "../../api/services/schools";
import { extractList, safeId } from "../../api/normalize";
import logger from "../../lib/logger";

const DROPDOWN_LIMIT = 10;
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

  const search = useCallback(async (query = "") => {
    try {
      setLoading(true);
      const response = await fetchSchools({
        page: 1,
        limit: DROPDOWN_LIMIT,
        order: "desc",
        name: query.trim() || undefined,
      });
      setSchools(extractList(response, ["schools"]).map(mapSchoolOption));
    } catch (err) {
      logger.error("Failed to load schools:", err);
      setSchools([]);
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
      searchPlaceholder="Search school..."
      disabled={disabled}
      loading={loading}
      emptyLabel="No schools found"
    />
  );
}