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

// Action button
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

// School Filter Dropdown
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
    <div className="relative w-full lg:w-[200px]" ref={ref}>
      <button
        type="button"
        onClick={() => { if (!loading) setOpen((v) => !v); }}
        className="h-[40px] w-full flex items-center justify-between rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-[14px] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
      >
        <span className={value ? "text-[#20242a]" : "text-[#5b626a]"}>
          {loading ? "Loading..." : selectedLabel}
        </span>
        {loading ? (
          <Loader2 size={13} className="animate-spin text-[#6b7280] flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[#5b626a] flex-shrink-0" strokeWidth={2} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-[#e7ecef] rounded-xl shadow-lg w-64 py-1 text-sm">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
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

// Add / Edit Student Modal
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

              {/* Contact Number  */}
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

              {/* School searchable dropdown */}
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

              {/* Grade searchable dropdown */}
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

// Delete Confirm modal
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

// Main Page
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

  const filteredStudents = students.filter((s) =>
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Header: title + count + button  */}
      <div className="flex items-center justify-between px-6 pt-3 pb-5">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-[#5b626a]">
            {filterSchoolId
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

      {/* Search + Filter card  */}
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
          schools={filterSchools}
          loading={loadingSchools}
        />
      </div>

      {/* Students list card  */}
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
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-sm text-[#5b626a]">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
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

        {/* Pagination  */}
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