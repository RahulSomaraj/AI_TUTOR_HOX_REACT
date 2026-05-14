import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Plus, MoreHorizontal, ChevronDown,
  Pencil, Trash2,
  Loader2, X, Eye, EyeOff,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
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

//  Action button
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

// FIX 3 — School Filter Dropdown with search
function SchoolFilter({ value, onChange, schools = [], loading = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  const options = [{ value: "", label: "All Schools" }, ...schools];
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );
  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label || "All Schools";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { if (!loading) setOpen((v) => !v); }}
        className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white hover:border-gray-400 transition-colors min-w-[180px] justify-between"
      >
        <span>{loading ? "Loading..." : selectedLabel}</span>
        {loading ? (
          <Loader2 size={13} className="animate-spin text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-40 bg-white border border-gray-200 rounded-xl shadow-lg w-64 py-1 text-sm">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search school..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Options */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">No results</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={String(o.value)}
                  onClick={() => {
                    onChange(String(o.value));
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    String(value) === String(o.value)
                      ? "text-[#23616E] font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {o.label}
                  {String(value) === String(o.value) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#23616E]" />
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

// FIX 3 — Add / Edit Student Modal with searchable school & grade dropdowns
function StudentModal({ initialData = null, onClose, onSuccess }) {
  const isEdit = initialData !== null;

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    contactNumber: initialData?.contactNumber ?? "",
    countryCode: initialData?.countryCode ?? "+91",
    contactEmail: initialData?.contactEmail ?? "",
    password: "",
    confirmPassword: "",
    schoolId: initialData?.schoolId ? String(initialData.schoolId) : "",
    gradeId: initialData?.gradeId ? String(initialData.gradeId) : "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [ccOpen, setCcOpen] = useState(false);
  const ccRef = useRef(null);
  useOutsideClick(ccRef, () => setCcOpen(false));
  const countryCodes = ["+91", "+1", "+44", "+61", "+971", "+65"];

  // Searchable school dropdown state
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const schoolRef = useRef(null);
  useOutsideClick(schoolRef, () => setSchoolOpen(false));

  // Searchable grade dropdown state
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeQuery, setGradeQuery] = useState("");
  const gradeRef = useRef(null);
  useOutsideClick(gradeRef, () => setGradeOpen(false));

  const filteredSchools = schools.filter((s) =>
    s.schoolName.toLowerCase().includes(schoolQuery.toLowerCase())
  );
  const filteredGrades = grades.filter((g) =>
    (g.aliasName || g.name || "").toLowerCase().includes(gradeQuery.toLowerCase())
  );

  useEffect(() => {
    setLoadingSchools(true);
    fetchSchools({ page: 1, limit: 50 })
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setSchools(list);
      })
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  useEffect(() => {
    if (!form.schoolId) {
      setGrades([]);
      setForm((prev) => ({ ...prev, gradeId: "" }));
      return;
    }

    setLoadingGrades(true);
    fetchClasses({ schoolId: form.schoolId, page: 1, limit: 50 })
      .then((res) => {
        const list =
          Array.isArray(res?.data) ? res.data :
          res?.data?.grades || [];
        setGrades(Array.isArray(list) ? list : []);
      })
      .catch(() => setGrades([]))
      .finally(() => setLoadingGrades(false));
  }, [form.schoolId]);

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
      ...(key === "schoolId" ? { gradeId: "" } : {}),
    }));

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

      if (form.schoolId) payload.schoolId = Number(form.schoolId);
      if (form.gradeId) payload.gradeId = Number(form.gradeId);

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

          {loadingSchools ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : (
            <>
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
                <div className="flex gap-0 border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#23616E] focus-within:ring-1 focus-within:ring-[#23616E]/20 transition-colors">
                  <div className="relative" ref={ccRef}>
                    <button
                      type="button"
                      onClick={() => setCcOpen((v) => !v)}
                      className="flex items-center gap-1 px-3 py-2.5 text-sm text-gray-700 border-r border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors h-full"
                    >
                      {form.countryCode}
                      <ChevronDown size={12} className="text-gray-400" />
                    </button>
                    {ccOpen && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-24 py-1">
                        {countryCodes.map((cc) => (
                          <button
                            key={cc}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, countryCode: cc }));
                              setCcOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                              form.countryCode === cc ? "text-[#23616E] font-medium" : "text-gray-700"
                            }`}
                          >
                            {cc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    value={form.contactNumber}
                    onChange={set("contactNumber")}
                    placeholder="Enter contact number"
                    autoComplete="off"
                    className="flex-1 px-4 py-2.5 text-sm outline-none bg-white"
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

              {/* FIX 3 — School searchable dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">School</label>
                <div className="relative" ref={schoolRef}>
                  <button
                    type="button"
                    onClick={() => setSchoolOpen((v) => !v)}
                    className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#23616E] transition-colors cursor-pointer"
                  >
                    <span className={form.schoolId ? "text-gray-700" : "text-gray-400"}>
                      {schools.find((s) => String(s.id) === form.schoolId)?.schoolName || "Select School"}
                    </span>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>

                  {schoolOpen && (
                    <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            autoFocus
                            type="text"
                            value={schoolQuery}
                            onChange={(e) => setSchoolQuery(e.target.value)}
                            placeholder="Search school..."
                            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                      <ul className="max-h-44 overflow-y-auto py-1">
                        {filteredSchools.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-400 text-center">No results</li>
                        ) : (
                          filteredSchools.map((s) => (
                            <li
                              key={s.id}
                              onClick={() => {
                                setForm((f) => ({ ...f, schoolId: String(s.id), gradeId: "" }));
                                setSchoolOpen(false);
                                setSchoolQuery("");
                              }}
                              className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                                String(form.schoolId) === String(s.id)
                                  ? "text-[#23616E] font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              {s.schoolName}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/*  Grade searchable dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade</label>
                <div className="relative" ref={gradeRef}>
                  <button
                    type="button"
                    onClick={() => { if (form.schoolId && !loadingGrades) setGradeOpen((v) => !v); }}
                    className={`w-full flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#23616E] transition-colors
                      ${!form.schoolId || loadingGrades ? "opacity-50 cursor-not-allowed text-gray-400" : "text-gray-700 cursor-pointer"}`}
                  >
                    <span>
                      {!form.schoolId
                        ? "Select a school first"
                        : loadingGrades
                        ? "Loading grades..."
                        : grades.find((g) => String(g.id) === form.gradeId)?.aliasName ||
                          grades.find((g) => String(g.id) === form.gradeId)?.name ||
                          "Select Grade"}
                    </span>
                    {loadingGrades
                      ? <Loader2 size={14} className="animate-spin text-gray-400" />
                      : <ChevronDown size={14} className="text-gray-400" />}
                  </button>

                  {gradeOpen && (
                    <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            autoFocus
                            type="text"
                            value={gradeQuery}
                            onChange={(e) => setGradeQuery(e.target.value)}
                            placeholder="Search grade..."
                            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                      <ul className="max-h-44 overflow-y-auto py-1">
                        {filteredGrades.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-400 text-center">No results</li>
                        ) : (
                          filteredGrades.map((g) => (
                            <li
                              key={g.id}
                              onClick={() => {
                                setForm((f) => ({ ...f, gradeId: String(g.id) }));
                                setGradeOpen(false);
                                setGradeQuery("");
                              }}
                              className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                                String(form.gradeId) === String(g.id)
                                  ? "text-[#23616E] font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              {g.aliasName || g.name}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
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
            disabled={submitting || loadingSchools}
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

//  Delete Confirm modal — unchanged
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
  const [filterSchools, setFilterSchools] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoadingSchools(true);
    fetchSchools({ page: 1, limit: 50 })
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setFilterSchools(
          list.map((s) => ({
            value: String(s.id),
            label: s.schoolName,
          }))
        );
      })
      .catch(() => setFilterSchools([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  //  pass schoolId to API for server-side filtering, added filterSchoolId to deps
  const loadStudents = useCallback(() => {
    setLoading(true);

    const params = { page, limit: itemsPerPage };
    if (filterSchoolId) params.schoolId = Number(filterSchoolId);

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
  }, [page, itemsPerPage, filterSchoolId]); 

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

  //  client-side search only (school filter is now server-side)
  const filteredStudents = students.filter((s) =>
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-[#f5f7fa] min-h-screen">
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

      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="ty-page-title">Students</h1>
          <p className="mt-1 ty-subtitle">
            {filterSchoolId
              ? `${totalCount} Students in selected school`
              : `${totalCount} Students`}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#23616E] hover:bg-[#1d5260] text-white text-[17px] font-semibold tracking-[0] px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={18} />
          Add Student
        </button>
      </div>

      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 w-80">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search students by name..."
            value={search}
            onChange={handleSearchChange}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
          />
        </div>

        {/* FIX 3 — searchable school filter */}
        <SchoolFilter
          value={filterSchoolId}
          onChange={handleSchoolFilter}
          schools={filterSchools}
          loading={loadingSchools}
        />
      </div>

      <div className="flex-1 px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 pt-5 pb-3">
            <h2 className="ty-section-heading">Students</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left px-6 py-3.5 ty-table-header">Name</th>
                  <th className="text-left px-6 py-3.5 ty-table-header">Email</th>
                  <th className="text-left px-6 py-3.5 ty-table-header">Contact</th>
                  <th className="text-left px-6 py-3.5 ty-table-header">School</th>
                  <th className="text-left px-6 py-3.5 ty-table-header">Grade</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Loader2 size={22} className="animate-spin text-[#23616E] mx-auto" />
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 ty-table-cell-primary">{s.name || "-"}</td>
                      <td className="px-6 py-4 ty-table-cell">{s.contactEmail || "-"}</td>
                      <td className="px-6 py-4 ty-table-cell">
                        {s.contactNumber
                          ? `${s.countryCode || "+91"}-${s.contactNumber}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 ty-table-cell">{s.school?.schoolName || "-"}</td>
                      <td className="px-6 py-4 ty-table-cell">{s.grade?.aliasName || s.grade?.name || "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <ActionMenu
                          onEdit={() =>
                            setEditData({
                              id: s.id,
                              name: s.name,
                              contactEmail: s.contactEmail,
                              contactNumber: s.contactNumber,
                              countryCode: s.countryCode,
                              schoolId: s.schoolId || s.school?.id,
                              gradeId: s.gradeId || s.grade?.id,
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
        </div>
      </div>
    </div>
  );
}

