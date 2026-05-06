const tasks = [
  {
    task: "Prepare Maths Lesson",
    className: "8th Std",
    dateTime: "12-09-2025",
    status: "Completed",
  },
  {
    task: "Science Quiz",
    className: "10th Std",
    dateTime: "15-09-2025",
    status: "Pending",
  },
  {
    task: "English Chapter 5",
    className: "10th Std",
    dateTime: "17-09-2025",
    status: "Pending",
  },
  {
    task: "Maths Quiz",
    className: "9th Std",
    dateTime: "19-09-2025",
    status: "Pending",
  },
  {
    task: "English Chapter 5",
    className: "10th Std",
    dateTime: "21-09-2025",
    status: "Pending",
  },
  {
    task: "Chemistry Quiz",
    className: "9th Std",
    dateTime: "23-09-2025",
    status: "Pending",
  },
  {
    task: "Maths Chapter 7",
    className: "8th Std",
    dateTime: "17-09-2025",
    status: "Pending",
  },
];

const statusClasses = {
  Completed: "bg-[#11b8a5] text-white",
  Pending: "bg-[#ffbe2e] text-white",
};

export default function UpcomingTasks() {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[20px] font-semibold text-slate-900">Upcoming Tasks</h2>

        <select
          aria-label="Filter tasks"
          defaultValue="All"
          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-500 outline-none transition focus:border-slate-300"
        >
          <option>All</option>
          <option>Completed</option>
          <option>Pending</option>
        </select>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-100 text-left text-sm font-semibold text-slate-700">
              <th className="rounded-l-2xl px-5 py-4">Task</th>
              <th className="px-5 py-4">Class</th>
              <th className="px-5 py-4">Date - Time</th>
              <th className="rounded-r-2xl px-5 py-4 text-right">Status</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map(({ task, className, dateTime, status }) => (
              <tr key={`${task}-${className}-${dateTime}`} className="text-sm text-slate-600">
                <td className="border-b border-slate-100 px-5 py-6 font-medium text-slate-700">
                  {task}
                </td>
                <td className="border-b border-slate-100 px-5 py-6">{className}</td>
                <td className="border-b border-slate-100 px-5 py-6">{dateTime}</td>
                <td className="border-b border-slate-100 px-5 py-6 text-right">
                  <span
                    className={`inline-flex min-w-[90px] items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold ${statusClasses[status]}`}
                  >
                    {status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
