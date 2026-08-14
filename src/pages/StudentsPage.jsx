import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, ChevronDown,
  Loader2, Eye, EyeOff, X, ShieldCheck,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import CountryCodePicker from "../components/Countrycodepicker";
import PageHeader from "../components/ui/PageHeader";
import Breadcrumb from "../components/ui/Breadcrumb";
import { useSchoolQuery } from "../features/schools/useSchool";
import { LockedSchoolField } from "../components/Schools/SchoolScopeField";
import SearchInput from "../components/ui/SearchInput";
import SearchableSelect from "../components/ui/SearchableSelect";
import DataTable from "../components/ui/DataTable";
import ActionMenu from "../components/ui/ActionMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import useDebounce from "../hooks/useDebounce";
import useOutsideClick from "../hooks/useOutsideClick";
import { fetchClasses } from "../api/services/grades";
import { fetchSchools } from "../api/services/schools";
import {
  fetchAllStudents, createStudent, updateStudent,
  deleteStudent, setStudentVerified,
} from "../api/services/students";
import { getStudentEligibility } from "../lib/studentEligibility";
import logger from "../lib/logger";

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

//  Add / Edit Student Modal
function StudentModal({ initialData = null, lockedSchoolId = "", onClose, onSuccess }) {
  const isEdit = initialData !== null;

  // Seeded from the scoped school when locked — the grade picker and the
  // submit payload both read `.value`, so the school has to be a real option
  // even though the control itself is read-only. The label is left blank
  // because LockedSchoolField resolves and displays the name itself.
  const [selectedSchool, setSelectedSchool] = useState(() => {
    if (initialData?.schoolId) {
      return { value: String(initialData.schoolId), label: initialData.schoolName || "" };
    }
    return lockedSchoolId ? { value: String(lockedSchoolId), label: "" } : null;
  });
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
    // Required for attendance: the backend recomputes isAcademicInfoComplete as
    // `gradeId && schoolId && rollNo`, so a student with no roll number can
    // never be marked present.
    rollNo: initialData?.rollNo ?? "",
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
      if (String(form.rollNo).trim() !== "") payload.rollNo = Number(form.rollNo);

      // Sent on update too, not just create — otherwise an existing student who
      // predates this can never be corrected from the admin panel.
      payload.isTermsAccepted = true;

      if (isEdit) {
        if (form.password) payload.password = form.password;
        await updateStudent(initialData.id, payload);
      } else {
        payload.password = form.password;
        const created = await createStudent(payload);

        // `isVerified` can't be set at create time, so an admin-created student
        // is otherwise stuck unverified — and therefore permanently ineligible
        // for attendance. This is the backend's sanctioned admin override.
        // A failure here leaves a valid student who just needs verifying, so
        // report it instead of failing the whole create.
        const newId = created?.data?.id ?? created?.id;
        if (newId) {
          try {
            await setStudentVerified(newId, true);
          } catch (verifyErr) {
            // Don't fail the create — the student exists and is valid, they're
            // just unverified. The Eligibility column will say so and offer the
            // Verify action, so the table itself surfaces the fix.
            logger.error("Student created but auto-verification failed:", verifyErr);
          }
        }
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

          {/* School — locked to the scoped institution, else searchable. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">School</label>
            {lockedSchoolId ? (
              <LockedSchoolField schoolId={lockedSchoolId} className="w-full" />
            ) : (
              <SearchableSelect
                value={selectedSchool}
                onChange={handleSchoolChange}
                onSearch={searchSchools}
                options={schools}
                placeholder="Select School"
                searchPlaceholder="Search school..."
                loading={loadingSchools}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade</label>
            <SearchableSelect
              value={selectedGrade}
              onChange={setSelectedGrade}
              onSearch={fetchGrades}
              options={allGrades}
              placeholder={selectedSchool ? "Select Grade" : "Select a school first"}
              searchPlaceholder="Search grade..."
              disabled={!selectedSchool}
              loading={loadingGrades}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Roll Number</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.rollNo}
              onChange={(e) => setForm((f) => ({ ...f, rollNo: e.target.value.replace(/[^0-9]/g, "") }))}
              placeholder="e.g. 12"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#155966] focus:ring-1 focus:ring-[#155966]/20 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              Required before attendance can be marked for this student.
            </p>
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

//  Main Page
const ITEMS_PER_PAGE = 10;

export default function StudentsPage() {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [search, setSearch] = useState("");
  const [filterSchoolId, setFilterSchoolId] = useState(() => searchParams.get("schoolId") || "");
  // Fixed for the lifetime of this visit when we arrived from a school's hub.
  const [lockedSchool] = useState(() => Boolean(searchParams.get("schoolId")));
  const [verifyingId, setVerifyingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const scopedSchoolQuery = useSchoolQuery(filterSchoolId);
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

  const handleSearchChange = (rawValue) => {
    setSearch(rawValue);
    setPage(1);
  };

  const handleSchoolFilter = (id) => {
    setFilterSchoolId(String(id));
    setPage(1);
  };

  const handleVerify = async (student) => {
    setVerifyingId(student.id);
    setActionError("");
    try {
      await setStudentVerified(student.id, true);
      loadStudents();
    } catch (err) {
      setActionError(
        err?.response?.data?.message ||
          `Failed to verify ${student?.name || "this student"}. Verifying requires an admin role.`
      );
    } finally {
      setVerifyingId(null);
    }
  };

  const columns = [
    { key: "name", header: "Name", render: (s) => (
      <span className="font-medium text-[#2a2d32]">{s.name || "-"}</span>
    ) },
    { key: "contactEmail", header: "Email", render: (s) => s.contactEmail || "-" },
    { key: "contact", header: "Contact", render: (s) => (
      s.contactNumber ? `${s.countryCode || "+91"}-${s.contactNumber}` : "-"
    ) },
    { key: "school", header: "School", render: (s) => s.school?.schoolName || "-" },
    { key: "grade", header: "Grade", render: (s) => s.grade?.aliasName || s.grade?.name || "-" },
    { key: "rollNo", header: "Roll No", render: (s) => (s.rollNo ?? "—") },
    {
      key: "eligibility",
      header: "Attendance",
      // Surfaces the backend's eligibility rule up front. Without this an admin
      // only discovers a student can't be marked present at the moment they try
      // to mark them, by which point they've filled in a whole form.
      render: (s) => {
        const { eligible, missing } = getStudentEligibility(s);
        return (
          <span
            title={eligible ? "Can be marked present" : `Blocked: ${missing.join(", ")}`}
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              eligible ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {eligible ? "Eligible" : missing[0]}
          </span>
        );
      },
    },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "right", render: (s) => (
      <ActionMenu
        label={s.name || "student"}
        extraItems={
          s.isVerified
            ? []
            : [
                {
                  label: verifyingId === s.id ? "Verifying..." : "Verify",
                  icon: <ShieldCheck size={14} className="text-[#155966]" />,
                  onClick: () => handleVerify(s),
                },
              ]
        }
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
    ) },
  ];

  return (
    <div className="ty-page-shell">
      {/* Modals */}
      {showModal && (
        <StudentModal
          initialData={null}
          lockedSchoolId={lockedSchool ? filterSchoolId : ""}
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
          lockedSchoolId={lockedSchool ? filterSchoolId : ""}
          onClose={() => setEditData(null)}
          onSuccess={() => {
            loadStudents();
            setEditData(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remove Student"
          message={
            <>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-gray-700">{deleteTarget.name}</span>? This action cannot be undone.
            </>
          }
          confirmLabel="Remove"
          cancelLabel="Cancel"
          busy={deleting}
          tone="danger"
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      )}

      <Breadcrumb
        items={
          filterSchoolId
            ? [
                { label: "Institution Management", path: "/schools" },
                { label: scopedSchoolQuery.data?.schoolName ?? "Institution", path: `/schools/${filterSchoolId}` },
                { label: "Students" },
              ]
            : [{ label: "Students" }]
        }
      />

      {/* Header: title + count + button  */}
      <PageHeader
        title="Students"
        subtitle={
          debouncedSearch.trim()
            ? `${totalCount} result${totalCount !== 1 ? "s" : ""}`
            : filterSchoolId
            ? `${totalCount} Students in selected school`
            : `${totalCount} Students`
        }
        actionLabel="Add Student"
        onAction={() => setShowModal(true)}
      />

      {/* Search + Filter card */}
      <div className="mb-6 flex flex-col gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search students by name..."
        />

        {/* Scoped from the Institution hub → locked; standalone → filterable. */}
        {lockedSchool ? (
          <LockedSchoolField schoolId={filterSchoolId} className="w-full lg:w-[200px]" />
        ) : (
          <SchoolFilter value={filterSchoolId} onChange={handleSchoolFilter} />
        )}
      </div>

      {actionError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Students list card */}
      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <h2 className="mb-6 text-[24px] font-semibold leading-none tracking-[0] text-[#20242a]">
          Students
        </h2>

        <DataTable
                    startIndex={(page - 1) * itemsPerPage}
          columns={columns}
          rows={students}
          loading={loading}
          emptyLabel="No students found."
          rowKey={(s) => s.id}
          minWidth={960}
        />

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
