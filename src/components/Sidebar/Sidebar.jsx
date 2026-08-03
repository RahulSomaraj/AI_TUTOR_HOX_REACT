import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MonitorPlay,
  School,
  List,
  Library,
  BookMarked,
  Image,
  Bell,
  Wallet,
  ChevronDown,
  Tag,
  Layers,
  ClipboardList,
  Coins,
  ReceiptText,
  BarChart3,
  X
} from "lucide-react";

const primaryNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Institution Management", icon: School, path: "/schools" },
];

const secondaryNavItems = [
  { label: "Banner", icon: Image, path: "/banner" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
];

// Collapsible groups. Each renders a header that navigates to its hub `path`,
// plus a chevron that expands/collapses without navigating.
const navGroups = [
  {
    label: "Curriculum Management",
    icon: Library,
    path: "/curriculum",
    items: [
      { label: "Education Boards", icon: MonitorPlay, path: "/curriculum/education-boards" },
      { label: "Subjects", icon: List, path: "/curriculum/subjects" },
      { label: "Syllabus", icon: BookMarked, path: "/curriculum/syllabus" },
    ],
  },
  {
    label: "Fee Management",
    icon: Wallet,
    path: "/finance",
    items: [
      { label: "Fee Types", icon: Tag, path: "/finance/fee-types" },
      { label: "Fee Structures", icon: Layers, path: "/finance/fee-structures" },
      { label: "Student Fee Assignment", icon: ClipboardList, path: "/finance/student-fees" },
      { label: "Fee Collection", icon: Coins, path: "/finance/collect" },
      { label: "Student Ledger", icon: ReceiptText, path: "/finance/ledger" },
      { label: "Reports", icon: BarChart3, path: "/finance/reports" },
    ],
  },
];

// Static sidebar on lg+; an off-canvas drawer (with backdrop) below lg.
// `open`/`onClose` are controlled by AdminLayout.
export default function Sidebar({ open = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Only groups the user has explicitly expanded/collapsed are stored here.
  // Anything absent falls back to "open if the current route lives in it", so
  // arriving via a deep link or breadcrumb reveals that group automatically.
  const [groupOverrides, setGroupOverrides] = useState({});

  const isItemActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

  const isGroupOpen = (path) =>
    groupOverrides[path] ?? location.pathname.startsWith(path);

  const setGroupOpen = (path, open) =>
    setGroupOverrides((current) => ({ ...current, [path]: open }));

  const go = (path) => {
    navigate(path);
    onClose?.(); // close the drawer after navigating on mobile
  }

  const renderNavItem = ({ label, icon: Icon, path }) => {
    const isActive = isItemActive(path);
    return (
      <button
        key={label}
        type="button"
        onClick={() => go(path)}
        className={`flex w-full items-center gap-3 rounded-[8px] px-[14px] py-3 text-left transition-colors duration-150 ${
          isActive ? "bg-[#23616E]" : "bg-transparent hover:bg-[#23616E]/10"
        }`}
      >
        <Icon
          size={18}
          strokeWidth={1.75}
          className={isActive ? "text-white" : "text-[#202224]"}
        />
        <span
          className={`text-[13.5px] font-medium leading-none ${
            isActive ? "text-white" : "text-[#202224]"
          }`}
        >
          {label}
        </span>
      </button>
    );
  }

  const renderNavGroup = ({ label, icon: Icon, path, items }) => {
    const isActive = isItemActive(path);
    const isOpen = isGroupOpen(path);

    return (
      <div key={path}>
        <button
          type="button"
          onClick={() => {
            setGroupOpen(path, true);
            go(path);
          }}
          className={`flex w-full items-center gap-3 rounded-[8px] px-[14px] py-3 text-left transition-colors duration-150 ${
            isActive ? "bg-[#23616E]" : "bg-transparent hover:bg-[#23616E]/10"
          }`}
        >
          <Icon
            size={18}
            strokeWidth={1.75}
            className={isActive ? "text-white" : "text-[#202224]"}
          />
          <span
            className={`text-[13.5px] font-medium leading-none ${
              isActive ? "text-white" : "text-[#202224]"
            }`}
          >
            {label}
          </span>
          <ChevronDown
            size={16}
            onClick={(e) => {
              e.stopPropagation();
              setGroupOpen(path, !isOpen);
            }}
            className={`ml-auto transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            } ${isActive ? "text-white" : "text-[#202224]"}`}
          />
        </button>

        {isOpen && (
          <div className="mt-1 flex flex-col gap-1 pl-3">
            {items.map(({ label: itemLabel, icon: ItemIcon, path: itemPath }) => {
              const itemActive = isItemActive(itemPath);
              return (
                <button
                  key={itemLabel}
                  type="button"
                  onClick={() => go(itemPath)}
                  className={`flex w-full items-center gap-3 rounded-[8px] px-[14px] py-2.5 text-left transition-colors duration-150 ${
                    itemActive ? "bg-[#23616E]" : "bg-transparent hover:bg-[#23616E]/10"
                  }`}
                >
                  <ItemIcon
                    size={16}
                    strokeWidth={1.75}
                    className={itemActive ? "text-white" : "text-[#202224]"}
                  />
                  <span
                    className={`text-[12.5px] font-medium leading-none ${
                      itemActive ? "text-white" : "text-[#202224]"
                    }`}
                  >
                    {itemLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[230px] max-w-[80%] transform flex-col overflow-y-auto bg-white pt-5 pb-6 shadow-xl transition-transform duration-200 ease-out select-none lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo + mobile close button */}
        <div className="mb-5 flex items-center justify-between px-4">
          <span
            className="text-[#235A6E] text-4xl tracking-[0.3px] underline underline-offset-2 decoration-[#235A6E] decoration-1"
            style={{ fontFamily: "'Harabara Mais Demo', sans-serif" }}
          >
            AiTutor
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#202224] transition hover:bg-[#23616E]/10 lg:hidden"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3">
          {primaryNavItems.map(renderNavItem)}
          {navGroups.map(renderNavGroup)}
          {secondaryNavItems.map(renderNavItem)}
        </nav>
      </aside>
    </>
  );
};