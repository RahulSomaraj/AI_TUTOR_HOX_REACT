import { useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import useOutsideClick from "../../hooks/useOutsideClick";

// Row actions "kebab" menu with Edit/Delete. Pass only the handlers you need;
// extra items can be supplied via `extraItems` = [{ label, icon, onClick, danger }].
export default function ActionMenu({ label = "row", onEdit, onDelete, extraItems = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  const run = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${label}`}
      >
        <MoreHorizontal size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          {onEdit && (
            <button
              type="button"
              onClick={run(onEdit)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#20242a] transition hover:bg-[#f5fafc]"
            >
              <Pencil size={14} className="text-[#155966]" />
              Edit
            </button>
          )}
          {extraItems.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={run(item.onClick)}
              className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition hover:bg-[#f5fafc] ${
                item.danger ? "text-[#d14343] hover:bg-[#fff5f5]" : "text-[#20242a]"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {onDelete && (
            <button
              type="button"
              onClick={run(onDelete)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#d14343] transition hover:bg-[#fff5f5]"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
