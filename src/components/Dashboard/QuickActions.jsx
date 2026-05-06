import { createElement } from "react";
import { CalendarDays, Megaphone, PenTool, Plus } from "lucide-react";

const actions = [
  {
    title: "Create Class",
    Icon: Plus,
    bgClass: "bg-[#2d63ea]",
  },
  {
    title: "Add Lesson",
    Icon: CalendarDays,
    bgClass: "bg-[#08ad3d]",
  },
  {
    title: "Assign Quiz",
    Icon: PenTool,
    bgClass: "bg-[linear-gradient(90deg,#8b19f3_0%,#b217ff_100%)]",
  },
  {
    title: "Send Announcement",
    Icon: Megaphone,
    bgClass: "bg-[#ff5a00]",
  },
];

export default function QuickActions() {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <h2 className="text-[20px] font-semibold text-slate-900">Quick Actions</h2>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ title, Icon, bgClass }) => (
          <button
            key={title}
            type="button"
            className={`flex min-h-[98px] flex-col items-center justify-center rounded-[18px] text-white shadow-sm transition-transform duration-150 hover:-translate-y-0.5 ${bgClass}`}
          >
            {createElement(Icon, { className: "h-6 w-6", strokeWidth: 2.2 })}
            <span className="mt-3 text-lg font-medium">{title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
