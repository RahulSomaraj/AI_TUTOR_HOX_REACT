import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, MoreHorizontal, ChevronDown, Pencil, Trash2, Loader2, X, Eye, EyeOff } from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import CountryCodePicker from "../components/CountryCodePicker";
import {
  fetchParents,
  createParent,
  updateParent,
  deleteParent,
  fetchSchools,
  fetchStudentsForParent,
} from "../api/authService";

function useOutsideClick(ref, cb) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) cb();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

//  Fetch all pages helper 
const DROPDOWN_LIMIT = 50;

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

//  School Search Hook 
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

//  Student Search Hook 
function useStudentSearch(schoolId) {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const searchStudents = useCallback((query = "") => {
    if (!schoolId) { setStudents([]); return; }
    setLoadingStudents(true);
    fetchAllPages(
      (q, page) =>
        fetchStudentsForParent({
          page,
          limit: DROPDOWN_LIMIT,
          schoolId,
          ...(q ? { name: q } : {}),
        }).then((res) => {
          const raw =
            res?.data?.data?.data ||
            res?.data?.data ||
            res?.data?.students ||
            res?.data ||
            [];
          const list = Array.isArray(raw) ? raw : [];
          return list
            .map((s) => ({
              id: s?.id ?? s?.studentId ?? s?._id,
              name: s?.name ?? s?.studentName ?? s?.fullName,
            }))
            .filter((s) => s.id && s.name);
        }),
      query
    )
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [schoolId]);

  
  useEffect(() => {
    if (schoolId) {
      searchStudents("");
    } else {
      setStudents([]);
    }
  }, [schoolId]); 

  return { students, loadingStudents, searchStudents };
}

//  Searchable Select
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

//  Action Menu
function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-36 py-1 text-sm">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            <Pencil size={13} className="text-[#23616E]" />
            Edit
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setOpen(false);
            }}
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

