import { Link } from "react-router-dom";
import { BarChart3, Coins, GraduationCap, School } from "lucide-react";

// These were "Create Class / Add Lesson / Assign Quiz / Send Announcement" —
// teacher-app actions, rendered as buttons with no handler, so none of them did
// anything. Replaced with the routes an admin actually starts their day on.
const actions = [
  {
    title: "Add Institution",
    hint: "Register a school",
    to: "/schools",
    Icon: School,
    bgClass: "bg-[#155966]",
  },
  {
    title: "Add Student",
    hint: "Enrol and verify",
    to: "/students",
    Icon: GraduationCap,
    bgClass: "bg-[#1f7a5c]",
  },
  {
    title: "Collect Fee",
    hint: "Record a payment",
    to: "/finance/collect",
    Icon: Coins,
    bgClass: "bg-[#8a5a13]",
  },
  {
    title: "Fee Reports",
    hint: "Collection & dues",
    to: "/finance/reports",
    Icon: BarChart3,
    bgClass: "bg-[#3f3d8f]",
  },
];

export default function QuickActions() {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <h2 className="text-[20px] font-semibold text-slate-900">Quick Actions</h2>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ title, hint, to, Icon, bgClass }) => (
          <Link
            key={title}
            to={to}
            className={`flex min-h-[98px] flex-col items-center justify-center rounded-[18px] px-4 text-center text-white shadow-sm transition-transform duration-150 hover:-translate-y-0.5 ${bgClass}`}
          >
            <Icon className="h-6 w-6" strokeWidth={2.2} />
            <span className="mt-3 text-lg font-medium leading-tight">{title}</span>
            <span className="mt-0.5 text-xs text-white/75">{hint}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
