import { useState, useRef, useEffect, useCallback } from "react";
import { Search, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2, Plus, PlusCircle, MinusCircle, X, Loader2 } from "lucide-react";
import {
  fetchClasses, createClass, deleteClass, updateClass,
  fetchSchools, fetchBoardGrades, fetchTeachers, fetchBoards, 
} from "../api/authService";

function useOutsideClick(ref, cb) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) cb();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cb, ref]);
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const DROPDOWN_LIMIT = 10;

// Auto-fetch all pages helper
async function fetchAllPages(fetcher, query = "") {
  let page = 1;
  let all = [];
  while (true) {
    const list = await fetcher(query, page);
    all = [...all, ...list];
    if (list.length < DROPDOWN_LIMIT) break;
    page++;
  }
  return all;
}

// Tooltip Button
function TooltipButton({ onClick, tooltip, children, className = "" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className={`transition-colors ${className}`}
      >
        {children}
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-50 pointer-events-none">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}

// Searchable Select Dropdown 
function SearchableSelect({
  value,
  onChange,
  onSearch,
  options = [],
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  loading = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  useOutsideClick(ref, () => { setOpen(false); setQuery(""); });

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (open) onSearch?.(debouncedQuery);
  }, [debouncedQuery, open]);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    onSearch?.("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (opt) => {
    onChange(opt);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleOpen}
        className={`flex items-center justify-between w-full border rounded-lg px-4 py-2.5 text-sm transition-colors
          ${disabled || loading
            ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 cursor-pointer"}
          ${open ? "border-[#23616E] ring-1 ring-[#23616E]/20" : ""}`}
      >
        <span className={value?.label ? "text-gray-800" : "text-gray-400"}>
          {loading ? "Loading..." : value?.label || placeholder}
        </span>
        {loading
          ? <Loader2 size={14} className="animate-spin text-gray-400" />
          : <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        }
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#23616E]" />
              </div>
            ) : options.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No results found</p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors
                    ${value?.value === opt.value ? "text-[#23616E] font-medium" : "text-gray-700"}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// School Search Hook 
function useSchoolSearch() {
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const searchSchools = useCallback((query = "") => {
    setLoadingSchools(true);
    fetchAllPages(
      (q, page) =>
        fetchSchools({ page, limit: DROPDOWN_LIMIT, schoolName: q }).then((res) => {
          const raw = res?.data?.schools || res?.data?.data || res?.data || res || [];
          return Array.isArray(raw) ? raw : [];
        }),
      query
    )
      .then((list) => {
        setSchools(list.map((s) => ({
          value: s.id,
          label: s.schoolName || s.name,
          boardId: s.boardId || s.board?.id || null,
          board: s.board?.name || s.boardName || "",
        })));
      })
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  return { schools, loadingSchools, searchSchools };
}

// Board Grade Search Hook 
function useBoardGradeSearch(boardId) {
  const [boardGrades, setBoardGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const searchGrades = useCallback((query = "") => {
    if (!boardId) { setBoardGrades([]); return; }
    setLoadingGrades(true);
    fetchAllPages(
      (q, page) =>
        fetchBoardGrades({ page, limit: DROPDOWN_LIMIT, boardId, name: q }).then((res) => {
          const list = res?.data?.boardGrades || res?.data?.data || res?.data || [];
          return Array.isArray(list) ? list : [];
        }),
      query
    )
      .then((list) => {
        setBoardGrades(list.map((g) => ({ value: g.id, label: g.name || g.grade || String(g.id) })));
      })
      .catch(() => setBoardGrades([]))
      .finally(() => setLoadingGrades(false));
  }, [boardId]);

  return { boardGrades, loadingGrades, searchGrades };
}

// Teacher Search Hook 
function useTeacherSearch(schoolId) {
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const searchTeachers = useCallback((query = "") => {
    if (!schoolId) { setTeachers([]); return; }
    setLoadingTeachers(true);
    fetchAllPages(
      (q, page) =>
        fetchTeachers({ page, limit: DROPDOWN_LIMIT, schoolId, name: q }).then((res) => {
          const list = res?.data?.users || res?.data?.data || res?.data || [];
          return Array.isArray(list) ? list : [];
        }),
      query
    )
      .then((list) => {
        setTeachers(list.map((t) => ({
          value: t.id,
          label: t.name || `${t.firstName || ""} ${t.lastName || ""}`.trim(),
        })));
      })
      .catch(() => setTeachers([]))
      .finally(() => setLoadingTeachers(false));
  }, [schoolId]);

  return { teachers, loadingTeachers, searchTeachers };
}

// School Filter Hook 
function useFilterSchoolSearch() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback((query = "") => {
    setLoading(true);
    fetchAllPages(
      (q, page) =>
        fetchSchools({ page, limit: DROPDOWN_LIMIT, schoolName: q }).then((res) => {
          const raw = res?.data?.schools || res?.data?.data || res?.data || [];
          return Array.isArray(raw) ? raw : [];
        }),
      query
    )
      .then((list) => {
        setSchools(list.map((s) => ({ value: s.id, label: s.schoolName || s.name })));
      })
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, []);

  return { schools, loading, search };
}

// Add Class Modal
function AddClassModal({ onClose, onSuccess }) {
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [classRows, setClassRows] = useState([{ id: Date.now(), name: "", division: "" }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { schools, loadingSchools, searchSchools } = useSchoolSearch();
  const { boardGrades, loadingGrades, searchGrades } = useBoardGradeSearch(selectedSchool?.boardId);
  const { teachers, loadingTeachers, searchTeachers } = useTeacherSearch(selectedSchool?.value);

  const handleSchoolChange = (opt) => {
    setSelectedSchool(opt);
    setSelectedGrade(null);
    setSelectedTeacher(null);
  };

  const addRow = () => setClassRows((p) => [...p, { id: Date.now(), name: "", division: "" }]);
  const removeRow = (id) => { if (classRows.length > 1) setClassRows((p) => p.filter((r) => r.id !== id)); };
  const updateRow = (id, field, val) => setClassRows((p) => p.map((r) => r.id === id ? { ...r, [field]: val } : r));

  const handleSubmit = async () => {
    setError("");
    if (!selectedSchool) return setError("Please select a school.");
    if (!selectedGrade) return setError("Please select a board grade.");
    const validRows = classRows.filter((r) => r.name.trim());
    if (!validRows.length) return setError("Please enter at least one class name.");

    setSubmitting(true);
    try {
      await createClass({
        schoolId: selectedSchool.value,
        boardId: selectedSchool.boardId,
        boardGradeId: selectedGrade.value,
        teacherId: selectedTeacher?.value || null,
        grades: validRows.map((row) => ({
          aliasName: row.name,
          divisionName: row.division,
        })),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add class. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Add Class</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">School</label>
            <SearchableSelect value={selectedSchool} onChange={handleSchoolChange} onSearch={searchSchools} options={schools} placeholder="Select School" searchPlaceholder="Search school..." loading={loadingSchools} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board</label>
            <input type="text" readOnly value={selectedSchool?.board || ""} placeholder="Select a school first" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board Grade</label>
            <SearchableSelect value={selectedGrade} onChange={setSelectedGrade} onSearch={searchGrades} options={boardGrades} placeholder={selectedSchool ? "Select Board Grade" : "Select a school first"} searchPlaceholder="Search grade..." disabled={!selectedSchool} loading={loadingGrades} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teacher</label>
            <SearchableSelect value={selectedTeacher} onChange={setSelectedTeacher} onSearch={searchTeachers} options={teachers} placeholder={selectedSchool ? "Select Teacher" : "Select a school first"} searchPlaceholder="Search teacher..." disabled={!selectedSchool} loading={loadingTeachers} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Classes</label>
            <div className="space-y-3">
              {classRows.map((row, idx) => (
                <div key={row.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    {idx === 0 && <p className="text-xs text-gray-500 mb-1">Name</p>}
                    <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} placeholder="e.g. 5-A" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors" />
                  </div>
                  <div className="flex-1">
                    {idx === 0 && <p className="text-xs text-gray-500 mb-1">Division</p>}
                    <input type="text" value={row.division} onChange={(e) => updateRow(row.id, "division", e.target.value)} placeholder="e.g. A" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors" />
                  </div>
                  <div className={`flex items-center gap-1 ${idx === 0 ? "mt-4" : ""}`}>
                    <TooltipButton onClick={addRow} tooltip="Add another class" className="text-gray-400 hover:text-[#23616E]">
                      <PlusCircle size={22} />
                    </TooltipButton>
                    <TooltipButton onClick={() => removeRow(row.id)} tooltip="Remove class" className={classRows.length === 1 ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-red-500"}>
                      <MinusCircle size={22} />
                    </TooltipButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#23616E] hover:bg-[#1d5260] text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Class Modal
function EditClassModal({ classData, boardsMap = {}, onClose, onSuccess }) {
  const [className, setClassName] = useState(classData?.aliasName || classData?.name || "");
  const [division, setDivision] = useState(
    classData?.division ||
    (classData?.aliasName?.includes("-") ? classData.aliasName.split("-").pop() : "") ||
    ""
  );

  const [selectedSchool, setSelectedSchool] = useState(
    classData?.school
      ? {
          value: classData.school.id,
          label: classData.school.schoolName || classData.school.name,
          boardId: classData.boardId || classData.school.boardId || null,
          board:
            classData.board?.name ||
            boardsMap[classData.boardId] ||
            boardsMap[classData.school.boardId] ||
            classData.boardName ||
            classData.school.board?.name ||
            "",
        }
      : null
  );

  const [selectedGrade, setSelectedGrade] = useState(
    classData?.boardGradeId
      ? { value: classData.boardGradeId, label: classData.boardGrade?.name || String(classData.boardGradeId) }
      : null
  );

  const [selectedTeacher, setSelectedTeacher] = useState(
    classData?.teacher
      ? {
          value: classData.teacher.id,
          label: classData.teacher.name || `${classData.teacher.firstName || ""} ${classData.teacher.lastName || ""}`.trim(),
        }
      : null
  );

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { schools, loadingSchools, searchSchools } = useSchoolSearch();
  const { boardGrades, loadingGrades, searchGrades } = useBoardGradeSearch(selectedSchool?.boardId);
  const { teachers, loadingTeachers, searchTeachers } = useTeacherSearch(selectedSchool?.value);

  const handleSchoolChange = (opt) => {
    setSelectedSchool(opt);
    setSelectedGrade(null);
    setSelectedTeacher(null);
  };

  const handleSubmit = async () => {
    setError("");
    if (!className.trim()) return setError("Please enter a class name.");
    if (!selectedSchool) return setError("Please select a school.");
    if (!selectedGrade) return setError("Please select a board grade.");

    setSubmitting(true);
    try {
      await updateClass(classData.id, {
        aliasName: className.trim(),
        divisionName: division.trim(),
        schoolId: selectedSchool.value,
        boardId: selectedSchool.boardId,
        boardGradeId: selectedGrade.value,
        teacherId: selectedTeacher?.value || null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update class. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Edit Class</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Name</label>
            <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. 12-B" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">School</label>
            <SearchableSelect value={selectedSchool} onChange={handleSchoolChange} onSearch={searchSchools} options={schools} placeholder="Select School" searchPlaceholder="Search school..." loading={loadingSchools} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board</label>
            <input type="text" readOnly value={selectedSchool?.board || ""} placeholder="Auto-filled from school" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board Grade</label>
            <SearchableSelect value={selectedGrade} onChange={setSelectedGrade} onSearch={searchGrades} options={boardGrades} placeholder={selectedSchool ? "Select Board Grade" : "Select a school first"} searchPlaceholder="Search grade..." disabled={!selectedSchool} loading={loadingGrades} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teacher</label>
            <SearchableSelect value={selectedTeacher} onChange={setSelectedTeacher} onSearch={searchTeachers} options={teachers} placeholder={selectedSchool ? "Select Teacher" : "Select a school first"} searchPlaceholder="Search teacher..." disabled={!selectedSchool} loading={loadingTeachers} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Division</label>
            <input type="text" value={division} onChange={(e) => setDivision(e.target.value)} placeholder="e.g. B" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#23616E] hover:bg-[#1d5260] text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Action Menu
function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-36 py-1 text-sm">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Pencil size={13} className="text-[#23616E]" />
            Edit
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-red-50 text-red-500 transition-colors"
          >
            <Trash2 size={13} />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// School Filter Dropdown 
function SchoolFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const { schools, loading, search } = useFilterSchoolSearch();
  useOutsideClick(ref, () => { setOpen(false); setQuery(""); });

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (open) search(debouncedQuery);
  }, [debouncedQuery, open]);

  const allOption = { value: "", label: "All Schools" };
  const options = [allOption, ...schools];
  const selectedLabel = value
    ? (schools.find((s) => s.value === value)?.label || "School selected")
    : "All Schools";

  const handleOpen = () => {
    setOpen((v) => !v);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white hover:border-gray-400 transition-colors min-w-[140px] justify-between"
      >
        <span>{loading && schools.length === 0 ? "Loading..." : selectedLabel}</span>
        {loading && schools.length === 0
          ? <Loader2 size={13} className="animate-spin text-gray-400" />
          : <ChevronDown size={14} className="text-gray-500" />
        }
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-64 text-sm">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search school..."
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#23616E]" />
              </div>
            ) : options.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No schools found</p>
            ) : (
              options.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { onChange(s.value); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${value === s.value ? "text-[#23616E] font-medium" : "text-gray-700"}`}
                >
                  {s.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Rows Per Page Dropdown
function RowsPerPageSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));
  const options = [10, 20, 50];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white hover:border-gray-400 transition-colors"
      >
        {value}
        <ChevronDown size={13} className="text-gray-500" />
      </button>
      {open && (
        <div className="absolute left-0 bottom-9 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-20 py-1 text-sm">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${value === o ? "text-[#23616E] font-medium" : "text-gray-700"}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Page
export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [filterSchoolId, setFilterSchoolId] = useState("");
  const [boardsMap, setBoardsMap] = useState({});
  const [studentCounts, setStudentCounts] = useState({});

  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  useEffect(() => {
    fetchBoards({ page: 1, limit: 50 })
      .then((boardRes) => {
        const boards = boardRes?.data?.educationBoards || boardRes?.data?.data || boardRes?.data || boardRes || [];
        const boardList = Array.isArray(boards) ? boards : [];
        const map = {};
        boardList.forEach((b) => { map[b.id] = b.name; });
        setBoardsMap(map);
      })
      .catch(() => {});
  }, []);

  const loadClasses = useCallback(() => {
    setLoading(true);
    const params = { page, limit: itemsPerPage };
    if (search) params.search = search;
    if (filterSchoolId) params.schoolId = filterSchoolId;

    fetchClasses(params)
      .then((res) => {
        const data = res?.data;
        const list = data?.grades || data?.classes || data || [];
        const count = res?.pagination?.totalCount || data?.total || data?.count || list.length;
        setClasses(list);
        setTotalCount(count);
      })
      .catch(() => { setClasses([]); setTotalCount(0); })
      .finally(() => setLoading(false));
  }, [page, itemsPerPage, search, filterSchoolId]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteClass(id);
      loadClasses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };
  const handleSchoolFilter = (id) => { setFilterSchoolId(id); setPage(1); };
  const handleItemsPerPageChange = (val) => { setItemsPerPage(val); setPage(1); };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(page * itemsPerPage, totalCount);

  return (
    <div className="flex-1 flex flex-col min-h-screen">

      {showAddModal && (
        <AddClassModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setPage(1); loadClasses(); }}
        />
      )}

      {editClass && (
        <EditClassModal
          classData={editClass}
          boardsMap={boardsMap}
          onClose={() => setEditClass(null)}
          onSuccess={() => { loadClasses(); }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-2">Remove Class</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to remove this class? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                {deleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-6 pt-3 pb-5">
        <h1 className="text-4xl font-bold text-gray-900">Classes</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#23616E] hover:bg-[#1d5260] text-white text-base font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Plus size={18} />
          Add Class
        </button>
      </div>

      <div className="mx-6 mb-4 bg-white rounded-2xl border border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 w-96 bg-[#F5F6FA]">
          <Search size={15} className="text-gray-900 shrink-0" />
          <input
            type="text"
            placeholder="Search by teacher or class name..."
            value={search}
            onChange={handleSearchChange}
            className="bg-transparent text-sm text-gray-600 placeholder-gray-800 outline-none w-full"
          />
        </div>
        <SchoolFilter value={filterSchoolId} onChange={handleSchoolFilter} />
      </div>

      <div className="mx-6 mb-6 bg-white rounded-2xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Classes</h2>
        </div>

        <div className="overflow-x-auto px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#EEF5F7]">
                <th className="text-left px-6 py-4 text-[15px] font-medium text-gray-800 rounded-l-2xl">Class</th>
                <th className="text-left px-6 py-4 text-[15px] font-medium text-gray-800">Division</th>
                <th className="text-left px-6 py-4 text-[15px] font-medium text-gray-800">School</th>
                <th className="text-left px-6 py-4 text-[15px] font-medium text-gray-800">Board</th>
                <th className="text-left px-6 py-4 text-[15px] font-medium text-gray-800">Students</th>
                <th className="text-left px-6 py-4 text-[15px] font-medium text-gray-800">Teacher</th>
                <th className="px-6 py-4 rounded-r-2xl" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <Loader2 size={22} className="animate-spin text-[#23616E] mx-auto" />
                  </td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 text-sm">
                    No classes found.
                  </td>
                </tr>
              ) : (
                classes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {c.aliasName || c.name || c.className || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      {c.division || (c.aliasName?.includes("-") ? c.aliasName.split("-").pop() : "-")}
                    </td>
                    <td className="px-6 py-4 text-gray-800">{c.school?.schoolName || c.school?.name || c.schoolName || "-"}</td>
                    <td className="px-6 py-4 text-gray-800">{boardsMap[c.boardId] || c.board?.name || c.boardName || "-"}</td>
                    <td className="px-6 py-4 text-gray-800">
                      {c.noOfStudents ??
                         c._count?.students ??
                         c.studentCount ??
                         studentCounts[c.id] ??
                      0}
                   </td>
                    <td className="px-6 py-4 text-gray-800">
                      {c.teacher
                        ? (c.teacher.name || `${c.teacher.firstName || ""} ${c.teacher.lastName || ""}`.trim() || "-")
                        : (c.teacherName || "-")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionMenu
                        onEdit={() => setEditClass(c)}
                        onDelete={() => setDeleteId(c.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows per page</span>
              <RowsPerPageSelect value={itemsPerPage} onChange={handleItemsPerPageChange} />
              <span className="ml-2 text-gray-500">
                {rangeStart}-{rangeEnd} of {totalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={15} />
              </button>
              <span className="text-sm text-gray-500 ml-1">
                Page {page} of {totalPages}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}