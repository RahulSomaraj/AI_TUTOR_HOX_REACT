import { Check } from "lucide-react";

/**
 * Horizontal progress rail for a linear wizard.
 * `steps`: [{ key, label }] · `current`: 0-based index of the active step.
 * `onStepClick` is optional — pass it to allow jumping back to a completed
 * step; forward steps are never clickable, since later steps depend on choices
 * made in earlier ones.
 */
export default function StepIndicator({ steps, current, onStepClick }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-y-3">
      {steps.map((step, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        const canJump = Boolean(onStepClick) && isDone;

        return (
          <li key={step.key} className="flex items-center">
            <button
              type="button"
              onClick={canJump ? () => onStepClick(index) : undefined}
              disabled={!canJump}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition ${
                canJump ? "cursor-pointer hover:bg-[#eef6f9]" : "cursor-default"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  isDone
                    ? "bg-[#155966] text-white"
                    : isCurrent
                      ? "bg-[#155966] text-white ring-4 ring-[#155966]/15"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? <Check size={14} strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={`whitespace-nowrap text-sm ${
                  isCurrent
                    ? "font-semibold text-[#20242a]"
                    : isDone
                      ? "font-medium text-[#155966]"
                      : "text-[#9aa3aa]"
                }`}
              >
                {step.label}
              </span>
            </button>

            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`mx-2 h-px w-6 sm:w-10 ${isDone ? "bg-[#155966]" : "bg-slate-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
