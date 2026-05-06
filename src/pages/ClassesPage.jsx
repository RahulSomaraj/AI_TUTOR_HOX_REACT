import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  Pencil, Trash2, Plus, PlusCircle, MinusCircle, X, Loader2,
} from "lucide-react";
import {
  fetchClasses, createClass, deleteClass, updateClass,
  fetchSchools, fetchBoardGrades, fetchTeachers, fetchBoards, fetchStudentsByGrade,
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

//  Tooltip Button ───────────────────────────────────────────────────────────

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

// ─── Searchable Select Dropdown ───────────────────────────────────────────────
// Used for School, Board Grade, Teacher — supports live search via API

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
      {/* Trigger */}
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

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search input */}
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

          {/* Options list */}
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

//  searchable school list ──────────────────────────────────────

function useSchoolSearch() {
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const searchSchools = useCallback((query = "") => {
    setLoadingSchools(true);
    fetchSchools({ page: 1, limit: 10, schoolName: query })
      .then((res) => {
        const raw =
          res?.data?.schools ||
          res?.data?.data ||
          res?.data ||
          res ||
          [];
        const list = Array.isArray(raw) ? raw : [];
        setSchools(
          list.map((s) => ({
            value:   s.id,
            label:   s.schoolName || s.name,
            boardId: s.boardId || s.board?.id || null,
            board:   s.board?.name || s.boardName || "",
          }))
        );
      })
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  return { schools, loadingSchools, searchSchools };
}

//  searchable board grades ─────────────────────────────────────

function useBoardGradeSearch(boardId) {
  const [boardGrades, setBoardGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const searchGrades = useCallback((query = "") => {
    if (!boardId) { setBoardGrades([]); return; }
    setLoadingGrades(true);
    fetchBoardGrades({ page: 1, limit: 10, boardId, name: query })
      .then((res) => {
        const list = res?.data?.boardGrades || res?.data?.data || res?.data || [];
        setBoardGrades(
          list.map((g) => ({ value: g.id, label: g.name || g.grade || String(g.id) }))
        );
      })
      .catch(() => setBoardGrades([]))
      .finally(() => setLoadingGrades(false));
  }, [boardId]);

  return { boardGrades, loadingGrades, searchGrades };
}

//  searchable teachers ────────────────────────────────────────

function useTeacherSearch(schoolId) {
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const searchTeachers = useCallback((query = "") => {
    if (!schoolId) { setTeachers([]); return; }
    setLoadingTeachers(true);
    fetchTeachers({ page: 1, limit: 10, schoolId, name: query })
      .then((res) => {
        const list = res?.data?.users || res?.data?.data || res?.data || [];
        setTeachers(
          list.map((t) => ({
            value: t.id,
            label: t.name || `${t.firstName || ""} ${t.lastName || ""}`.trim(),
          }))
        );
      })
      .catch(() => setTeachers([]))
      .finally(() => setLoadingTeachers(false));
  }, [schoolId]);

  return { teachers, loadingTeachers, searchTeachers };
}

// ─── Add Class Modal ──────────────────────────────────────────────────────────

function AddClassModal({ onClose, onSuccess }) {
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedGrade, setSelectedGrade]   = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [classRows, setClassRows] = useState([{ id: Date.now(), name: "", division: "" }]);
  const [error, setError]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { schools, loadingSchools, searchSchools } = useSchoolSearch();
  const { boardGrades, loadingGrades, searchGrades } = useBoardGradeSearch(selectedSchool?.boardId);
  const { teachers, loadingTeachers, searchTeachers } = useTeacherSearch(selectedSchool?.value);

  const handleSchoolChange = (opt) => {
    setSelectedSchool(opt);
    setSelectedGrade(null);
    setSelectedTeacher(null);
  };

  const addRow    = () => setClassRows((p) => [...p, { id: Date.now(), name: "", division: "" }]);
  const removeRow = (id) => { if (classRows.length > 1) setClassRows((p) => p.filter((r) => r.id !== id)); };
  const updateRow = (id, field, val) => setClassRows((p) => p.map((r) => r.id === id ? { ...r, [field]: val } : r));

  const handleSubmit = async () => {
    setError("");
    if (!selectedSchool) return setError("Please select a school.");
    if (!selectedGrade)  return setError("Please select a board grade.");
    const validRows = classRows.filter((r) => r.name.trim());
    if (!validRows.length) return setError("Please enter at least one class name.");

    setSubmitting(true);
    try {
      await createClass({
        schoolId:    selectedSchool.value,
        boardId:     selectedSchool.boardId,
        boardGradeId: selectedGrade.value,
        teacherId:   selectedTeacher?.value || null,
        grades: validRows.map((row) => ({
          aliasName:    row.name,
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

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Add Class</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* School */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">School</label>
            <SearchableSelect
              value={selectedSchool}
              onChange={handleSchoolChange}
              onSearch={searchSchools}
              options={schools}
              placeholder="Select School"
              searchPlaceholder="Search school..."
              loading={loadingSchools}
            />
          </div>

          {/* Board — auto filled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board</label>
            <input
              type="text"
              readOnly
              value={selectedSchool?.board || ""}
              placeholder="Select a school first"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed outline-none"
            />
          </div>

          {/* Board Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board Grade</label>
            <SearchableSelect
              value={selectedGrade}
              onChange={setSelectedGrade}
              onSearch={searchGrades}
              options={boardGrades}
              placeholder={selectedSchool ? "Select Board Grade" : "Select a school first"}
              searchPlaceholder="Search grade..."
              disabled={!selectedSchool}
              loading={loadingGrades}
            />
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teacher</label>
            <SearchableSelect
              value={selectedTeacher}
              onChange={setSelectedTeacher}
              onSearch={searchTeachers}
              options={teachers}
              placeholder={selectedSchool ? "Select Teacher" : "Select a school first"}
              searchPlaceholder="Search teacher..."
              disabled={!selectedSchool}
              loading={loadingTeachers}
            />
          </div>

          {/* Classes rows */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Classes</label>
            <div className="space-y-3">
              {classRows.map((row, idx) => (
                <div key={row.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    {idx === 0 && <p className="text-xs text-gray-500 mb-1">Name</p>}
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(row.id, "name", e.target.value)}
                      placeholder="e.g. 5-A"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    {idx === 0 && <p className="text-xs text-gray-500 mb-1">Division</p>}
                    <input
                      type="text"
                      value={row.division}
                      onChange={(e) => updateRow(row.id, "division", e.target.value)}
                      placeholder="e.g. A"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
                    />
                  </div>
                  <div className={`flex items-center gap-1 ${idx === 0 ? "mt-4" : ""}`}>
                    <TooltipButton onClick={addRow} tooltip="Add another class" className="text-gray-400 hover:text-[#23616E]">
                      <PlusCircle size={22} />
                    </TooltipButton>
                    <TooltipButton
                      onClick={() => removeRow(row.id)}
                      tooltip="Remove class"
                      className={classRows.length === 1 ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-red-500"}
                    >
                      <MinusCircle size={22} />
                    </TooltipButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#23616E] hover:bg-[#1d5260] text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Class Modal ─────────────────────────────────────────────────────────

function EditClassModal({ classData, boardsMap = {}, onClose, onSuccess }) {
  // Pre-fill state from the class row passed in
  const [className, setClassName]     = useState(classData?.aliasName || classData?.name || "");
  const [division, setDivision]       = useState(
    classData?.division ||
    (classData?.aliasName?.includes("-") ? classData.aliasName.split("-").pop() : "") ||
    ""
  );

  // School — pre-populated from classData
  const [selectedSchool, setSelectedSchool] = useState(
    classData?.school
      ? {
          value:   classData.school.id,
          label:   classData.school.schoolName || classData.school.name,
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

  // Board Grade — pre-populated
  const [selectedGrade, setSelectedGrade] = useState(
    classData?.boardGradeId
      ? { value: classData.boardGradeId, label: classData.boardGrade?.name || String(classData.boardGradeId) }
      : null
  );

  // Teacher — pre-populated
  const [selectedTeacher, setSelectedTeacher] = useState(
    classData?.teacher
      ? {
          value: classData.teacher.id,
          label: classData.teacher.name ||
            `${classData.teacher.firstName || ""} ${classData.teacher.lastName || ""}`.trim(),
        }
      : null
  );

  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { schools, loadingSchools, searchSchools }  = useSchoolSearch();
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
    if (!selectedSchool)   return setError("Please select a school.");
    if (!selectedGrade)    return setError("Please select a board grade.");

    setSubmitting(true);
    try {
      await updateClass(classData.id, {
        aliasName:    className.trim(),
        divisionName: division.trim(),
        schoolId:     selectedSchool.value,
        boardId:      selectedSchool.boardId,
        boardGradeId: selectedGrade.value,
        teacherId:    selectedTeacher?.value || null,
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

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Edit Class</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Class Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Name</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. 12-B"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
            />
          </div>

          {/* School */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">School</label>
            <SearchableSelect
              value={selectedSchool}
              onChange={handleSchoolChange}
              onSearch={searchSchools}
              options={schools}
              placeholder="Select School"
              searchPlaceholder="Search school..."
              loading={loadingSchools}
            />
          </div>

          {/* Board  */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board</label>
            <input
              type="text"
              readOnly
              value={selectedSchool?.board || ""}
              placeholder="Auto-filled from school"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed outline-none"
            />
          </div>

          {/* Board Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board Grade</label>
            <SearchableSelect
              value={selectedGrade}
              onChange={setSelectedGrade}
              onSearch={searchGrades}
              options={boardGrades}
              placeholder={selectedSchool ? "Select Board Grade" : "Select a school first"}
              searchPlaceholder="Search grade..."
              disabled={!selectedSchool}
              loading={loadingGrades}
            />
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teacher</label>
            <SearchableSelect
              value={selectedTeacher}
              onChange={setSelectedTeacher}
              onSearch={searchTeachers}
              options={teachers}
              placeholder={selectedSchool ? "Select Teacher" : "Select a school first"}
              searchPlaceholder="Search teacher..."
              disabled={!selectedSchool}
              loading={loadingTeachers}
            />
          </div>

          {/* Division */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Division</label>
            <input
              type="text"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              placeholder="e.g. B"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#23616E] hover:bg-[#1d5260] text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Action Menu ──────────────────────────────────────────────────────────────

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

// ─── School Filter Dropdown ───────────────────────────────────────────────────

function SchoolFilter({ value, onChange, schools = [], loading = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  const allOption = { value: "", label: "All Schools" };
  const options   = [allOption, ...schools];
  const selectedLabel = options.find((o) => o.value === value)?.label || "All Schools";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white hover:border-gray-400 transition-colors min-w-[140px] justify-between"
      >
        <span>{loading ? "Loading..." : selectedLabel}</span>
        {loading
          ? <Loader2 size={13} className="animate-spin text-gray-400" />
          : <ChevronDown size={14} className="text-gray-500" />
        }
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-56 py-1 text-sm max-h-60 overflow-y-auto">
          {options.map((s) => (
            <button
              key={s.value}
              onClick={() => { onChange(s.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                value === s.value ? "text-[#23616E] font-medium" : "text-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

export default function ClassesPage() {
  const [classes, setClasses]               = useState([]);
  const [totalCount, setTotalCount]         = useState(0);
  const [page, setPage]                     = useState(1);
  const [search, setSearch]                 = useState("");
  const [filterSchoolId, setFilterSchoolId] = useState("");
  const [filterSchools, setFilterSchools]   = useState([]);
  const [boardsMap, setBoardsMap]           = useState({});
  const [studentCounts, setStudentCounts]   = useState({});

  const [loading, setLoading]               = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [showAddModal, setShowAddModal]     = useState(false);
  const [editClass, setEditClass]           = useState(null);   
  const [deleteId, setDeleteId]             = useState(null);
  const [deleting, setDeleting]             = useState(false);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Fetch filter schools + boards map
  useEffect(() => {
    setLoadingSchools(true);
    Promise.all([
      fetchSchools({ page: 1, limit: 50 }),
      fetchBoards({ page: 1, limit: 50 }),
    ])
      .then(([schoolRes, boardRes]) => {
        // handle multiple possible response shapes
        const schools =
          schoolRes?.data?.schools ||
          schoolRes?.data?.data ||
          schoolRes?.data ||
          schoolRes ||
          [];
        const schoolList = Array.isArray(schools) ? schools : [];
        setFilterSchools(schoolList.map((s) => ({ value: s.id, label: s.schoolName || s.name })));

        const boards =
          boardRes?.data?.educationBoards ||
          boardRes?.data?.data ||
          boardRes?.data ||
          boardRes ||
          [];
        const boardList = Array.isArray(boards) ? boards : [];
        const map = {};
        boardList.forEach((b) => { map[b.id] = b.name; });
        setBoardsMap(map);
      })
      .catch(() => {})
      .finally(() => setLoadingSchools(false));
  }, []);

  // Load classes
  const loadClasses = useCallback(() => {
    setLoading(true);
    const params = { page, limit: ITEMS_PER_PAGE };
    if (search)         params.search   = search;
    if (filterSchoolId) params.schoolId = filterSchoolId;

    fetchClasses(params)
      .then((res) => {
        const data  = res?.data;
        const list  = data?.grades || data?.classes || data || [];
        const count = res?.pagination?.totalCount || data?.total || data?.count || list.length;
        setClasses(list);
        setTotalCount(count);

        // Fetch student counts per grade
        Promise.all(
          list.map((g) =>
            fetchStudentsByGrade(g.id, { page: 1, limit: 1 })
              .then((r) => {
                const total = r?.pagination?.totalCount ?? r?.data?.pagination?.totalCount ?? 0;
                return { id: g.id, count: total };
              })
              .catch(() => ({ id: g.id, count: 0 }))
          )
        ).then((results) => {
          const counts = {};
          results.forEach(({ id, count }) => { counts[id] = count; });
          setStudentCounts(counts);
        });
      })
      .catch(() => { setClasses([]); setTotalCount(0); })
      .finally(() => setLoading(false));
  }, [page, search, filterSchoolId]);

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
  const handleSchoolFilter = (id)  => { setFilterSchoolId(id); setPage(1); };

  return (
    <div className="flex-1 flex flex-col bg-[#f5f7fa] min-h-screen">

      {/* Add Class Modal */}
      {showAddModal && (
        <AddClassModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setPage(1); loadClasses(); }}
        />
      )}

      {/* Edit Class Modal */}
      {editClass && (
        <EditClassModal
          classData={editClass}
          boardsMap={boardsMap}
          onClose={() => setEditClass(null)}
          onSuccess={() => { loadClasses(); }}
        />
      )}

      {/* Delete Confirm Dialog */}
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

      {/* Top header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Classes</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#23616E] hover:bg-[#1d5260] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Add Class
        </button>
      </div>

      {/* Search + filter */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 w-80">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by teacher or class name..."
            value={search}
            onChange={handleSearchChange}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
          />
        </div>
        <SchoolFilter
          value={filterSchoolId}
          onChange={handleSchoolFilter}
          schools={filterSchools}
          loading={loadingSchools}
        />
      </div>

      {/* Table */}
      <div className="flex-1 px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="px-6 pt-5 pb-3">
            <h2 className="text-lg font-semibold text-gray-800">Classes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left px-6 py-3.5 font-medium text-gray-600">Class</th>
                  <th className="text-left px-6 py-3.5 font-medium text-gray-600">Division</th>
                  <th className="text-left px-6 py-3.5 font-medium text-gray-600">School</th>
                  <th className="text-left px-6 py-3.5 font-medium text-gray-600">Board</th>
                  <th className="text-left px-6 py-3.5 font-medium text-gray-600">Students</th>
                  <th className="text-left px-6 py-3.5 font-medium text-gray-600">Teacher</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Loader2 size={22} className="animate-spin text-[#23616E] mx-auto" />
                    </td>
                  </tr>
                ) : classes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                      No classes found.
                    </td>
                  </tr>
                ) : (
                  classes.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-gray-800 font-medium">
                        {c.aliasName || c.name || c.className || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {c.division || (c.aliasName?.includes("-") ? c.aliasName.split("-").pop() : "-")}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{c.school?.schoolName || c.school?.name || c.schoolName || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{boardsMap[c.boardId] || c.board?.name || c.boardName || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{studentCounts[c.id] ?? c._count?.students ?? c.studentCount ?? 0}</td>
                      <td className="px-6 py-4 text-gray-600">
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

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} classes
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                      p === page ? "bg-[#23616E] text-white" : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}