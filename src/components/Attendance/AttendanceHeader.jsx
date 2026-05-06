import { Download, Plus, Calendar } from "lucide-react";

const formatDisplay = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const AttendanceHeader = ({
  startDate,
  endDate,
  onOpenStartDate,
  onOpenEndDate,
  onDownloadReport,
  onAddAttendance,
}) => {
  return (
    <div className="flex items-center justify-between mb-5">
      <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>

      <div className="flex items-center gap-3">
        {/* Select Start Date button */}
        <button
          onClick={onOpenStartDate}
          className="flex items-center gap-2 pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-white hover:bg-gray-50 transition-colors min-w-[140px]"
        >
          <span className="flex-1 text-left">
            {startDate ? formatDisplay(startDate) : "Select Start ..."}
          </span>
          <Calendar size={15} className="text-gray-400 flex-shrink-0" />
        </button>

        {/* Select End Date button */}
        <button
          onClick={onOpenEndDate}
          className="flex items-center gap-2 pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-white hover:bg-gray-50 transition-colors min-w-[140px]"
        >
          <span className="flex-1 text-left">
            {endDate ? formatDisplay(endDate) : "Select End D..."}
          </span>
          <Calendar size={15} className="text-gray-400 flex-shrink-0" />
        </button>

        {/* Download Report */}
        <button
          onClick={onDownloadReport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          style={{ color: "#1a5f6a", borderColor: "#1a5f6a" }}
        >
          <Download size={15} />
          Download Report
        </button>

        {/* Add Attendance */}
        <button
          onClick={onAddAttendance}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors"
          style={{ backgroundColor: "#1a5f6a" }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#164f59")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1a5f6a")}
        >
          <Plus size={15} />
          Add Attendance
        </button>
      </div>
    </div>
  );
};

export default AttendanceHeader;