import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil } from "lucide-react";

const DAYS_HEADER = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_FULL   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL  = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const generateYears = () => {
  const cur = new Date().getFullYear();
  const years = [];
  for (let y = 2000; y <= cur; y++) years.push(y);
  return years;
};
const YEARS = generateYears();

const DatePickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  value,           
  minDate,         
  allowFuture = true,
  title = "Select date",
}) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const parseOrToday = (str) => {
    if (str) { const d = new Date(str); if (!isNaN(d)) return d; }
    return new Date();
  };

  const [viewDate,      setViewDate]      = useState(() => parseOrToday(value));
  const [selected, setSelected] = useState(value || todayStr);
  const [showYearGrid,  setShowYearGrid]  = useState(false);

  // Sync when modal reopens with a new value
  useEffect(() => {
    if (isOpen) {
      setSelected(value || todayStr);
      setViewDate(parseOrToday(value));
      setShowYearGrid(false);
    }
  }, [isOpen, value]);

  if (!isOpen) return null;

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isFutureDay = (day) => {
    if (allowFuture) return false;
    const cell = new Date(year, month, day);
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cell > todayMid;
  };

  const isBeforeMin = (day) => {
    if (!minDate) return false;
    const cell = new Date(year, month, day);
    const min  = new Date(minDate);
    min.setHours(0,0,0,0);
    return cell < min;
  };

  const isDisabled = (day) => isFutureDay(day) || isBeforeMin(day);

  const isSelectedDay = (day) => {
    if (!selected) return false;
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return ds === selected;
  };

  const isTodayDay = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const handleDayClick = (day) => {
    if (isDisabled(day)) return;
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSelected(ds);
  };

  const handleYearSelect = (y) => {
    let m = month;
    if (!allowFuture && y === today.getFullYear() && m > today.getMonth()) {
      m = today.getMonth();
    }
    setViewDate(new Date(y, m, 1));
    setShowYearGrid(false);
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => {
    if (!allowFuture && year === today.getFullYear() && month === today.getMonth()) return;
    setViewDate(new Date(year, month + 1, 1));
  };

  const nextDisabled = !allowFuture && year === today.getFullYear() && month === today.getMonth();

  // Left panel display — fall back to today if nothing selected yet
  const displayObj   = selected ? new Date(selected) : today;
  const displayDay   = DAYS_FULL[displayObj.getDay()];
  const displayMonth = MONTHS_SHORT[displayObj.getMonth()];
  const displayDate  = displayObj.getDate();

  // Build cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] overflow-hidden">
        <div className="flex">

          {/* ── Left panel ── */}
          <div className="w-44 p-5 flex flex-col gap-1" style={{ backgroundColor: "#e8f4f6" }}>
            <p className="text-xs text-gray-500 mb-2">{title}</p>
            <p className="text-3xl font-bold text-gray-800 leading-tight">
              {displayDay},&nbsp;{displayMonth}
            </p>
            <p className="text-3xl font-bold text-gray-800">{displayDate}</p>
          </div>

          {/* ── Right panel ── */}
          <div className="flex-1 p-5 relative">

            {/* Month / Year nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() => setShowYearGrid(v => !v)}
                className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                {MONTHS_FULL[month]} {year}
                {showYearGrid ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
              </button>

              <button
                onClick={nextMonth}
                disabled={nextDisabled}
                className={`p-1 rounded transition-colors ${nextDisabled ? "text-gray-200 cursor-not-allowed" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Year grid overlay */}
            {showYearGrid && (
              <div className="absolute left-0 right-0 top-14 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-4 mx-4">
                <div className="text-xs text-gray-400 mb-2 pb-1 border-b border-gray-100">
                  {MONTHS_FULL[month]} {year}
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                  {YEARS.map(y => {
                    const isSel = y === year;
                    const isCur = y === today.getFullYear();
                    return (
                      <button
                        key={y}
                        onClick={() => handleYearSelect(y)}
                        className={`py-1.5 px-1 rounded-full text-sm font-medium text-center transition-all
                          ${isSel ? "text-white" : isCur ? "bg-gray-100 text-gray-800 font-semibold" : "text-gray-600 hover:bg-gray-100"}`}
                        style={isSel ? { backgroundColor: "#1a5f6a" } : {}}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_HEADER.map((d, i) => (
                <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} />;
                const disabled = isDisabled(day);
                const sel      = isSelectedDay(day);
                const tod      = isTodayDay(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    disabled={disabled}
                    className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm transition-all
                      ${disabled ? "text-gray-300 cursor-not-allowed"
                        : sel    ? "text-white font-semibold"
                        : tod    ? "text-white font-semibold"
                        : "text-gray-600 hover:bg-gray-100"}`}
                    style={disabled ? {} : sel ? { backgroundColor: "#1a5f6a" } : tod ? { backgroundColor: "#1a5f6a" } : {}}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <Pencil size={15} />
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (selected) onConfirm(selected); }}
                  disabled={!selected}
                  className="px-4 py-1.5 text-sm font-semibold rounded transition-colors disabled:opacity-40"
                  style={{ color: "#1a5f6a" }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;