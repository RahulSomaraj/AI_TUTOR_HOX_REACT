import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check, Calendar } from "lucide-react";
import DatePickerModal from "./DatePickerModal";
import { fetchSchools, fetchClasses, fetchAllStudents, fetchTeachers, createAttendance } from "../../api/authService";

// ── Searchable dropdown ───────────────────────────────────────────────
const SearchableSelect = ({ label, value, onChange, options, placeholder, disabled, loading }) => {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const handleSelect = (val) => { onChange(val); setOpen(false); setQuery(""); };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => { if (!disabled && !loading) setOpen((v) => !v); }}
          className={`w-full flex items-center justify-between pl-3 pr-2.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors
            ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}
        >
          <span className={selectedLabel ? "text-gray-700" : "text-gray-400"}>
            {loading ? "Loading..." : selectedLabel || placeholder}
          </span>
          <ChevronDown size={13} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg z-50">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <ul className="max-h-44 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-400 text-center">No results</li>
              ) : (
                filtered.map((o) => (
                  <li
                    key={o.value}
                    onClick={() => handleSelect(o.value)}
                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors
                      ${o.value === value ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {o.label}
                    {o.value === value && <Check size={12} className="text-teal-600" />}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Plain select (no search) ──────────────────────────────────────────
const PlainSelect = ({ label, value, onChange, options, placeholder, disabled }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm text-gray-600">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed text-gray-400" : "text-gray-700 cursor-pointer"}`}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

// ── Static data ───────────────────────────────────────────────────────
const ATTENDANCE_TYPES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
];
const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent",  label: "Absent"  },
  { value: "late",    label: "Late"    },
];

const toApiDate = (s) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
};

