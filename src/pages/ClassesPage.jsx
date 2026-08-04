import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ChevronDown, PlusCircle, MinusCircle, X, Loader2 } from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import SearchInput from "../components/ui/SearchInput";
import SearchableSelect from "../components/ui/SearchableSelect";
import DataTable from "../components/ui/DataTable";
import ActionMenu from "../components/ui/ActionMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import useDebounce from "../hooks/useDebounce";
import useOutsideClick from "../hooks/useOutsideClick";
import { useSchoolQuery } from "../features/schools/useSchool";
import { LockedSchoolField } from "../components/Schools/SchoolScopeField";
import { fetchClasses, createClass, deleteClass, updateClass } from "../api/services/grades";
import { fetchSchools } from "../api/services/schools";
import { fetchTeachers } from "../api/services/teachers";
import {
  fetchBoardGrades, fetchBoards,
} from "../api/services/catalog";

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
function AddClassModal({ lockedSchoolId = "", onClose, onSuccess }) {
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [classRows, setClassRows] = useState([{ id: Date.now(), name: "", division: "" }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // A locked school still has to behave like a picked one: the board-grade and
  // teacher lookups key off `boardId`/`value`, and the Board field displays
  // `board`. Derived during render rather than pushed into state by an effect.
  const lockedSchoolQuery = useSchoolQuery(lockedSchoolId);
  const school = useMemo(() => {
    if (!lockedSchoolId) return selectedSchool;
    const record = lockedSchoolQuery.data;
    if (!record) return null;
    return {
      value: record.id,
      label: record.schoolName || record.name,
      boardId: record.boardId || record.board?.id || null,
      board: record.board?.name || record.boardName || "",
    };
  }, [lockedSchoolId, lockedSchoolQuery.data, selectedSchool]);

  const { schools, loadingSchools, searchSchools } = useSchoolSearch();
  const { boardGrades, loadingGrades, searchGrades } = useBoardGradeSearch(school?.boardId);
  const { teachers, loadingTeachers, searchTeachers } = useTeacherSearch(school?.value);

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
    if (!school) {
      return setError(
        lockedSchoolId ? "Still loading this institution — try again in a moment." : "Please select a school."
      );
    }
    if (!selectedGrade) return setError("Please select a board grade.");
    const validRows = classRows.filter((r) => r.name.trim());
    if (!validRows.length) return setError("Please enter at least one class name.");

    setSubmitting(true);
    try {
      await createClass({
        schoolId: school.value,
        boardId: school.boardId,
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
            {lockedSchoolId ? (
              <LockedSchoolField schoolId={lockedSchoolId} className="w-full" />
            ) : (
              <SearchableSelect value={selectedSchool} onChange={handleSchoolChange} onSearch={searchSchools} options={schools} placeholder="Select School" searchPlaceholder="Search school..." loading={loadingSchools} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board</label>
            <input type="text" readOnly value={school?.board || ""} placeholder="Select a school first" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board Grade</label>
            <SearchableSelect value={selectedGrade} onChange={setSelectedGrade} onSearch={searchGrades} options={boardGrades} placeholder={school ? "Select Board Grade" : "Select a school first"} searchPlaceholder="Search grade..." disabled={!school} loading={loadingGrades} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teacher</label>
            <SearchableSelect value={selectedTeacher} onChange={setSelectedTeacher} onSearch={searchTeachers} options={teachers} placeholder={school ? "Select Teacher" : "Select a school first"} searchPlaceholder="Search teacher..." disabled={!school} loading={loadingTeachers} />
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
function EditClassModal({ classData, boardsMap = {}, lockedSchoolId = "", onClose, onSuccess }) {
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
            {/* Already seeded from classData.school, so the lock only needs to
                remove the ability to move the class to another institution. */}
            {lockedSchoolId ? (
              <LockedSchoolField schoolId={lockedSchoolId} className="w-full" />
            ) : (
              <SearchableSelect value={selectedSchool} onChange={handleSchoolChange} onSearch={searchSchools} options={schools} placeholder="Select School" searchPlaceholder="Search school..." loading={loadingSchools} />
            )}
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

// Main Page
export default function ClassesPage() {
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [filterSchoolId, setFilterSchoolId] = useState(() => searchParams.get("schoolId") || "");
  // Fixed for the lifetime of this visit when we arrived from a school's hub.
  const [lockedSchool] = useState(() => Boolean(searchParams.get("schoolId")));
  const scopedSchoolQuery = useSchoolQuery(filterSchoolId);
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

  const handleSearchChange = (value) => { setSearch(value); setPage(1); };
  const handleSchoolFilter = (id) => { setFilterSchoolId(id); setPage(1); };
  const handleItemsPerPageChange = (val) => { setItemsPerPage(val); setPage(1); };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(page * itemsPerPage, totalCount);

  const columns = [
    {
      key: "class",
      header: "Class",
      render: (c) => c.aliasName || c.name || c.className || "-",
    },
    {
      key: "division",
      header: "Division",
      render: (c) =>
        c.division || (c.aliasName?.includes("-") ? c.aliasName.split("-").pop() : "-"),
    },
    {
      key: "school",
      header: "School",
      render: (c) => c.school?.schoolName || c.school?.name || c.schoolName || "-",
    },
    {
      key: "board",
      header: "Board",
      render: (c) => boardsMap[c.boardId] || c.board?.name || c.boardName || "-",
    },
    {
      key: "students",
      header: "Students",
      render: (c) =>
        c.noOfStudents ??
        c._count?.students ??
        c.studentCount ??
        studentCounts[c.id] ??
        0,
    },
    {
      key: "teacher",
      header: "Teacher",
      render: (c) =>
        c.teacher
          ? c.teacher.name ||
            `${c.teacher.firstName || ""} ${c.teacher.lastName || ""}`.trim() ||
            "-"
          : c.teacherName || "-",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <ActionMenu
          label="class"
          onEdit={() => setEditClass(c)}
          onDelete={() => setDeleteId(c.id)}
        />
      ),
    },
  ];

  return (
    <div className="ty-page-shell flex flex-col">
      <Breadcrumb
        items={
          filterSchoolId
            ? [
                { label: "Institution Management", path: "/schools" },
                { label: scopedSchoolQuery.data?.schoolName ?? "Institution", path: `/schools/${filterSchoolId}` },
                { label: "Classes" },
              ]
            : [{ label: "Classes" }]
        }
      />

      {showAddModal && (
        <AddClassModal
          lockedSchoolId={lockedSchool ? filterSchoolId : ""}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setPage(1); loadClasses(); }}
        />
      )}

      {editClass && (
        <EditClassModal
          classData={editClass}
          boardsMap={boardsMap}
          lockedSchoolId={lockedSchool ? filterSchoolId : ""}
          onClose={() => setEditClass(null)}
          onSuccess={() => { loadClasses(); }}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Remove Class"
          message="Are you sure you want to remove this class? This action cannot be undone."
          confirmLabel="Remove"
          cancelLabel="Cancel"
          busy={deleting}
          tone="danger"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => handleDelete(deleteId)}
        />
      )}

      <PageHeader
        title="Classes"
        actionLabel="Add Class"
        onAction={() => setShowAddModal(true)}
      />

      <div className="mb-4 bg-white rounded-2xl border border-gray-200 px-6 py-4 flex items-center justify-between">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by teacher or class name..."
          className="w-96"
        />
        {/* Scoped from the Institution hub → locked; standalone → filterable. */}
        {lockedSchool ? (
          <LockedSchoolField schoolId={filterSchoolId} className="w-[220px]" />
        ) : (
          <SchoolFilter value={filterSchoolId} onChange={handleSchoolFilter} />
        )}
      </div>

      <div className="mb-6 bg-white rounded-2xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4">
          <h2 className="ty-section-heading">Classes</h2>
        </div>

        <div className="px-5">
          <DataTable
            columns={columns}
            rows={classes}
            loading={loading}
            emptyLabel="No classes found."
            rowKey={(row) => row.id}
          />
        </div>

        {!loading && totalCount > 0 && (
          <PaginationControls
            className="border-t border-gray-100 px-6 py-4"
            rowsPerPage={itemsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
            onRowsPerPageChange={handleItemsPerPageChange}
            rangeLabel={`${rangeStart}-${rangeEnd} of ${totalCount}`}
            currentPage={page}
            totalPages={totalPages}
            hasPrev={page > 1}
            hasNext={page < totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </div>
    </div>
  );
}
