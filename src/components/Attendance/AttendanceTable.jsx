const statusConfig = {
  present: { label: "Present",  className: "bg-green-100 text-green-700 border border-green-200"   },
  absent:  { label: "Absent",   className: "bg-red-100 text-red-700 border border-red-200"         },
  late:    { label: "Late",     className: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
  leave:   { label: "On Leave", className: "bg-blue-100 text-blue-700 border border-blue-200"      },
};

const AvatarInitials = ({ name }) => {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const colors   = ["bg-teal-500","bg-blue-500","bg-purple-500","bg-pink-500","bg-indigo-500","bg-orange-500"];
  const color    = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full ${color} text-white text-xs font-semibold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
};

const SkeletonRow = () => (
  <tr>
    {[...Array(4)].map((_, i) => (
      <td key={i} className="px-5 py-3.5">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      </td>
    ))}
  </tr>
);

const AttendanceTable = ({ students, selectedDate, loading, type }) => {
  const dateStr = selectedDate || new Date().toISOString().split("T")[0];

  const isTeacher = type === "teacher";

  //  Dynamic column headers based on type (Student vs Teacher)
  const columns = [
    isTeacher ? "Teacher"  : "Student",
    isTeacher ? "Emp. ID"  : "Roll No.",
    isTeacher ? "Designation" : "Class",
    "Status",
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        {/* Title reflects current type */}
        <h2 className="text-base font-semibold text-gray-800">
          {isTeacher ? "Teachers" : "Students"}
        </h2>
      </div>

      {loading ? (
        <table className="w-full">
          <tbody className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      ) : students.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          No records found
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.map((student) => {
              const status     = student.attendance[dateStr];
              const statusInfo = statusConfig[status] ?? null;
              return (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  {/* Name + Avatar */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarInitials name={student.name} />
                      <span className="text-sm font-medium text-gray-800">{student.name}</span>
                    </div>
                  </td>
                  {/* Roll No. / Emp. ID */}
                  <td className="px-5 py-3.5 text-sm text-gray-500">{student.rollNo}</td>
                  {/* Class / Designation */}
                  <td className="px-5 py-3.5 text-sm text-gray-500">{student.class}</td>
                  {/* Status badge */}
                  <td className="px-5 py-3.5">
                    {statusInfo ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AttendanceTable;