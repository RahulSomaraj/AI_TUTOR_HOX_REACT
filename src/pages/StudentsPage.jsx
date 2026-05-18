import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Plus, MoreHorizontal, ChevronDown,
  Pencil, Trash2,
  Loader2, X, Eye, EyeOff,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import CountryCodePicker from "../components/CountryCodePicker";
import {
  fetchAllStudents, createStudent, updateStudent,
  deleteStudent, fetchSchools, fetchClasses,
} from "../api/authService";


function useOutsideClick(ref, cb) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) cb();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const DROPDOWN_LIMIT = 50;

//  Fetch all pages helper 
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


function useSchoolSearch() {
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const searchSchools = useCallback((query = "") => {
    setLoadingSchools(true);
    fetchAllPages(
      (q, page) =>
        fetchSchools({ page, limit: DROPDOWN_LIMIT, schoolName: q }).then((res) => {
          const raw = res?.data?.schools || res?.data?.data || res?.data || [];
          return Array.isArray(raw) ? raw : [];
        }),
      query
    )
      .then((list) => {
        setSchools(list.map((s) => ({
          value: String(s.id),
          label: s.schoolName || s.name,
        })));
      })
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  return { schools, loadingSchools, searchSchools };
}

function useGradeSearch(schoolId) {
  const [allGrades, setAllGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  useEffect(() => {
    if (!schoolId) setAllGrades([]);
  }, [schoolId]);

  const fetchGrades = useCallback(() => {
    if (!schoolId) { setAllGrades([]); return; }
    setLoadingGrades(true);
    fetchAllPages(
      (_q, page) =>
        fetchClasses({ page, limit: DROPDOWN_LIMIT, schoolId }).then((res) => {
          const list =
            Array.isArray(res?.data) ? res.data :
            res?.data?.grades || [];
          return Array.isArray(list) ? list : [];
        }),
      ""
    )
      .then((list) => {
        setAllGrades(list.map((g) => ({
          value: String(g.id),
          label: g.aliasName || g.name || String(g.id),
        })));
      })
      .catch(() => setAllGrades([]))
      .finally(() => setLoadingGrades(false));
  }, [schoolId]);

  return { allGrades, loadingGrades, fetchGrades };
}

//  Searchable Select 
function SearchableSelect({
  value,
  onChange,
  onSearch,
  onOpen,
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
    if (open && onSearch) onSearch(debouncedQuery);
  }, [debouncedQuery, open]);

  const displayOptions = onSearch
    ? options
    : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    if (onSearch) onSearch("");
    if (onOpen) onOpen();
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
            ) : displayOptions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No results found</p>
            ) : (
              displayOptions.map((opt) => (
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

//  School Filter Dropdown 
function SchoolFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const { schools, loadingSchools, searchSchools } = useSchoolSearch();
  useOutsideClick(ref, () => { setOpen(false); setQuery(""); });

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (open) searchSchools(debouncedQuery);
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
    <div className="relative w-full lg:w-[200px]" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="h-[40px] w-full flex items-center justify-between rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-[14px] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
      >
        <span className={value ? "text-[#20242a]" : "text-[#5b626a]"}>
          {loadingSchools && schools.length === 0 ? "Loading..." : selectedLabel}
        </span>
        {loadingSchools && schools.length === 0
          ? <Loader2 size={13} className="animate-spin text-[#6b7280] flex-shrink-0" />
          : <ChevronDown size={16} className="text-[#5b626a] flex-shrink-0" strokeWidth={2} />
        }
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 bg-white border border-[#e7ecef] rounded-xl shadow-lg w-64 py-1 text-sm">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search school..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155966]/20"
              />
            </div>
          </div>

          <ul className="max-h-52 overflow-y-auto py-1">
            {loadingSchools ? (
              <li className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#23616E]" />
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">No results</li>
            ) : (
              options.map((o) => (
                <li
                  key={String(o.value)}
                  onClick={() => {
                    onChange(String(o.value));
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-[#f5fafc] transition-colors text-[14px] ${
                    String(value) === String(o.value)
                      ? "text-[#155966] font-medium"
                      : "text-[#20242a]"
                  }`}
                >
                  {o.label}
                  {String(value) === String(o.value) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#155966]" />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

//  Action Menu 
function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
      >
        <MoreHorizontal size={20} strokeWidth={2.2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#20242a] transition hover:bg-[#f5fafc]"
          >
            <Pencil size={14} className="text-[#155966]" />
            Edit
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#d14343] transition hover:bg-[#fff5f5]"
          >
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

//  Add / Edit Student Modal 
function StudentModal({ initialData = null, onClose, onSuccess }) {
  const isEdit = initialData !== null;

  const [selectedSchool, setSelectedSchool] = useState(
    initialData?.schoolId
      ? { value: String(initialData.schoolId), label: initialData.schoolName || "" }
      : null
  );
  const [selectedGrade, setSelectedGrade] = useState(
    initialData?.gradeId
      ? { value: String(initialData.gradeId), label: initialData.gradeName || "" }
      : null
  );

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    contactNumber: initialData?.contactNumber ?? "",
    countryCode: initialData?.countryCode ?? "+91",
    contactEmail: initialData?.contactEmail ?? "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { schools, loadingSchools, searchSchools } = useSchoolSearch();
  const { allGrades, loadingGrades, fetchGrades } = useGradeSearch(selectedSchool?.value);

  const handleSchoolChange = (opt) => {
    setSelectedSchool(opt);
    setSelectedGrade(null);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setError("");

    if (!form.name.trim()) return setError("Name is required.");
    if (!form.contactEmail.trim()) return setError("Email is required.");
    if (!isEdit && !form.password) return setError("Password is required.");
    if (!isEdit && form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (form.password && form.password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        contactEmail: form.contactEmail.trim(),
        contactNumber: form.contactNumber.trim(),
        countryCode: form.countryCode || "+91",
      };

      if (selectedSchool?.value) payload.schoolId = Number(selectedSchool.value);
      if (selectedGrade?.value) payload.gradeId = Number(selectedGrade.value);

      if (isEdit) {
        if (form.password) payload.password = form.password;
        await updateStudent(initialData.id, payload);
      } else {
        payload.password = form.password;
        payload.isTermsAccepted = true;
        await createStudent(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEdit ? "update" : "add"} student.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 w-full text-center">
            {isEdit ? "Edit Student" : "Add Student"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors absolute right-6"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="Enter student name"
              autoComplete="off"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
            <div className="flex rounded-[10px] border border-[#c7cbd1]">
              <div className="border-r border-[#d6dbe1]">
                <CountryCodePicker
                  value={form.countryCode}
                  onChange={(dial) => setForm((f) => ({ ...f, countryCode: dial }))}
                  disabled={submitting}
                />
              </div>
              <input
                type="text"
                value={form.contactNumber}
                onChange={set("contactNumber")}
                disabled={submitting}
                placeholder="Enter contact number"
                autoComplete="off"
                className="h-[48px] flex-1 px-4 text-[14px] text-[#20242a] outline-none placeholder:text-[#6b7280] disabled:bg-[#f8fafb]"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              value={form.contactEmail}
              onChange={set("contactEmail")}
              placeholder="Enter email address"
              autoComplete="new-email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password{isEdit ? " (leave blank to keep current)" : ""}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Enter password"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password — add only */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* School  */}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade</label>
            <SearchableSelect
              value={selectedGrade}
              onChange={setSelectedGrade}
              onOpen={fetchGrades}
              options={allGrades}
              placeholder={selectedSchool ? "Select Grade" : "Select a school first"}
              searchPlaceholder="Search grade..."
              disabled={!selectedSchool}
              loading={loadingGrades}
            />
          </div>
        </div>

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
            {submitting ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save Changes" : "Add")}
          </button>
        </div>
      </div>
    </div>
  );
}

//  Delete Confirm Modal
function DeleteDialog({ studentName, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-2">Remove Student</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-gray-700">{studentName}</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting && <Loader2 size={13} className="animate-spin" />}
            {deleting ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

//  Main Page
const ITEMS_PER_PAGE = 10;

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [search, setSearch] = useState("");
  const [filterSchoolId, setFilterSchoolId] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = useCallback(() => {
    setLoading(true);

    const params = { page, limit: itemsPerPage };
    if (filterSchoolId) params.schoolId = Number(filterSchoolId);
    if (debouncedSearch.trim()) params.name = debouncedSearch.trim(); 

    fetchAllStudents(params)
      .then((res) => {
        const list =
          Array.isArray(res?.data) ? res.data :
          res?.data?.users || [];
        const pagination = res?.pagination || {};
        setStudents(Array.isArray(list) ? list : []);
        setTotalCount(pagination?.totalCount || list.length || 0);
        setTotalPages(pagination?.totalPages || 1);
      })
      .catch(() => {
        setStudents([]);
        setTotalCount(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [page, itemsPerPage, filterSchoolId, debouncedSearch]); 

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      loadStudents();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete student.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); 
  };

  const handleSchoolFilter = (id) => {
    setFilterSchoolId(String(id));
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#eef6f9]">
      {/* Modals */}
      {showModal && (
        <StudentModal
          initialData={null}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setPage(1);
            loadStudents();
          }}
        />
      )}

      {editData && (
        <StudentModal
          initialData={editData}
          onClose={() => setEditData(null)}
          onSuccess={() => {
            loadStudents();
            setEditData(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          studentName={deleteTarget.name}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-3 pb-5">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-[#5b626a]">
            {debouncedSearch.trim()
              ? `${totalCount} result${totalCount !== 1 ? "s" : ""}`
              : filterSchoolId
              ? `${totalCount} Students in selected school`
              : `${totalCount} Students`}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#23616E] hover:bg-[#1d5260] text-white text-base font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Plus size={18} />
          Add Student
        </button>
      </div>

      {/* Search + Filter card */}
      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-[370px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#20242a]"
            size={20}
            strokeWidth={2}
          />
          <input
            type="search"
            placeholder="Search students by name..."
            value={search}
            onChange={handleSearchChange}
            className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] tracking-[0] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>

        <SchoolFilter
          value={filterSchoolId}
          onChange={handleSchoolFilter}
        />
      </div>

      {/* Students list card */}
      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Students
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr className="bg-[#e9f2f5]">
                <th className="rounded-l-2xl px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Name</th>
                <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Email</th>
                <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Contact</th>
                <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">School</th>
                <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Grade</th>
                <th className="rounded-r-2xl px-4 py-4 sm:px-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Loader2 size={22} className="animate-spin text-[#23616E] mx-auto" />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-sm text-[#5b626a]">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b border-[#eef0f2] last:border-b-0">
                    <td className="px-4 py-5 text-[15px] font-medium text-[#2a2d32] sm:px-5">{s.name || "-"}</td>
                    <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">{s.contactEmail || "-"}</td>
                    <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">
                      {s.contactNumber
                        ? `${s.countryCode || "+91"}-${s.contactNumber}`
                        : "-"}
                    </td>
                    <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">{s.school?.schoolName || "-"}</td>
                    <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">{s.grade?.aliasName || s.grade?.name || "-"}</td>
                    <td className="px-4 py-5 text-right sm:px-5">
                      <ActionMenu
                        onEdit={() =>
                          setEditData({
                            id: s.id,
                            name: s.name,
                            contactEmail: s.contactEmail,
                            contactNumber: s.contactNumber,
                            countryCode: s.countryCode,
                            schoolId: s.schoolId || s.school?.id,
                            schoolName: s.school?.schoolName || s.school?.name || "",
                            gradeId: s.gradeId || s.grade?.id,
                            gradeName: s.grade?.aliasName || s.grade?.name || "",
                          })
                        }
                        onDelete={() => setDeleteTarget({ id: s.id, name: s.name })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalCount > 0 && (
          <PaginationControls
            className="border-t border-gray-100 px-6 py-4"
            rowsPerPage={itemsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
            onRowsPerPageChange={(nextItemsPerPage) => {
              setItemsPerPage(nextItemsPerPage);
              setPage(1);
            }}
            rangeLabel={`${(page - 1) * itemsPerPage + 1}-${Math.min(
              page * itemsPerPage,
              totalCount
            )} of ${totalCount} students`}
            currentPage={page}
            totalPages={totalPages}
            hasPrev={page > 1}
            hasNext={page < totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </section>
    </div>
  );
}