//  Student Multi-Select
function StudentMultiSelect({
  label,
  value,
  onChange,
  options = [],
  loading = false,
  disabled = false,
  placeholder = "Select Students",
  onSearch, 
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useOutsideClick(ref, () => { setOpen(false); setQuery(""); });

  const debouncedQuery = useDebounce(query, 400);

  
  useEffect(() => {
    if (open && onSearch) onSearch(debouncedQuery);
  }, [debouncedQuery, open]);

  
  const [knownStudents, setKnownStudents] = useState({});
  useEffect(() => {
    if (options.length > 0) {
      setKnownStudents((prev) => {
        const next = { ...prev };
        options.forEach((s) => { next[String(s.id)] = s; });
        return next;
      });
    }
  }, [options]);

  const selectedStudents = value
    .map((id) => knownStudents[String(id)])
    .filter(Boolean);
  const filteredOptions = options.filter((s) =>
    (s.name || "").toLowerCase().includes(query.toLowerCase())
  );

  const toggleStudent = (studentId) => {
    const id = String(studentId);
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const handleOpen = () => {
    if (disabled || loading) return;
    const next = !open;
    setOpen(next);
    setQuery("");
    if (next && onSearch) onSearch(""); // load initial results when opening
  };

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="w-full min-h-[42px] border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-left bg-white hover:border-gray-400 transition-colors flex items-center justify-between gap-3 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <span className="truncate text-gray-700">
          {loading
            ? "Loading students..."
            : selectedStudents.length > 0
            ? selectedStudents.map((s) => s.name).join(", ")
            : placeholder}
        </span>
        {loading ? (
          <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#23616E]/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#23616E]" />
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                No students found
              </div>
            ) : (
              filteredOptions.map((student) => {
                const checked = value.includes(String(student.id));
                return (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(student.id)}
                      className="accent-[#23616E]"
                    />
                    <span className="text-sm text-gray-700">{student.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedStudents.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedStudents.map((student) => (
            <span
              key={student.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#23616E]/10 text-[#23616E] px-3 py-1 text-xs font-medium"
            >
              {student.name}
              <button
                type="button"
                onClick={() => toggleStudent(student.id)}
                className="hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

//  Parent Modal 
function ParentModal({ initialData = null, onClose, onSuccess }) {
  const isEdit = initialData !== null;

  const { schools, loadingSchools, searchSchools } = useSchoolSearch();

  const [selectedSchool, setSelectedSchool] = useState(
    initialData?.schoolId
      ? { value: String(initialData.schoolId), label: initialData.schoolName || "" }
      : null
  );

  const { students, loadingStudents, searchStudents } = useStudentSearch(selectedSchool?.value);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    contactNumber: initialData?.contactNumber ?? "",
    countryCode: initialData?.countryCode ?? "+91",
    contactEmail: initialData?.contactEmail ?? "",
    password: "",
    confirmPassword: "",
    studentIds: Array.isArray(initialData?.studentIds)
      ? initialData.studentIds.map(String)
      : [],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSchoolChange = (opt) => {
    setSelectedSchool(opt);
    setForm((f) => ({ ...f, studentIds: [] }));
  };

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setError("");

    if (!form.name.trim()) return setError("Name is required.");
    if (!form.contactEmail.trim()) return setError("Email is required.");
    if (!form.contactNumber.trim()) return setError("Contact number is required.");
    if (!selectedSchool) return setError("School is required.");

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
        schoolId: selectedSchool ? Number(selectedSchool.value) : null,
        studentIds: form.studentIds.map(Number),
      };

      if (isEdit) {
        if (form.password) payload.password = form.password;
        await updateParent(initialData.id, payload);
      } else {
        payload.password = form.password;
        await createParent(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEdit ? "update" : "add"} parent.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 relative">
          <h2 className="text-lg font-bold text-gray-800 w-full text-center">
            {isEdit ? "Edit Parent" : "Add Parent"}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name
            </label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="Enter parent name"
              autoComplete="off"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#23616E] focus:ring-1 focus:ring-[#23616E]/20 transition-colors"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contact Number
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
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

          {/* Confirm Password */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              School
            </label>
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

          <StudentMultiSelect
            label="Students"
            value={form.studentIds}
            onChange={(ids) => setForm((f) => ({ ...f, studentIds: ids }))}
            options={students}
            loading={loadingStudents}
            onSearch={searchStudents}
            disabled={!selectedSchool}
            placeholder={selectedSchool ? "Select Students" : "Select school first"}
          />
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
            {submitting
              ? isEdit ? "Saving..." : "Adding..."
              : isEdit ? "Save Changes" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

//  Delete Dialog 
function DeleteDialog({ parentName, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-2">Remove Parent</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-gray-700">{parentName}</span>? This
          action cannot be undone.
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

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadParents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: itemsPerPage };
      if (debouncedSearch.trim()) params.name = debouncedSearch.trim();

      const res = await fetchParents(params);
      const list = Array.isArray(res?.data) ? res.data : [];
      const pagination = res?.pagination || {};

      setParents(list);
      setTotalCount(Number(pagination.totalCount || list.length || 0));
      setTotalPages(Number(pagination.totalPages || 1));
    } catch {
      setParents([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, debouncedSearch]);

  useEffect(() => {
    loadParents();
  }, [loadParents]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteParent(deleteTarget.id);
      setDeleteTarget(null);

      if (parents.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        loadParents();
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete parent.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="ty-page-shell">
      {showModal && (
        <ParentModal
          initialData={null}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setPage(1);
            loadParents();
          }}
        />
      )}

      {editData && (
        <ParentModal
          initialData={editData}
          onClose={() => setEditData(null)}
          onSuccess={() => {
            loadParents();
            setEditData(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          parentName={deleteTarget.name}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="ty-page-title">Parents</h1>
          <p className="mt-1 text-sm text-[#5b626a]">
            {debouncedSearch.trim()
              ? `${totalCount} result${totalCount !== 1 ? "s" : ""}`
              : `${totalCount} Parents`}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#23616E] hover:bg-[#1d5260] text-white text-base font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Plus size={18} />
          Add Parent
        </button>
      </div>

      {/* Search card */}
      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
        <label className="relative block w-full max-w-[370px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#20242a]"
            size={20}
            strokeWidth={2}
          />
          <input
            type="search"
            placeholder="Search parents by name..."
            value={search}
            onChange={handleSearchChange}
            className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] tracking-[0] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>
      </div>

      {/* Parents list card */}
      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Parents
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#e9f2f5]">
                <th className="rounded-l-2xl px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Name</th>
                <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Email</th>
                <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Contact</th>
                <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">School</th>
                <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Students</th>
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
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-sm text-[#5b626a]">
                    No parents found.
                  </td>
                </tr>
              ) : (
                parents.map((p) => (
                  <tr key={p.id} className="border-b border-[#eef0f2] last:border-b-0">
                    <td className="px-4 py-5 text-[15px] font-medium text-[#2a2d32] sm:px-5">{p.name || "-"}</td>
                    <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">{p.contactEmail || "-"}</td>
                    <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">
                      {p.contactNumber
                        ? p.contactNumber.startsWith("+")
                          ? p.contactNumber
                          : `${p.countryCode || "+91"}-${p.contactNumber}`
                        : "-"}
                    </td>
                    <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">
                      {p.school?.schoolName || p.school?.name || "-"}
                    </td>
                    <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">
                      {Array.isArray(p.students) && p.students.length > 0
                        ? p.students.map((s) => s.name).filter(Boolean).join(", ")
                        : "-"}
                    </td>
                    <td className="px-4 py-5 text-right sm:px-5">
                      <ActionMenu
                        onEdit={() =>
                          setEditData({
                            id: p.id,
                            name: p.name,
                            contactEmail: p.contactEmail,
                            contactNumber: p.contactNumber,
                            countryCode: p.countryCode,
                            schoolId: p.school?.id || p.schoolId || "",
                            schoolName: p.school?.schoolName || p.school?.name || "",
                            studentIds: Array.isArray(p.students)
                              ? p.students.map((s) => s.id)
                              : Array.isArray(p.studentIds)
                              ? p.studentIds
                              : [],
                          })
                        }
                        onDelete={() => setDeleteTarget({ id: p.id, name: p.name })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 0 && (
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
            )} of ${totalCount}`}
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