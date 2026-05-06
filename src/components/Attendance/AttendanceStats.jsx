const StatCard = ({ label, value, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
    <p className="text-xs text-gray-500 mb-2">{label}</p>
    <p
      className="text-2xl font-bold"
      style={{ color: value === "--" ? "#9ca3af" : color || "#1f2937" }}
    >
      {value}
    </p>
  </div>
);

const AttendanceStats = ({ stats, type }) => {
  const { total, present, absent, late } = stats || {};

  const fmt = (val) =>
    val === undefined || val === null ? "--" : String(val);

  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      <StatCard label={type === "teacher" ? "Total Teachers" : "Total Students"} value={fmt(total)} color="#1a5f6a" />
      <StatCard label="Present Today" value={fmt(present)} color="#16a34a" />
      <StatCard label="Absent Today" value={fmt(absent)} color="#dc2626" />
      <StatCard label="Late Today" value={fmt(late)} color="#d97706" />
    </div>
  );
};

export default AttendanceStats;