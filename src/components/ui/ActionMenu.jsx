import { useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import useOutsideClick from "../../hooks/useOutsideClick";

// Row actions "kebab" menu with Edit/Delete. Pass only the handlers you need;
// extra items can be supplied via `extraItems` = [{ label, icon, onClick, danger }].
export default function ActionMenu({ label = "row", onEdit, onDelete, extraItems = [] }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const buttonRef = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const MENU_WIDTH = 144;
      const MENU_HEIGHT = 100;
      const flipUp = rect.bottom + MENU_HEIGHT > window.innerHeight;
      setCoords({
        top: flipUp ? rect.top - MENU_HEIGHT - 8 : rect.bottom + 8,
        left: rect.right - MENU_WIDTH,
      });
    }
    setOpen(true);
  };

  const run = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#20242a] transition hover:bg-[#eef6f9]"
        aria-label={`Open actions for ${label}`}
      >
        <MoreHorizontal size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <div 
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-50 w-36 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg"
        >
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
