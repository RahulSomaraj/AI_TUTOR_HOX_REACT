import { BarChart3, Loader2, Table2 } from "lucide-react";
import { useState } from "react";

/**
 * Card shell for a chart, with a chart/table toggle.
 *
 * The table view isn't decoration: a chart that only exposes its values through
 * hover gates them behind a pointer. Every chart here ships the same numbers as
 * a table so they're reachable by keyboard, by screen reader, and in print.
 *
 * `refreshing` dims the body rather than swapping in a skeleton — a skeleton on
 * every refetch causes a layout jump and loses the reader's place.
 */
export default function ChartCard({
  title,
  subtitle,
  note,
  actions,
  loading = false,
  refreshing = false,
  error = "",
  isEmpty = false,
  emptyLabel = "No data for this period.",
  table = null,
  children,
}) {
  const [view, setView] = useState("chart");

  return (
    <section className="rounded-[18px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-[#20242a]">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-[#5b626a]">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {table && (
            <div className="flex rounded-lg border border-[#e3e9ec] p-0.5">
              {[
                { key: "chart", label: "Chart", Icon: BarChart3 },
                { key: "table", label: "Table", Icon: Table2 },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  title={`${label} view`}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    view === key
                      ? "bg-[#155966] text-white"
                      : "text-[#5b626a] hover:bg-[#f1f6f7]"
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {note && (
        <p className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[12.5px] leading-snug text-sky-900">
          {note}
        </p>
      )}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-[#5b626a]">
          <Loader2 size={18} className="animate-spin" />
          Loading...
        </div>
      ) : isEmpty ? (
        <div className="py-14 text-center text-sm text-[#5b626a]">{emptyLabel}</div>
      ) : (
        <div className={refreshing ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {view === "table" && table ? table : children}
        </div>
      )}
    </section>
  );
}
