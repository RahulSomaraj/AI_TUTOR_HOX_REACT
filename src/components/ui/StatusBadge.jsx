const TONES = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
};

/**
 * Small pill for a row/record status. `tone` picks the palette; the caller
 * decides the semantics, since "active" is good in one table and irrelevant in
 * another.
 */
export default function StatusBadge({ label, tone = "neutral", className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        TONES[tone] ?? TONES.neutral
      } ${className}`}
    >
      {label}
    </span>
  );
}
