import { ChevronRight, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Navigation trail shown above a page's header.
 * `items`: [{ label, path? }] — the trailing item (or any item without a
 * `path`) renders as plain text; everything else is a clickable crumb.
 * "Dashboard" is always the implicit first crumb, so callers only pass the
 * rest of their own trail.
 */
export default function Breadcrumb({ items = [] }) {
  const navigate = useNavigate();
  const crumbs = [{ label: "Dashboard", path: "/" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const clickable = crumb.path && !isLast;

        return (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight size={14} className="shrink-0 text-[#9aa3aa]" />}
            {clickable ? (
              <button
                type="button"
                onClick={() => navigate(crumb.path)}
                className="flex items-center gap-1 text-[#5b626a] transition hover:text-[#155966] hover:underline"
              >
                {index === 0 && <Home size={14} className="shrink-0" />}
                {crumb.label}
              </button>
            ) : (
              <span
                className={isLast ? "font-medium text-[#20242a]" : "text-[#5b626a]"}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
