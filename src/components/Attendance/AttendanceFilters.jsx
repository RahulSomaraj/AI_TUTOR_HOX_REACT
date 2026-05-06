import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

// ── Reusable searchable dropdown ──────────────────────────────────────
const SearchableSelect = ({ value, onChange, options, placeholder, disabled, loading }) => {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState("");
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase())
  );

  const selectedLabel = options.find((o) => String(o.id) === String(value))?.name ?? "";

  const handleSelect = (id) => {
    onChange(String(id));
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative min-w-[170px]" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { if (!disabled && !loading) setOpen((v) => !v); }}
        className={`w-full flex items-center justify-between pl-3 pr-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors
          ${disabled || loading ? "opacity-50 cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-600 hover:bg-gray-50"}`}
      >
        <span className={selectedLabel ? "text-gray-700" : "text-gray-400"}>
          {loading ? "Loading..." : selectedLabel || placeholder}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ml-1 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg z-30">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {/* Clear option */}
            {value && (
              <li
                onClick={() => handleSelect("")}
                className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer italic"
              >
                Clear selection
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">No results</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.id}
                  onClick={() => handleSelect(o.id)}
                  className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors
                    ${String(o.id) === String(value) ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  {o.name}
                  {String(o.id) === String(value) && <Check size={13} className="text-teal-600" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Main filters component ────────────────────────────────────────────
const AttendanceFilters = ({
  searchQuery,
  onSearchChange,
  selectedBoard,
  onBoardChange,
  boards,
  selectedSchool,
  onSchoolChange,
  schools,
  selectedType,
  onTypeChange,
  attendanceTypes,
  loadingSchools,
  loadingGrades,
}) => {
  return (
    <div className="flex items-center gap-3 mb-5">

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search attendance by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Select school — searchable, always active */}
      <SearchableSelect
        value={selectedSchool}
        onChange={(val) => { onSchoolChange(val); onBoardChange(""); }}
        options={schools}
        placeholder="Select school"
        loading={loadingSchools}
      />

      <SearchableSelect
  value={selectedBoard}
  onChange={onBoardChange}
  options={boards}
  placeholder={
    selectedType === "teacher"
      ? "Not required for teacher"
      : selectedSchool
      ? "Select grade"
      : "Select school first"
  }
  disabled={!selectedSchool || selectedType === "teacher"}
  loading={loadingGrades}
/>

      {/* Select Attendance Type — regular select */}
      <div className="relative min-w-[180px]">
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">Select attendance type</option>
          {attendanceTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

    </div>
  );
};

export default AttendanceFilters;