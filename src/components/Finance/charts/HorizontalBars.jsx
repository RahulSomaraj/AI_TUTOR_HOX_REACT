import { formatINR } from "../../../lib/currency";

// Single-series magnitude comparison, so one hue for every bar — not a
// value-ramp. Shading each bar by its own length would double-encode the length
// as colour and burn the only free channel on information the bar already shows.
const BAR = "#155966";
const TRACK = "#eef3f4";

// Marks stay thin and the row keeps air around them; ink belongs to the data.
const BAR_HEIGHT = 14;
const ROW_HEIGHT = 38;

/**
 * Horizontal bars, drawn in HTML rather than SVG.
 *
 * The category labels are long ("Bank Transfer", "Government Girls Vocational
 * HSS") and the values sit at the bar tip, so text flow does a better job here
 * than manual SVG text placement — nothing can clip or overlap, and the labels
 * stay selectable and screen-reader friendly.
 *
 * `formatValue` lets callers render money or plain counts.
 */
export default function HorizontalBars({
  rows = [],
  formatValue = (paise) => formatINR(paise / 100),
  secondary = () => "",
  maxRows = 8,
}) {
  const shown = rows.slice(0, maxRows);
  const hidden = rows.length - shown.length;
  // Scale to the largest bar, not the total — this compares magnitudes; it is
  // not a part-to-whole chart.
  const max = Math.max(...shown.map((row) => row.value), 0);

  return (
    <div>
      <ul className="flex flex-col">
        {shown.map((row) => {
          const pct = max > 0 ? Math.max((row.value / max) * 100, row.value > 0 ? 1.5 : 0) : 0;
          const sub = secondary(row);

          return (
            <li
              key={row.key}
              style={{ minHeight: ROW_HEIGHT }}
              className="group flex flex-col justify-center gap-1 py-1.5"
              title={`${row.label}: ${formatValue(row.value)}${sub ? ` · ${sub}` : ""}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] font-medium text-[#2a2d32]">
                  {row.label}
                  {row.isUnassigned && (
                    <span className="ml-1.5 text-[11px] font-normal text-[#8b939b]">
                      no class assigned
                    </span>
                  )}
                </span>
                {/* Every bar carries its own value, so nothing is gated behind
                    hover — the table view is the belt-and-braces twin. */}
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#20242a]">
                  {formatValue(row.value)}
                </span>
              </div>

              <div
                className="relative w-full overflow-hidden rounded-full"
                style={{ height: BAR_HEIGHT, backgroundColor: TRACK }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${pct}%`, backgroundColor: BAR }}
                />
              </div>

              {sub && <span className="text-[11.5px] text-[#8b939b]">{sub}</span>}
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <p className="mt-3 border-t border-[#eef0f2] pt-3 text-[12px] text-[#8b939b]">
          {hidden} more not shown — switch to the table view for the full list.
        </p>
      )}
    </div>
  );
}
