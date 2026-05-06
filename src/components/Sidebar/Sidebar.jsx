import { createElement } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MonitorPlay,
  School,
  BookOpen,
  GraduationCap,
  Users,
  UserCheck,
  CalendarCheck,
  List,
  BookMarked,
  Image,
  Bell,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Education Boards", icon: MonitorPlay, path: "/education-boards" },
  { label: "Schools", icon: School, path: "/schools" },
  { label: "Classes", icon: BookOpen, path: "/classes" },
  { label: "Syllabus", icon: BookMarked, path: "/syllabus" },
  { label: "Teachers", icon: GraduationCap, path: "/teachers" },
  { label: "Parents", icon: Users, path: "/parents" },
  { label: "Students", icon: UserCheck, path: "/students" },
  { label: "Attendance", icon: CalendarCheck, path: "/attendance" },
  { label: "Subjects", icon: List, path: "/subjects" },
  { label: "Banner", icon: Image, path: "/banner" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isItemActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <aside className="w-[230px] h-screen bg-white flex flex-col pt-5 pb-6 overflow-y-auto select-none">
      {/* Logo */}
      <div className="text-center mb-5 px-4">
        <span
          className="text-[#235A6E] text-2xl tracking-[0.3px] underline underline-offset-2 decoration-[#235A6E] decoration-1"
          style={{ fontFamily: "'Harabara Mais Demo', sans-serif" }}
        >
          AiTutor
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col px-3 gap-1">
        {navItems.map(({ label, icon, path }) => {
          const isActive = isItemActive(path);

          return (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
              className={`
                flex items-center gap-3 w-full text-left
                px-[14px] py-3 rounded-[8px]
                transition-colors duration-150 border-none outline-none cursor-pointer
                ${isActive ? "bg-[#23616E]" : "bg-transparent hover:bg-[#23616E]/10"}
              `}
            >
              {createElement(icon, {
                size: 18,
                strokeWidth: 1.75,
                className: isActive ? "text-white" : "text-[#202224]",
              })}

              <span
                className={`text-[13.5px] font-medium leading-none ${
                  isActive ? "text-white" : "text-[#202224]"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
