import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import { formatINR } from "../../lib/currency";
import { apiErrorMessage } from "../../lib/apiError";
import { useOutstandingSnapshot } from "../../features/dashboard/useDashboard";

const TONES = { OVERDUE: "danger", DUE: "warning", PAID: "success" };

/**
 * Replaces the old "Upcoming Tasks" panel, which listed hard-coded lesson plans
 * from the teacher app and had no admin equivalent.
 *
 * Students who owe money is the nearest thing an admin dashboard has to a task
 * list: it's real, it's sorted worst-first by the API, and every row leads
 * somewhere useful.
 */
export default function OutstandingDues() {
  const { data, isPending, isError, error } = useOutstandingSnapshot(6);

  const rows = data?.rows ?? [];

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-slate-900">Students with dues</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isPending || isError
              ? "Overdue first, then by how long they've been overdue."
              : `${data.totalStudents} student${data.totalStudents === 1 ? "" : "s"} owing ${formatINR(
                  data.totalOutstanding / 100
                )} in total.`}
          </p>
        </div>

        <Link
          to="/finance/reports"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#155966] transition hover:underline"
        >
          View all
          <ArrowRight size={14} />
        </Link>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Loading...
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiErrorMessage(
            error,
            "Couldn't load outstanding dues",
            "Fee reports aren't available on this server yet."
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Nothing outstanding — every student is settled up.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-100 text-left text-sm font-semibold text-slate-700">
                <th className="rounded-l-2xl px-5 py-4">Student</th>
                <th className="px-5 py-4">Roll No</th>
                <th className="px-5 py-4 text-right">Outstanding</th>
                <th className="px-5 py-4 text-right">Days Overdue</th>
                <th className="rounded-r-2xl px-5 py-4 text-right">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="text-sm text-slate-600">
                  <td className="border-b border-slate-100 px-5 py-5">
                    <span className="font-medium text-slate-700">{row.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{row.studentCode}</span>
                  </td>
                  <td className="border-b border-slate-100 px-5 py-5">{row.rollNo}</td>
                  <td className="border-b border-slate-100 px-5 py-5 text-right font-semibold tabular-nums text-slate-800">
                    {formatINR(row.outstanding / 100)}
                  </td>
                  <td className="border-b border-slate-100 px-5 py-5 text-right tabular-nums">
                    {/* 0 for both DUE and PAID, so a dash beats a misleading zero. */}
                    {row.daysOverdue > 0 ? row.daysOverdue : "—"}
                  </td>
                  <td className="border-b border-slate-100 px-5 py-5 text-right">
                    <StatusBadge label={row.status} tone={TONES[row.status] ?? "neutral"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
