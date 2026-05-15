import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  AlertTriangle, ChevronDown, Loader2, MoreHorizontal, Pencil,
  Plus, Search, Trash2, X, Eye, EyeOff,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import CountryCodePicker from "../components/CountryCodePicker";
import {
  fetchAdminUsers, fetchSchools, createTeacher, updateTeacher, deleteTeacher,
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
          const raw = res?.data?.schools || res?.data?.data || res?.data || res || [];
          return Array.isArray(raw) ? raw : [];
        }),
      query
    )
      .then((list) =>
        setSchools(
          list.map((s) => ({
            value: String(s.id ?? s._id ?? ""),
            label: s.schoolName || s.name || "School",
          }))
        )
      )
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  return { schools, loadingSchools, searchSchools };
}

//  School Filter Hook 
function useFilterSchoolSearch() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback((query = "") => {
    setLoading(true);
    fetchAllPages(
      (q, page) =>
        fetchSchools({ page, limit: DROPDOWN_LIMIT, schoolName: q }).then((res) => {
          const raw = res?.data?.schools || res?.data?.data || res?.data || res || [];
          return Array.isArray(raw) ? raw : [];
        }),
      query
    )
      .then((list) =>
        setSchools(
          list.map((s) => ({
            value: String(s.id ?? s._id ?? ""),
            label: s.schoolName || s.name || "School",
          }))
        )
      )
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, []);

  return { schools, loading, search };
}

