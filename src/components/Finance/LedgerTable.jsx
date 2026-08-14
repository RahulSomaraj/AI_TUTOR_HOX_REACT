import { Loader2 } from "lucide-react";
import { formatINR } from "../../lib/currency";

/**
 * Running-balance statement table.
 *
 * Not built on `DataTable` — that component has no concept of a footer row or a
 * leading opening-balance row, and both are load-bearing here: a statement
 * whose columns don't foot to a closing balance can't be used for the thing
 * statements are for. Styling deliberately mirrors DataTable so the two read as
 * one system.
 *
 * ⚠️ Column naming follows the backend, which is inverted from conventional
 * receivable bookkeeping: here CREDIT means *charged* (outstanding goes up) and
 * DEBIT means *paid* (outstanding goes down). The sub-labels exist so nobody
 * reads the columns the other way round.
 */

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Money({ paise, tone = "default", bold = false }) {
  if (paise === null || paise === undefined) {
    return <span className="text-[#c7cbd1]">—</span>;
  }

  const tones = {
    default: "text-[#2a2d32]",
    credit: "text-amber-700",
    debit: "text-emerald-700",
    negative: "text-sky-700",
  };

  return (
    <span className={`${tones[tone] ?? tones.default} ${bold ? "font-semibold" : ""}`}>
      {formatINR(paise / 100)}
    </span>
  );
}

export default function LedgerTable({
  rows = [],
  openingBalance = 0,
  closingBalance = 0,
  totalCredit = 0,
  totalDebit = 0,
  showOpeningRow = false,
  // Rows are paged server-side, so numbering has to continue across pages.
  startIndex = 0,
  loading = false,
  error = "",
  emptyLabel = "No ledger entries in this period.",
}) {
  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-[#5b626a]">
        <Loader2 size={22} className="mx-auto animate-spin text-[#155966]" />
        <p className="mt-3">Loading statement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const headerCell = "px-3 py-4 text-[15px] font-medium text-[#16191d]";
  const bodyCell = "px-3 py-4 text-[15px] text-[#2a2d32]";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: 860 }}>
        <thead>
          <tr className="border-b border-[#edf0f2]">
            <th className={`${headerCell} w-12 text-right`}>#</th>
            <th className={`${headerCell} text-left`}>Date</th>
            <th className={`${headerCell} text-left`}>Description</th>
            <th className={`${headerCell} text-left`}>Type</th>
            <th className={`${headerCell} text-right`}>
              Credit
              <span className="block text-xs font-normal text-[#8b939b]">Charged</span>
            </th>
            <th className={`${headerCell} text-right`}>
              Debit
              <span className="block text-xs font-normal text-[#8b939b]">Paid / adjusted</span>
            </th>
            <th className={`${headerCell} text-right`}>Balance</th>
          </tr>
        </thead>

        <tbody>
          {showOpeningRow && (
            <tr className="border-b border-[#eef0f2] bg-[#f8fafb]">
              {/* Not a numbered entry — it's the balance carried in. */}
              <td className={`${bodyCell} w-12`} />
              <td className={bodyCell}>—</td>
              <td className={`${bodyCell} italic text-[#5b626a]`} colSpan={2}>
                Opening balance
              </td>
              <td className={`${bodyCell} text-right`}>—</td>
              <td className={`${bodyCell} text-right`}>—</td>
              <td className={`${bodyCell} text-right`}>
                <Money paise={openingBalance} tone={openingBalance < 0 ? "negative" : "default"} />
              </td>
            </tr>
          )}

          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-16 text-center text-sm text-[#5b626a]">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.key} className="border-b border-[#eef0f2]">
                <td className={`${bodyCell} w-12 text-right tabular-nums text-[#9aa3aa]`}>
                  {startIndex + index + 1}
                </td>
                <td className={`${bodyCell} whitespace-nowrap`}>{formatDate(row.date)}</td>
                <td className={bodyCell}>{row.description}</td>
                <td className={`${bodyCell} whitespace-nowrap text-[#5b626a]`}>{row.typeLabel}</td>
                <td className={`${bodyCell} text-right`}>
                  <Money paise={row.credit} tone="credit" />
                </td>
                <td className={`${bodyCell} text-right`}>
                  <Money paise={row.debit} tone="debit" />
                </td>
                <td className={`${bodyCell} text-right`}>
                  <Money paise={row.balance} tone={row.balance < 0 ? "negative" : "default"} />
                </td>
              </tr>
            ))
          )}
        </tbody>

        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-[#dde3e6] bg-[#f4f8f9]">
              <td className={`${bodyCell} font-semibold text-[#20242a]`} colSpan={4}>
                Closing balance
              </td>
              <td className={`${bodyCell} text-right`}>
                <Money paise={totalCredit} tone="credit" bold />
              </td>
              <td className={`${bodyCell} text-right`}>
                <Money paise={totalDebit} tone="debit" bold />
              </td>
              <td className={`${bodyCell} text-right`}>
                <Money
                  paise={closingBalance}
                  tone={closingBalance < 0 ? "negative" : "default"}
                  bold
                />
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