const formatDateDisplay = (s) => {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ── Main modal ────────────────────────────────────────────────────────
const AddAttendanceModal = ({ isOpen, onClose, onSubmit }) => {
  const isTeacher = (type) => type === "teacher";

  const [form, setForm] = useState({
    attendanceType: "", school: "", grade: "", status: "", person: "", date: "",
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [error,          setError]          = useState("");
  const [submitting,     setSubmitting]      = useState(false);

  // Data lists
  const [schools,  setSchools]  = useState([]);
  const [grades,   setGrades]   = useState([]);
  const [persons,  setPersons]  = useState([]); 

  // Loading flags
  const [loadingSchools,  setLoadingSchools]  = useState(false);
  const [loadingGrades,   setLoadingGrades]   = useState(false);
  const [loadingPersons,  setLoadingPersons]  = useState(false);

  // Reset & load schools on open
  useEffect(() => {
    if (!isOpen) return;
    setForm({ attendanceType: "", school: "", grade: "", status: "", person: "", date: "" });
    setGrades([]);
    setPersons([]);
    setError("");
    setDatePickerOpen(false);

    const load = async () => {
      setLoadingSchools(true);
      try {
        const res = await fetchSchools();
        setSchools((res?.data ?? []).map((s) => ({ value: String(s.id), label: s.schoolName })));
      } catch (e) {
        console.error("Schools load error:", e);
      } finally {
        setLoadingSchools(false);
      }
    };
    load();
  }, [isOpen]);

  // Load grades when school selected (skip for teacher)
  useEffect(() => {
    setGrades([]);
    if (!form.school || isTeacher(form.attendanceType)) return;

    const load = async () => {
      setLoadingGrades(true);
      try {
        let all = [], page = 1;
        while (true) {
          const res = await fetchClasses({ schoolId: form.school, page, limit: 10, aliasName: "" });
          all = [...all, ...(res?.data ?? [])];
          if (!res?.pagination?.hasNext) break;
          page++;
        }
        setGrades(all.map((g) => ({ value: String(g.id), label: g.aliasName ?? g.name })));
      } catch (e) {
        console.error("Grades load error:", e);
      } finally {
        setLoadingGrades(false);
      }
    };
    load();
  }, [form.school, form.attendanceType]);

  // Load students when grade selected OR teachers when school selected + teacher type
  useEffect(() => {
    setPersons([]);
    const teacher = isTeacher(form.attendanceType);

    // Students need both school + grade; teachers only need school
    if (!form.school) return;
    if (!teacher && !form.grade) return;

    const load = async () => {
      setLoadingPersons(true);
      try {
        if (teacher) {
          const res = await fetchTeachers({ schoolId: form.school, page: 1, limit: 50 });
          setPersons(
            (res?.data ?? []).map((t) => ({
              value: String(t.id),
              label: [t.firstName, t.lastName].filter(Boolean).join(" ") || t.username || t.name || "—",
            }))
          );
        } else {
          const res = await fetchAllStudents({ schoolId: form.school, gradeId: form.grade, page: 1, limit: 50 });
          setPersons(
            (res?.data ?? []).map((s) => ({
              value: String(s.id),
              label: [s.firstName, s.lastName].filter(Boolean).join(" ") || s.username || s.name || "—",
            }))
          );
        }
      } catch (e) {
        console.error("Persons load error:", e);
      } finally {
        setLoadingPersons(false);
      }
    };
    load();
  }, [form.school, form.grade, form.attendanceType]);

  if (!isOpen) return null;

  const set = (key) => (val) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "school")         { next.grade = ""; next.person = ""; }
      if (key === "grade")          { next.person = ""; }
      if (key === "attendanceType") { next.grade = ""; next.person = ""; }
      return next;
    });
  };

  const teacher = isTeacher(form.attendanceType);

  const handleSubmit = async () => {
    if (!form.attendanceType) return setError("Please select attendance type.");
    if (!form.school)         return setError("Please select a school.");
    if (!teacher && !form.grade) return setError("Please select a grade.");
    if (!form.status)         return setError("Please select attendance status.");
    if (!form.person)         return setError(`Please select a ${teacher ? "teacher" : "student"}.`);
    if (!form.date)           return setError("Please select a date.");

    setError("");
    setSubmitting(true);
    try {
      const payload = {
        schoolId: Number(form.school),
        date:     toApiDate(form.date),
        records: [{
          studentId: Number(form.person),
          status:    form.status,
        }],
      };
      // Only add gradeId for students
      if (!teacher) payload.gradeId = Number(form.grade);

      await createAttendance(payload);
      onSubmit?.();
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message ?? "Failed to save attendance. Please try again.";
      setError(typeof msg === "string" ? msg : "Failed to save attendance.");
      console.error("Create attendance error:", e?.response?.data || e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-2xl shadow-2xl w-[680px] p-7">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Add Attendance</h2>

          {/* Row 1: Type | School | Grade */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Attendance type — plain select, no search needed */}
            <PlainSelect
              label="Select attendance type"
              value={form.attendanceType}
              onChange={set("attendanceType")}
              options={ATTENDANCE_TYPES}
              placeholder="Select type"
            />
            <SearchableSelect
              label="School"
              value={form.school}
              onChange={set("school")}
              options={schools}
              placeholder="Select school"
              loading={loadingSchools}
            />
            {/* Grade — disabled & special placeholder for teachers */}
            <SearchableSelect
              label="Grade"
              value={form.grade}
              onChange={set("grade")}
              options={grades}
              placeholder={
                teacher
                  ? "Not required for teachers"
                  : !form.school
                  ? "Select school first"
                  : "Select grade"
              }
              disabled={!form.school || teacher}
              loading={!teacher && loadingGrades}
            />
          </div>

          {/* Row 2: Status | Student/Teacher | Date */}
          <div className="grid grid-cols-3 gap-4">
            <SearchableSelect
              label="Attendance status"
              value={form.status}
              onChange={set("status")}
              options={ATTENDANCE_STATUSES}
              placeholder="Select status"
            />
            {/* Person field — label + placeholder changes based on type */}
            <SearchableSelect
              label={teacher ? "Teacher" : "Student"}
              value={form.person}
              onChange={set("person")}
              options={persons}
              placeholder={
                !form.school
                  ? "Select school first"
                  : !teacher && !form.grade
                  ? "Select grade first"
                  : teacher
                  ? "Select teacher"
                  : "Select student"
              }
              disabled={!form.school || (!teacher && !form.grade)}
              loading={loadingPersons}
            />

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Select date</label>
              <button
                onClick={() => setDatePickerOpen(true)}
                className="w-full flex items-center justify-between pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <span className={form.date ? "text-gray-700" : "text-gray-400"}>
                  {form.date ? formatDateDisplay(form.date) : "Choose date"}
                </span>
                <Calendar size={15} className="text-gray-400 flex-shrink-0" />
              </button>
            </div>
          </div>

          {/* Validation error */}
          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 font-medium border border-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-lg text-sm text-white font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
              style={{ backgroundColor: "#1a5f6a" }}
            >
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</>
                : "Submit"
              }
            </button>
          </div>
        </div>
      </div>

      <DatePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(date) => { set("date")(date); setDatePickerOpen(false); }}
        value={form.date}
        allowFuture={false}
        title="Select date"
      />
    </>
  );
};

export default AddAttendanceModal;