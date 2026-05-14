import { useState, useEffect, useCallback } from "react";
import AttendanceHeader   from "../components/Attendance/AttendanceHeader";
import AttendanceFilters  from "../components/Attendance/AttendanceFilters";
import AttendanceTable    from "../components/Attendance/AttendanceTable";
import AttendanceCalendar from "../components/Attendance/AttendanceCalendar";
import AttendanceStats    from "../components/Attendance/AttendanceStats";
import DatePickerModal    from "../components/Attendance/DatePickerModal";
import AddAttendanceModal from "../components/Attendance/Addattendancemodal";
import {
  fetchSchools,
  fetchClasses,
  fetchAttendance,
  exportAttendanceCsv,
} from "../api/authService";

const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// API requires DD-MM-YYYY
const toApiDate = (s) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
};

const Attendance = () => {
  const today = toDateStr(new Date());

  // ── Header date range ──────────────────────────────────────────────
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  // ── Modal open state ───────────────────────────────────────────────
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [endModalOpen,   setEndModalOpen]   = useState(false);
  const [addModalOpen,   setAddModalOpen]   = useState(false);

  // ── Toast ──────────────────────────────────────────────────────────
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Filter state ───────────────────────────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedGrade,  setSelectedGrade]  = useState("");
  const [selectedType,   setSelectedType]   = useState("");

  // ── Calendar selected date ─────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(today);

  // ── Data state ─────────────────────────────────────────────────────
  const [schools,    setSchools]    = useState([]);
  const [grades,     setGrades]     = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [stats,      setStats]      = useState({ total: null, present: null, absent: null, late: null });

  // ── Loading ────────────────────────────────────────────────────────
  const [loadingSchools,    setLoadingSchools]    = useState(false);
  const [loadingGrades,     setLoadingGrades]     = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // ── 1. Load schools on mount ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingSchools(true);
      try {
        const res = await fetchSchools();
        setSchools(res?.data ?? []);
      } catch (e) {
        console.error("Failed to load schools:", e);
      } finally {
        setLoadingSchools(false);
      }
    };
    load();
  }, []);

  // ── 2. Load grades when school changes — only for student type ─────
  useEffect(() => {
    setSelectedGrade("");
    setGrades([]);

    if (!selectedSchool || selectedType === "teacher") return;

    const load = async () => {
      setLoadingGrades(true);
      try {
        let allGrades = [];
        let page = 1;
        while (true) {
          const res = await fetchClasses({ schoolId: selectedSchool, page, limit: 10, aliasName: "" });
          const pageData = res?.data ?? [];
          allGrades = [...allGrades, ...pageData];
          if (!res?.pagination?.hasNext) break;
          page++;
        }
        setGrades(allGrades);
      } catch (e) {
        console.error("Failed to load grades:", e);
      } finally {
        setLoadingGrades(false);
      }
    };
    load();
  }, [selectedSchool, selectedType]);

  // ── 3. Load attendance ─────────────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!selectedSchool) {
      setAttendance([]);
      setStats({ total: null, present: null, absent: null, late: null });
      return;
    }

    // gradeId required only for student type
    if (selectedType !== "teacher" && !selectedGrade) {
      setAttendance([]);
      setStats({ total: null, present: null, absent: null, late: null });
      return;
    }

    setLoadingAttendance(true);
    try {
      const params = {
        page:     1,
        limit:    50,
        order:    "desc",
        schoolId: selectedSchool,
        date:     toApiDate(selectedDate),
      };

      // Send attendanceType — "Student" or "Teacher"
      if (selectedType) {
        params.attendanceType = selectedType.charAt(0).toUpperCase() + selectedType.slice(1);
      }

      // gradeId only for student type
      if (selectedType !== "teacher" && selectedGrade) {
        params.gradeId = selectedGrade;
      }

      const res     = await fetchAttendance(params);
      const records = res?.data ?? [];

      const filtered = records.filter((r) => {
        if (!searchQuery) return true;
        const name = (
          r.studentName   ??
          r.teacherName   ??
          r.student?.name ??
          r.teacher?.name ??
          ""
        ).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      });

      setAttendance(filtered);

      // Stats from full unfiltered records
      const total   = records.length;
      const present = records.filter((r) => r.status?.toLowerCase() === "present").length;
      const absent  = records.filter((r) => r.status?.toLowerCase() === "absent").length;
      const late    = records.filter((r) => r.status?.toLowerCase() === "late").length;
      setStats({ total, present, absent, late });

    } catch (e) {
      setAttendance([]);
      setStats({ total: 0, present: 0, absent: 0, late: 0 });

      const status = e?.response?.status;
      if (status === 404) {
        showToast("Attendance not found for this date.");
      } else {
        console.error("Failed to load attendance:", e?.response?.data || e);
        showToast("Failed to load attendance. Please try again.");
      }
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedSchool, selectedGrade, selectedDate, selectedType, searchQuery]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // ── 4. Download Report (base64 CSV) ───────────────────────────────
  const handleDownloadReport = async () => {
    if (!startDate || !endDate) {
      alert("Please select a start and end date before downloading.");
      return;
    }
    if (!selectedSchool) {
      alert("Please select a school before downloading.");
      return;
    }
    if ((!selectedType || selectedType === "student") && !selectedGrade) {
      alert("Please select a grade before downloading.");
      return;
    }

    try {
      const attendanceType = selectedType
        ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1)
        : "Student";

      const params = {
        schoolId:       selectedSchool,
        startDate:      toApiDate(startDate),
        endDate:        toApiDate(endDate),
        attendanceType,
      };

      if (attendanceType === "Student" && selectedGrade) {
        params.gradeId = selectedGrade;
      }

      const res      = await exportAttendanceCsv(params);
      const fileData = res?.data;
      const base64   = fileData?.base64 ?? res;
      const fileName = fileData?.fileName ?? `attendance_${startDate}_to_${endDate}.csv`;

      const csv  = atob(base64);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Export failed:", e);
      showToast("Failed to download report. Please try again.");
    }
  };

  // ── 5. After add modal saves — refresh table ───────────────────────
  const handleAddSubmit = () => {
    loadAttendance();
  };

  // ── Shape data for child components ───────────────────────────────
  const schoolOptions = schools.map((s) => ({ id: s.id, name: s.schoolName }));
  const gradeOptions  = grades.map((g)  => ({ id: g.id, name: g.aliasName ?? g.name }));

  // Handle both student and teacher name/id fields from API
  const tableStudents = attendance.map((r) => ({
    id:       r.id ?? r.studentId ?? r.teacherId,
    name:     r.studentName   ?? r.teacherName   ?? r.student?.name ?? r.teacher?.name ?? "—",
    rollNo:   r.rollNo        ?? r.student?.rollNo ?? r.teacher?.employeeId ?? "—",
    class:    r.gradeName     ?? r.grade?.aliasName ?? r.grade?.name ?? r.teacher?.designation ?? "—",
    schoolId: r.schoolId,
    avatar:   r.student?.avatar ?? r.teacher?.avatar ?? null,
    attendance: { [selectedDate]: r.status?.toLowerCase() },
  }));

  const attendanceTypes = [
    { id: "student", label: "Student" },
    { id: "teacher", label: "Teacher" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">

      {/* ── Page Header — no card, matches Classes & Banner pages ── */}
      <div className="px-6 pt-3 pb-5">
        <AttendanceHeader
          startDate={startDate}
          endDate={endDate}
          onOpenStartDate={() => setStartModalOpen(true)}
          onOpenEndDate={() => setEndModalOpen(true)}
          onDownloadReport={handleDownloadReport}
          onAddAttendance={() => setAddModalOpen(true)}
        />
      </div>

      {/* ── Filters Card — white card, matches Classes & Banner pages ── */}
      <div className="mx-6 mb-4 bg-white rounded-2xl border border-gray-200 px-6 py-4">
        <AttendanceFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedBoard={selectedGrade}
          onBoardChange={setSelectedGrade}
          boards={gradeOptions}
          selectedSchool={selectedSchool}
          onSchoolChange={(val) => { setSelectedSchool(val); setSelectedGrade(""); }}
          schools={schoolOptions}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          attendanceTypes={attendanceTypes}
          loadingSchools={loadingSchools}
          loadingGrades={loadingGrades}
        />
      </div>

      {/* ── Main Content Row ── */}
      <div className="flex gap-5 mx-6 mb-6">

        {/* ── Attendance Table Card ── */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <AttendanceTable
            students={tableStudents}
            selectedDate={selectedDate}
            loading={loadingAttendance}
            type={selectedType}
          />
        </div>

        {/* ── Right Sidebar (calendar & stats unchanged) ── */}
        <div className="w-64 flex-shrink-0">
          <AttendanceCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
          <AttendanceStats
            stats={
              selectedSchool && (selectedType === "teacher" || selectedGrade)
                ? stats
                : {}
            }
            type={selectedType}
          />
        </div>
      </div>

      {/* ── Modals (unchanged) ── */}
      <DatePickerModal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onConfirm={(date) => {
          setStartDate(date);
          if (endDate && date > endDate) setEndDate("");
          setStartModalOpen(false);
        }}
        value={startDate}
        allowFuture={true}
        title="Select start date"
      />

      <DatePickerModal
        isOpen={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        onConfirm={(date) => { setEndDate(date); setEndModalOpen(false); }}
        value={endDate}
        minDate={startDate}
        allowFuture={true}
        title={startDate ? `Start: ${startDate}` : "Select end date"}
      />

      <AddAttendanceModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddSubmit}
      />

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Attendance;