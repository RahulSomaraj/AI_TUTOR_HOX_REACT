import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeftRight, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, X,} from "lucide-react";
import { fetchAdminUsers, fetchSchools, createTeacher, updateTeacher, deleteTeacher } from "../api/authService";

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

function extractSchools(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.schools)) return response.schools;
  if (Array.isArray(response?.data?.schools)) return response.data.schools;
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

function TeacherModal({ initialData = null, schools = [], onClose, onSubmit }) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    contactNumber: initialData?.contactNumber ?? "",
    countryCode: initialData?.countryCode ?? "+91",
    email: initialData?.email ?? "",
    schoolId: initialData?.schoolId ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  //  Searchable school dropdown state
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const schoolRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (schoolRef.current && !schoolRef.current.contains(event.target)) {
        setSchoolOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSchools = schools.filter((s) =>
    (s.name || "").toLowerCase().includes(schoolQuery.toLowerCase())
  );

  const selectedSchoolName = schools.find((s) => String(s.id) === String(form.schoolId))?.name || "";

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
          {/* Name  */}
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

          {/* Contact Number  */}
          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#20242a]">Contact Number</label>
            <div className="flex overflow-hidden rounded-[10px] border border-[#c7cbd1]">
              <input
                type="text"
                value={form.countryCode}
                onChange={setValue("countryCode")}
                disabled={saving}
                className="h-[48px] w-[72px] border-r border-[#d6dbe1] px-3 text-[14px] text-[#20242a] outline-none disabled:bg-[#f8fafb]"
              />
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

          {/* Email  */}
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

          {/*  School searchable dropdown */}
          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#20242a]">School</label>
            <div className="relative" ref={schoolRef}>
              <button
                type="button"
                onClick={() => { if (!saving) setSchoolOpen((v) => !v); }}
                disabled={saving}
                className="h-[48px] w-full flex items-center justify-between rounded-[10px] border border-[#c7cbd1] bg-white px-4 text-[14px] outline-none transition focus:border-[#155966] disabled:bg-[#f8fafb] disabled:opacity-50"
              >
                <span className={selectedSchoolName ? "text-[#20242a]" : "text-[#6b7280]"}>
                  {selectedSchoolName || (schools.length > 0 ? "Select School" : "No schools available")}
                </span>
                <ChevronDown size={16} className="text-[#5b626a] flex-shrink-0" />
              </button>

              {schoolOpen && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e7ecef] rounded-xl shadow-lg z-50">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        autoFocus
                        type="text"
                        value={schoolQuery}
                        onChange={(e) => setSchoolQuery(e.target.value)}
                        placeholder="Search school..."
                        className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155966]/20"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {filteredSchools.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
                    ) : (
                      filteredSchools.map((school) => (
                        <li
                          key={school.id}
                          onClick={() => {
                            setForm((f) => ({ ...f, schoolId: school.id }));
                            setSchoolOpen(false);
                            setSchoolQuery("");
                          }}
                          className={`px-4 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5fafc] transition-colors ${
                            String(form.schoolId) === String(school.id)
                              ? "text-[#155966] font-medium"
                              : "text-[#20242a]"
                          }`}
                        >
                          {school.name}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
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

// DeleteTeacherModal 
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

// TeachersPage 
export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
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
  const [filterSchoolOpen, setFilterSchoolOpen] = useState(false);
  const [filterSchoolQuery, setFilterSchoolQuery] = useState("");
  const filterSchoolRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterSchoolRef.current && !filterSchoolRef.current.contains(event.target)) {
        setFilterSchoolOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Load schools for filter + modal
  useEffect(() => {
    let cancelled = false;

    async function loadSchoolOptions() {
      try {
        const response = await fetchSchools({ page: 1, limit: 50 });
        const schoolOptions = extractSchools(response).map((school) => ({
          id: String(school?.id ?? school?._id ?? ""),
          name: school?.schoolName ?? school?.name ?? "School",
        }));
        if (!cancelled) {
          setSchools(schoolOptions.filter((school) => school.id));
        }
      } catch (err) {
        console.error("Failed to load schools for teacher filter:", err);
      }
    }

    loadSchoolOptions();
    return () => { cancelled = true; };
  }, []);

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
    <div className="min-h-screen bg-[#eef6f9] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-[0] text-[#20242a]">
            Teachers
          </h1>
          <p className="mt-4 text-[18px] leading-none tracking-[0] text-[#20242a]">
            {totalTeachers} Teachers
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex h-[50px] w-full items-center justify-center gap-3 rounded-md bg-[#155966] px-6 text-[17px] font-semibold tracking-[0] text-white transition hover:bg-[#104a55] sm:w-auto"
        >
          <Plus size={22} strokeWidth={2.2} />
          Add Teacher
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

        {/* searchable school filter dropdown */}
        <div className="relative w-full lg:w-[200px]" ref={filterSchoolRef}>
          <button
            type="button"
            onClick={() => setFilterSchoolOpen((v) => !v)}
            className="h-[40px] w-full flex items-center justify-between rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-[14px] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
          >
            <span className={schoolId ? "text-[#20242a]" : "text-[#5b626a]"}>
              {schoolId
                ? schools.find((s) => String(s.id) === String(schoolId))?.name ?? "All Schools"
                : "All Schools"}
            </span>
            <ChevronDown size={16} className="text-[#5b626a] flex-shrink-0" strokeWidth={2} />
          </button>

          {filterSchoolOpen && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e7ecef] rounded-xl shadow-lg z-50">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    value={filterSchoolQuery}
                    onChange={(e) => setFilterSchoolQuery(e.target.value)}
                    placeholder="Search school..."
                    className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155966]/20"
                  />
                </div>
              </div>
              <ul className="max-h-48 overflow-y-auto py-1">
                <li
                  onClick={() => {
                    setSchoolId("");
                    setPage(1);
                    setFilterSchoolOpen(false);
                    setFilterSchoolQuery("");
                  }}
                  className={`px-4 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5fafc] transition-colors ${
                    !schoolId ? "text-[#155966] font-medium" : "text-[#20242a]"
                  }`}
                >
                  All Schools
                </li>
                {schools
                  .filter((s) => (s.name || "").toLowerCase().includes(filterSchoolQuery.toLowerCase()))
                  .map((school) => (
                    <li
                      key={school.id}
                      onClick={() => {
                        setSchoolId(school.id);
                        setPage(1);
                        setFilterSchoolOpen(false);
                        setFilterSchoolQuery("");
                      }}
                      className={`px-4 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5fafc] transition-colors ${
                        String(schoolId) === String(school.id)
                          ? "text-[#155966] font-medium"
                          : "text-[#20242a]"
                      }`}
                    >
                      {school.name}
                    </li>
                  ))}
                {schools.filter((s) =>
                  (s.name || "").toLowerCase().includes(filterSchoolQuery.toLowerCase())
                ).length === 0 && (
                  <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
                )}
              </ul>
            </div>
          )}
        </div>
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

            <div className="mt-6 flex flex-col gap-4 text-sm text-[#3a3c42] xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span>Rows per page</span>
                  <label className="relative inline-flex items-center">
                    <select
                      value={limit}
                      onChange={(event) => {
                        const nextLimit = Number(event.target.value);
                        setLimit(nextLimit);
                        setPage(1);
                      }}
                      className="h-10 appearance-none rounded-[10px] border border-[#c7cbd1] bg-[#f7f9fb] px-4 pr-10 text-[15px] text-[#3a3c42] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
                    >
                      {[10, 20, 50].map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <ChevronsLeftRight
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#6b7280]"
                      size={16}
                    />
                  </label>
                </div>
                <span>{startRow}-{endRow} of {totalTeachers}</span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage((value) => Math.max(value - 1, 1))}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c7cbd1] px-5 text-[15px] transition hover:border-[#155966] hover:text-[#155966] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={17} />
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={!pagination.hasNext}
                    onClick={() => setPage((value) => Math.min(value + 1, pagination.totalPages || value + 1))}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c7cbd1] px-5 text-[15px] transition hover:border-[#155966] hover:text-[#155966] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight size={17} />
                  </button>
                </div>
                <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {modalMode === "add" && (
        <TeacherModal
          schools={schools}
          onClose={closeModal}
          onSubmit={handleCreateTeacher}
        />
      )}

      {modalMode === "edit" && activeTeacher && (
        <TeacherModal
          initialData={activeTeacher}
          schools={schools}
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