//  SearchableSelect 
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
        className={`h-[48px] w-full flex items-center justify-between rounded-[10px] border bg-white px-4 text-[14px] outline-none transition
          ${disabled || loading ? "bg-[#f8fafb] text-[#6b7280] cursor-not-allowed border-[#c7cbd1]" : "text-[#20242a] border-[#c7cbd1] cursor-pointer"}
          ${open ? "border-[#155966] ring-2 ring-[#155966]/15" : ""}`}
      >
        <span className={value?.label ? "text-[#20242a]" : "text-[#6b7280]"}>
          {loading ? "Loading..." : value?.label || placeholder}
        </span>
        {loading
          ? <Loader2 size={14} className="animate-spin text-[#6b7280] flex-shrink-0" />
          : <ChevronDown size={16} className={`text-[#5b626a] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        }
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e7ecef] rounded-xl shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155966]/20"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              </div>
            ) : options.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No results found</p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-[#f5fafc] transition-colors
                    ${value?.value === opt.value ? "text-[#155966] font-medium" : "text-[#20242a]"}`}
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
    <div className="relative w-full lg:w-[200px]" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="h-[40px] w-full flex items-center justify-between rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-[14px] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
      >
        <span className={value ? "text-[#20242a]" : "text-[#5b626a]"}>
          {loading && schools.length === 0 ? "Loading..." : selectedLabel}
        </span>
        {loading && schools.length === 0
          ? <Loader2 size={13} className="animate-spin text-[#6b7280] flex-shrink-0" />
          : <ChevronDown size={16} className="text-[#5b626a] flex-shrink-0" strokeWidth={2} />
        }
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e7ecef] rounded-xl shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search school..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155966]/20"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <li className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#155966]" />
              </li>
            ) : options.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No schools found</li>
            ) : (
              options.map((s) => (
                <li
                  key={s.value}
                  onClick={() => { onChange(s.value); setOpen(false); setQuery(""); }}
                  className={`px-4 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5fafc] transition-colors
                    ${value === s.value ? "text-[#155966] font-medium" : "text-[#20242a]"}`}
                >
                  {s.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function extractTeachers(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.admins)) return response.admins;
  if (Array.isArray(response?.data?.users)) return response.data.users;
  if (Array.isArray(response?.data?.admins)) return response.data.admins;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function extractPagination(response, fallbackCount, fallbackPageSize) {
  const pagination =
    response?.pagination ??
    response?.data?.pagination ??
    response?.meta ??
    response?.data?.meta ??
    null;

  if (pagination) {
    const currentPage = Number(
      pagination.currentPage ?? pagination.page ?? pagination.pageNumber ?? 1
    );
    const totalPages = Number(
      pagination.totalPages ??
        pagination.pageCount ??
        (pagination.totalCount && pagination.pageSize
          ? Math.ceil(pagination.totalCount / pagination.pageSize)
          : 1)
    );
    const totalCount = Number(
      pagination.totalCount ?? pagination.total ?? pagination.count ?? fallbackCount
    );
    const pageSize = Number(
      pagination.pageSize ?? pagination.limit ?? pagination.perPage ?? fallbackPageSize
    );

    return {
      currentPage,
      totalPages,
      totalCount,
      pageSize,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
    };
  }

  return {
    currentPage: 1,
    totalPages: 1,
    totalCount: fallbackCount,
    pageSize: fallbackPageSize,
    hasPrev: false,
    hasNext: false,
  };
}

function safeId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function getSchoolNameFromTeacher(teacher) {
  return (
    teacher?.school?.schoolName ??
    teacher?.school?.name ??
    teacher?.schoolName ??
    "Not available"
  );
}

function mapTeacherRow(teacher) {
  const fullName = [teacher?.firstName, teacher?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const contactNumber = teacher?.contactNumber ?? teacher?.phone ?? "";
  const countryCode = teacher?.countryCode ?? "+91";

  return {
    id: teacher?.id ?? teacher?._id ?? teacher?.email ?? `teacher-${Date.now()}`,
    name: teacher?.name ?? teacher?.fullName ?? (fullName || "Not available"),
    email: teacher?.contactEmail ?? teacher?.email ?? "Not available",
    contact:
      contactNumber?.startsWith("+")
        ? contactNumber
        : `${countryCode}-${contactNumber}`.trim() || "Not available",
    contactNumber,
    countryCode,
    school: getSchoolNameFromTeacher(teacher),
    schoolId: safeId(teacher?.school?.id ?? teacher?.schoolId),
  };
}

//  ActionMenu 
function ActionMenu({ teacherName, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${teacherName}`}
      >
        <MoreHorizontal size={20} strokeWidth={2.2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#20242a] transition hover:bg-[#f5fafc]"
          >
            <Pencil size={14} className="text-[#155966]" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onDelete(); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#d14343] transition hover:bg-[#fff5f5]"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

//  TeacherModal 
function TeacherModal({ initialData = null, onClose, onSubmit }) {
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    contactNumber: initialData?.contactNumber ?? "",
    countryCode: initialData?.countryCode ?? "+91",
    email: initialData?.email ?? "",
    schoolId: initialData?.schoolId ?? "",
    password: "",
    confirmPassword: "",
  });

  // API-based school selection
  const { schools, loadingSchools, searchSchools } = useSchoolSearch();
  const [selectedSchool, setSelectedSchool] = useState(
    initialData?.schoolId
      ? { value: String(initialData.schoolId), label: initialData.school ?? "" }
      : null
  );

  const handleSchoolChange = (opt) => {
    setSelectedSchool(opt);
    setForm((f) => ({ ...f, schoolId: opt ? String(opt.value) : "" }));
  };

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  const setValue = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  async function handleSubmit() {
    if (!form.name.trim()) return setError("Teacher name is required.");
    if (!form.contactNumber.trim()) return setError("Contact number is required.");
    if (!form.email.trim()) return setError("Email is required.");

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(form.email.trim())) return setError("Please enter a valid email address.");
    if (!form.schoolId) return setError("Please select a school.");

    if (!isEdit) {
      if (!form.password.trim()) return setError("Password is required.");
      if (form.password.length < 6) return setError("Password must be at least 6 characters.");
      if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    }

    setSaving(true);
    setError("");

    try {
      await onSubmit({
        id: initialData?.id,
        name: form.name.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        countryCode: form.countryCode.trim() || "+91",
        schoolId: form.schoolId,
        ...(!isEdit && { password: form.password }),
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-[520px] rounded-[22px] bg-white px-6 py-7 shadow-2xl sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="w-full text-center text-[22px] font-bold text-black">
            {isEdit ? "Edit Teacher" : "Add Teacher"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-[#5b626a] transition hover:bg-[#f3f6f8] disabled:opacity-50"
            aria-label="Close teacher modal"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#20242a]">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={setValue("name")}
              disabled={saving}
              placeholder="Teacher Name"
              className="h-[48px] w-full rounded-[10px] border border-[#23262b] px-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#6b7280] focus:border-[#155966] disabled:bg-[#f8fafb]"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#20242a]">Contact Number</label>
            <div className="flex rounded-[10px] border border-[#c7cbd1]">
              <div className="border-r border-[#d6dbe1]">
                <CountryCodePicker
                  value={form.countryCode}
                  onChange={(dial) => setForm((f) => ({ ...f, countryCode: dial }))}
                  disabled={saving}
                />
              </div>
              <input
                type="text"
                value={form.contactNumber}
                onChange={setValue("contactNumber")}
                disabled={saving}
                placeholder="9876543222"
                className="h-[48px] flex-1 px-4 text-[14px] text-[#20242a] outline-none placeholder:text-[#6b7280] disabled:bg-[#f8fafb]"
              />
            </div>
          </div>

          {/* School — API-based searchable dropdown */}
          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#20242a]">School</label>
            <SearchableSelect
              value={selectedSchool}
              onChange={handleSchoolChange}
              onSearch={searchSchools}
              options={schools}
              placeholder="Select School"
              searchPlaceholder="Search school..."
              disabled={saving}
              loading={loadingSchools}
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#20242a]">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={setValue("email")}
              disabled={saving}
              placeholder="teacher@school.com"
              className="h-[48px] w-full rounded-[10px] border border-[#c7cbd1] px-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#6b7280] focus:border-[#155966] disabled:bg-[#f8fafb]"
            />
          </div>

          {/* Password & Confirm Password (Add modal only) */}
          {!isEdit && (
            <>
              <div>
                <label className="mb-2 block text-[14px] font-medium text-[#20242a]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={setValue("password")}
                    disabled={saving}
                    placeholder="Min. 6 characters"
                    className="h-[48px] w-full rounded-[10px] border border-[#c7cbd1] px-4 pr-11 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#6b7280] focus:border-[#155966] disabled:bg-[#f8fafb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={saving}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#20242a] transition-colors disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-medium text-[#20242a]">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={setValue("confirmPassword")}
                    disabled={saving}
                    placeholder="Re-enter password"
                    className="h-[48px] w-full rounded-[10px] border border-[#c7cbd1] px-4 pr-11 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#6b7280] focus:border-[#155966] disabled:bg-[#f8fafb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    disabled={saving}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#20242a] transition-colors disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-[46px] flex-1 rounded-[12px] border border-[#1e7286] px-6 text-[16px] font-medium text-[#1e7286] transition hover:bg-[#f1f8fa] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#2b6f7a] px-6 text-[16px] font-semibold text-white transition hover:bg-[#235f69] disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

//  DeleteTeacherModal
function DeleteTeacherModal({ teacherName, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[22px] bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-[#20242a]">Delete Teacher</h2>
        <p className="mt-2 text-sm text-[#5b626a]">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[#20242a]">{teacherName}</span>?
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-xl border border-[#d7dde2] py-2.5 text-sm font-medium text-[#5b626a] transition hover:bg-[#f7fafb] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TeachersPage  
export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 10,
    hasPrev: false,
    hasNext: false,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [activeTeacher, setActiveTeacher] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      order: "desc",
      userType: "TEACHER",
      name: search.trim() || undefined,
      schoolId: schoolId || undefined,
    }),
    [limit, page, schoolId, search, refreshKey]
  );

  // Load teachers
  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      async function loadTeachers() {
        try {
          setLoading(true);
          setError("");

          const response = await fetchAdminUsers(queryParams);
          const mappedTeachers = extractTeachers(response).map(mapTeacherRow);
          const extractedPagination = extractPagination(response, mappedTeachers.length, limit);

          if (!cancelled) {
            setTeachers(mappedTeachers);
            setPagination(extractedPagination);
          }
        } catch (err) {
          const message =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load teachers";

          if (!cancelled) {
            setError(message);
            setTeachers([]);
            setPagination({
              currentPage: 1,
              totalPages: 1,
              totalCount: 0,
              pageSize: limit,
              hasPrev: false,
              hasNext: false,
            });
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      loadTeachers();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [queryParams, limit]);

  function openAddModal() {
    setActiveTeacher(null);
    setModalMode("add");
  }

  function openEditModal(teacher) {
    setActiveTeacher(teacher);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setActiveTeacher(null);
  }

  async function handleCreateTeacher(payload) {
    await createTeacher({
      name: payload.name,
      contactEmail: payload.email,
      contactNumber: payload.contactNumber,
      countryCode: payload.countryCode,
      schoolId: Number(payload.schoolId),
      userType: "TEACHER",
      password: payload.password,
    });
    setPage(1);
    setRefreshKey((k) => k + 1);
  }

  async function handleUpdateTeacher(payload) {
    await updateTeacher(payload.id, {
      name: payload.name,
      contactEmail: payload.email,
      contactNumber: payload.contactNumber,
      countryCode: payload.countryCode,
      schoolId: Number(payload.schoolId),
    });
    setRefreshKey((k) => k + 1);
  }

  async function handleDeleteTeacher() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTeacher(deleteTarget.id);
      setDeleteTarget(null);
      if (teachers.length === 1 && page > 1) {
        setPage((p) => p - 1);
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete teacher.");
    } finally {
      setDeleting(false);
    }
  }

  const totalTeachers = pagination?.totalCount ?? teachers.length;
  const startRow = totalTeachers === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, totalTeachers);

  return (
    <div className="min-h-screen bg-[#eef6f9]">
      <div className="flex items-center justify-between px-6 pt-3 pb-5">
        <h1 className="text-4xl font-bold text-gray-900">Teachers</h1>
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#23616E] hover:bg-[#1d5260] text-white text-base font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Plus size={18} />Add Teacher
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-[370px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#20242a]"
            size={20}
            strokeWidth={2}
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search teachers by name..."
            className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] tracking-[0] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          />
        </label>

        {/* API-based school filter dropdown */}
        <SchoolFilter
          value={schoolId}
          onChange={(id) => {
            setSchoolId(id);
            setPage(1);
          }}
        />
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Teachers
        </h2>

        {loading && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            Loading teachers...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && teachers.length === 0 && (
          <div className="py-16 text-center text-sm text-[#5b626a]">
            No teachers found.
          </div>
        )}

        {!loading && !error && teachers.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="bg-[#e9f2f5]">
                    <th className="rounded-l-2xl px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Name</th>
                    <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Email</th>
                    <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">Contact</th>
                    <th className="px-4 py-4 text-left text-[16px] font-medium text-[#16191d] sm:px-5">School</th>
                    <th className="rounded-r-2xl px-4 py-4 text-right text-[16px] font-medium text-[#16191d] sm:px-5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b border-[#eef0f2] last:border-b-0">
                      <td className="px-4 py-5 text-[15px] font-medium text-[#2a2d32] sm:px-5">{teacher.name}</td>
                      <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">{teacher.email}</td>
                      <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">{teacher.contact}</td>
                      <td className="px-4 py-5 text-[15px] text-[#2a2d32] sm:px-5">{teacher.school}</td>
                      <td className="px-4 py-5 text-right sm:px-5">
                        <ActionMenu
                          teacherName={teacher.name}
                          onEdit={() => openEditModal(teacher)}
                          onDelete={() => setDeleteTarget(teacher)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              className="mt-6"
              rowsPerPage={limit}
              rowsPerPageOptions={[10, 20, 50]}
              onRowsPerPageChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
              rangeLabel={`${startRow}-${endRow} of ${totalTeachers}`}
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPrev={() => setPage((value) => Math.max(value - 1, 1))}
              onNext={() =>
                setPage((value) =>
                  Math.min(value + 1, pagination.totalPages || value + 1)
                )
              }
            />
          </>
        )}
      </section>

      {modalMode === "add" && (
        <TeacherModal
          onClose={closeModal}
          onSubmit={handleCreateTeacher}
        />
      )}

      {modalMode === "edit" && activeTeacher && (
        <TeacherModal
          initialData={activeTeacher}
          onClose={closeModal}
          onSubmit={handleUpdateTeacher}
        />
      )}

      {deleteTarget && (
        <DeleteTeacherModal
          teacherName={deleteTarget.name}
          deleting={deleting}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
          onConfirm={handleDeleteTeacher}
        />
      )}
    </div>
  );
}