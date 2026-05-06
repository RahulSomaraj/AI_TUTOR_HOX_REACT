import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Generate years from 2000 up to current year
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = 2000; y <= currentYear; y++) years.push(y);
  return years;
};

const YEARS = generateYears();

const AttendanceCalendar = ({ selectedDate, onDateSelect }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(selectedDate);
    return new Date();
  });
  const [showYearPicker, setShowYearPicker] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onDateSelect(dateStr);
  };

  const handleYearSelect = (selectedYear) => {
    // If selected year is current year and current month is in the future, clamp to current month
    let newMonth = month;
    if (selectedYear === today.getFullYear() && month > today.getMonth()) {
      newMonth = today.getMonth();
    }
    setViewDate(new Date(selectedYear, newMonth, 1));
    setShowYearPicker(false);
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === selectedDate;
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isFuture = (day) => {
    const cellDate = new Date(year, month, day);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cellDate > todayMidnight;
  };

  const isNextMonthDisabled =
    year === today.getFullYear() && month === today.getMonth();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 relative">
      {/* Month/Year Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Clickable Month+Year label */}
        <button
          onClick={() => setShowYearPicker((prev) => !prev)}
          className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          {MONTHS[month]} {year}
          {showYearPicker
            ? <ChevronUp size={14} className="text-gray-400" />
            : <ChevronDown size={14} className="text-gray-400" />
          }
        </button>

        <button
          onClick={nextMonth}
          disabled={isNextMonthDisabled}
          className={`p-1 rounded transition-colors ${
            isNextMonthDisabled
              ? "text-gray-200 cursor-not-allowed"
              : "hover:bg-gray-100 text-gray-500"
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Year Picker Overlay */}
      {showYearPicker && (
        <div className="absolute left-0 right-0 top-12 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          {/* Label */}
          <div className="text-xs font-semibold text-gray-400 mb-3 pb-2 border-b border-gray-100">
            {MONTHS[month]} {year}
          </div>

          {/* Year grid - 3 columns, scrollable */}
          <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
            {YEARS.map((y) => {
              const isCurrentYear = y === today.getFullYear();
              const isSelectedYear = y === year;

              return (
                <button
                  key={y}
                  onClick={() => handleYearSelect(y)}
                  className={`
                    py-2 px-1 rounded-full text-sm font-medium transition-all text-center
                    ${isSelectedYear
                      ? "text-white font-semibold"
                      : isCurrentYear
                      ? "text-gray-800 font-semibold bg-gray-100"
                      : "text-gray-600 hover:bg-gray-100"
                    }
                  `}
                  style={isSelectedYear ? { backgroundColor: "#1a5f6a" } : {}}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;

          const selected = isSelected(day);
          const todayCell = isToday(day);
          const future = isFuture(day);

          return (
            <button
              key={day}
              onClick={() => !future && handleDayClick(day)}
              disabled={future}
              className={`
                w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm transition-all
                ${future
                  ? "text-gray-300 cursor-not-allowed"
                  : selected
                  ? "text-white font-semibold"
                  : todayCell
                  ? "text-white font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
                }
              `}
              style={
                future ? {}
                : selected ? { backgroundColor: "#1a5f6a" }
                : todayCell ? { backgroundColor: "#1a5f6a" }
                : {}
              }
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceCalendar;