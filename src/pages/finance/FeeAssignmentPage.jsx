import { useState } from "react";
import { School, UserRound } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Breadcrumb from "../../components/ui/Breadcrumb";
import StudentFeeAssignmentPanel from "../../components/Finance/StudentFeeAssignmentPanel";
import ClassFeeAssignmentPanel from "../../components/Finance/ClassFeeAssignmentPanel";

const MODES = [
  {
    key: "student",
    label: "Assign Fee To a Student",
    hint: "Pick a fee, then tick individual students.",
    icon: UserRound,
  },
  {
    key: "class",
    label: "Assign Fee To a Class",
    hint: "Attach a fee to a whole class at once.",
    icon: School,
  },
];

/**
 * Fee assignment has two genuinely different shapes, and conflating them was
 * the original gap: a fee can be attached to one student at a time, or to a
 * grade as a whole (a ClassFee). Neither is a special case of the other, so
 * they get a tab each rather than a mode toggle buried inside one form.
 *
 * Nothing is selected on load — each panel drives its own school/class
 * scoping, and picking a tab first avoids rendering two sets of pickers.
 */
export default function FeeAssignmentPage() {
  const [mode, setMode] = useState(null);

  return (
    <div className="ty-page-shell">
      <Breadcrumb
        items={[{ label: "Fee Management", path: "/finance" }, { label: "Fee Assignment" }]}
      />
      <PageHeader
        title="Fee Assignment"
        subtitle="Attach a priced fee to a class, or to individual students."
      />

      <div
        role="tablist"
        aria-label="Assignment mode"
        className="mb-6 flex flex-col gap-3 sm:flex-row"
      >
        {MODES.map(({ key, label, hint, icon: Icon }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(key)}
              className={`group flex flex-1 items-start gap-4 rounded-[18px] border px-5 py-4 text-left transition ${
                active
                  ? "border-[#155966] bg-white shadow-[0_8px_24px_rgba(18,53,64,0.08)]"
                  : "border-[#e3e9ec] bg-white/70 hover:border-[#155966]/50 hover:bg-white"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition ${
                  active
                    ? "bg-[#155966] text-white"
                    : "bg-[#155966]/10 text-[#155966] group-hover:bg-[#155966] group-hover:text-white"
                }`}
              >
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[15px] font-semibold ${
                    active ? "text-[#155966]" : "text-[#202224]"
                  }`}
                >
                  {label}
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-gray-500">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {mode === "student" && <StudentFeeAssignmentPanel />}
      {mode === "class" && <ClassFeeAssignmentPanel />}
    </div>
  );
}
