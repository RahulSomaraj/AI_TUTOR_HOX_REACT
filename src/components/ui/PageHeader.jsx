import { Plus } from "lucide-react";

// Standard page header: title, optional subtitle/count, and an optional primary
// action button (e.g. "Add Subject").
export default function PageHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="ty-page-title">{title}</h1>
        {subtitle != null && (
          <p className="mt-4 text-[18px] leading-none tracking-[0] text-[#20242a]">
            {subtitle}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-md bg-[#155966] px-6 text-[17px] font-semibold tracking-[0] text-white transition hover:bg-[#104a55] sm:w-auto"
        >
          <Plus size={22} strokeWidth={2.2} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
