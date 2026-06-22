import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, ChevronDown,
  Loader2, Eye, EyeOff, X,
} from "lucide-react";
import PaginationControls from "../components/PaginationControls";
import CountryCodePicker from "../components/Countrycodepicker";
import PageHeader from "../components/ui/PageHeader";
import SearchInput from "../components/ui/SearchInput";
import SearchableSelect from "../components/ui/SearchableSelect";
import DataTable from "../components/ui/DataTable";
import ActionMenu from "../components/ui/ActionMenu";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import useDebounce from "../hooks/useDebounce";
import useOutsideClick from "../hooks/useOutsideClick";
import {
  fetchAllStudents, createStudent, updateStudent,
  deleteStudent, fetchSchools, fetchClasses,
} from "../api/authService";

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
              onSearch={fetchGrades}
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

  const handleSearchChange = (rawValue) => {
    setSearch(rawValue);
    setPage(1);
  };

  const handleSchoolFilter = (id) => {
    setFilterSchoolId(String(id));
    setPage(1);
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
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "right", render: (s) => (
      <ActionMenu
        label={s.name || "student"}
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

        <DataTable
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
