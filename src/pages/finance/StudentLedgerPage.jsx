import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer, X } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Breadcrumb from "../../components/ui/Breadcrumb";
import PaginationControls from "../../components/PaginationControls";
import SchoolScopeSelect from "../../components/Finance/SchoolScopeSelect";
import StudentScopeSelect from "../../components/Finance/StudentScopeSelect";
import LedgerTable from "../../components/Finance/LedgerTable";
import { fetchClasses } from "../../api/services/grades";
import { extractList, safeId } from "../../api/normalize";
import { apiErrorMessage } from "../../lib/apiError";
import { formatINR } from "../../lib/currency";
import { downloadCsv, toCsv } from "../../lib/csv";
import { fromPaise } from "../../lib/money";
import {
  fetchFullStatement,
  useLedgerQuery,
  useStatementQuery,
} from "../../features/finance/useLedger";

const LEDGER_UNAVAILABLE =
  "The student ledger isn't available on this server yet — the endpoint returned 404. It's built but not deployed.";

function apiError(err, fallback) {
  return apiErrorMessage(err, fallback, LEDGER_UNAVAILABLE);
}

function gradeLabel(grade) {
  return grade?.aliasName || grade?.divisionName || `Grade ${grade?.id}`;
}

function formatDay(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function SummaryCard({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: "bg-[#f4f8f9] text-[#20242a]",
    warning: "bg-amber-50 text-amber-800",
    success: "bg-emerald-50 text-emerald-800",
    info: "bg-sky-50 text-sky-800",
  };

  return (
    <div className={`rounded-[14px] px-4 py-4 ${tones[tone] ?? tones.neutral}`}>
      <p className="text-xs uppercase tracking-[0.5px] opacity-70">{label}</p>
      <p className="mt-1 text-[20px] font-semibold">{value}</p>
    </div>
  );
}

const FIELD_CLASS =
  "h-[40px] w-full rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15 disabled:bg-[#f8fafb] disabled:text-[#9aa3aa]";

// Stable identity so the pagination memo below doesn't see a fresh array — and
// re-slice — on every single render while the query is still loading.
const NO_ROWS = [];

export default function StudentLedgerPage() {
  const [schoolId, setSchoolId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [student, setStudent] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const studentId = student?.id ?? "";
  const hasRange = Boolean(from || to);

  const gradeOptionsQuery = useQuery({
    queryKey: ["grades", "options", schoolId],
    queryFn: async () => {
      const response = await fetchClasses({ schoolId, limit: 50 });
      return extractList(response, ["grades"]);
    },
    enabled: Boolean(schoolId),
  });

  const statementQuery = useStatementQuery(studentId, { from, to, page, limit: pageSize });

  // The statement's closing balance is the balance at the *end of the range*,
  // which is not the student's current position once a range is applied. Fetch
  // the unfiltered ledger only in that case, so the header can show what's
  // actually owed today rather than a historical figure.
  const ledgerQuery = useLedgerQuery(hasRange ? studentId : "");

  // One page of rows. Aggregates below still describe the whole period — the
  // API guarantees that, so the header stays correct on any page.
  const rows = statementQuery.data?.rows ?? NO_ROWS;
  const summary = statementQuery.data?.summary;
  const pagination = statementQuery.data?.pagination;

  const currentBalancePaise = hasRange
    ? ledgerQuery.data?.summary?.balance
    : summary?.closingBalance;

  const loadError = statementQuery.isError
    ? apiError(statementQuery.error, "Failed to load the student ledger")
    : "";

  function handleChangeSchool(value) {
    setSchoolId(value);
    setGradeId("");
    setStudent(null);
    setPage(1);
  }

  function handleChangeStudent(next) {
    setStudent(next);
    setPage(1);
  }

  function clearRange() {
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function handleDownloadCsv() {
    setExporting(true);
    setExportError("");
    let full;
    try {
      // Re-fetch without paging. Exporting `rows` would silently ship whichever
      // page happens to be on screen, which looks like a complete statement and
      // isn't — the worst kind of wrong for a financial document.
      full = await fetchFullStatement(studentId, { from, to });
    } catch (err) {
      setExportError(apiError(err, "Couldn't build the statement for download"));
      setExporting(false);
      return;
    } finally {
      setExporting(false);
    }

    const periodLabel =
      [formatDay(full.summary?.from) ?? "Start", formatDay(full.summary?.to) ?? "Today"].join(
        " to "
      );

    // Money goes out as the plain "1500.00" shape rather than the formatted
    // "₹1,500.00" — a spreadsheet has to be able to sum this column.
    const body = full.rows.map((row) => [
      formatDay(row.date) ?? "",
      row.description,
      row.typeLabel,
      row.credit == null ? "" : fromPaise(row.credit),
      row.debit == null ? "" : fromPaise(row.debit),
      fromPaise(row.balance),
    ]);

    const meta = [
      [],
      ["Student", student?.name ?? ""],
      ["Student Code", student?.studentCode ?? ""],
      ["Period", periodLabel],
      ["Opening Balance", fromPaise(full.summary?.openingBalance ?? 0)],
      ["Total Charged", fromPaise(full.summary?.totalCredit ?? 0)],
      ["Total Paid / Adjusted", fromPaise(full.summary?.totalDebit ?? 0)],
      ["Closing Balance", fromPaise(full.summary?.closingBalance ?? 0)],
    ];

    const csv = toCsv(
      ["Date", "Description", "Type", "Credit (Charged)", "Debit (Paid)", "Balance"],
      [...body, ...meta]
    );

    const safeName = (student?.studentCode || student?.name || "student").replace(/[^\w-]+/g, "-");
    downloadCsv(`statement-${safeName}.csv`, csv);
  }

  const totalCount = pagination?.totalCount ?? rows.length;
  const currentPage = pagination?.currentPage ?? page;
  const startRow = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="ty-page-shell">
      {/*
        Print isolation — the statement is the only thing that belongs on paper.
        Same approach as the payment receipt: hide everything, re-show this
        subtree, so the layout components don't need to know a print mode exists.
      */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ledger-print-area, #ledger-print-area * { visibility: visible !important; }
          #ledger-print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important;
          }
          .ledger-no-print { display: none !important; }
        }
      `}</style>

      <div className="ledger-no-print">
        <Breadcrumb
          items={[{ label: "Fee Management", path: "/finance" }, { label: "Student Ledger" }]}
        />
        <PageHeader
          title="Student Ledger"
          subtitle={
            student
              ? `${student.name}${student.studentCode ? ` · ${student.studentCode}` : ""}`
              : "Read-only account statement for a student"
          }
        />

        <div className="mb-6 grid gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 md:grid-cols-3">
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">School *</span>
            <SchoolScopeSelect includeAll={false} value={schoolId} onChange={handleChangeSchool} />
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Class</span>
            <select
              value={gradeId}
              onChange={(event) => {
                setGradeId(event.target.value);
                setStudent(null);
              }}
              disabled={!schoolId || gradeOptionsQuery.isPending}
              className={FIELD_CLASS}
            >
              <option value="">{schoolId ? "All classes" : "Select a school first"}</option>
              {(gradeOptionsQuery.data ?? []).map((grade) => (
                <option key={grade.id} value={safeId(grade.id)}>
                  {gradeLabel(grade)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Student *</span>
            <StudentScopeSelect
              schoolId={schoolId}
              gradeId={gradeId}
              value={student}
              onChange={handleChangeStudent}
            />
          </div>
        </div>
      </div>

      {!student ? (
        <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)]">
          <div className="py-16 text-center text-sm text-[#5b626a]">
            Select a school and student to view their ledger.
          </div>
        </section>
      ) : (
        <>
          <div className="ledger-no-print mb-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label={hasRange ? "Balance today" : "Closing balance"}
              value={formatINR((currentBalancePaise ?? 0) / 100)}
              tone={(currentBalancePaise ?? 0) > 0 ? "warning" : "success"}
            />
            <SummaryCard
              label="Charged in period"
              value={formatINR((summary?.totalCredit ?? 0) / 100)}
            />
            <SummaryCard
              label="Paid / adjusted in period"
              value={formatINR((summary?.totalDebit ?? 0) / 100)}
            />
          </div>

          <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
            <div className="ledger-no-print mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">From</span>
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setPage(1);
                    }}
                    className={`${FIELD_CLASS} w-[170px]`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">To</span>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setPage(1);
                    }}
                    className={`${FIELD_CLASS} w-[170px]`}
                  />
                </label>
                {hasRange && (
                  <button
                    type="button"
                    onClick={clearRange}
                    className="inline-flex h-[40px] items-center gap-1.5 rounded-[12px] border border-[#c7cbd1] px-4 text-sm font-medium text-[#5b626a] transition hover:bg-slate-50"
                  >
                    <X size={14} />
                    Clear
                  </button>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={rows.length === 0 || exporting}
                    title="Downloads the whole period, not just this page"
                    className="inline-flex items-center gap-2 rounded border border-[#155966] px-4 py-2.5 text-sm font-semibold text-[#155966] transition hover:bg-[#eef6f9] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exporting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {exporting ? "Preparing..." : "Download CSV"}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={rows.length === 0}
                    className="inline-flex items-center gap-2 rounded bg-[#155966] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#104a55] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Printer size={16} />
                    Print / Save as PDF
                  </button>
                </div>

                {/* Rows are paged server-side now, so print only sees what's on
                    screen. Say so rather than let someone file a one-page
                    statement believing it's complete. */}
                {(pagination?.totalPages ?? 1) > 1 && (
                  <p className="text-[11.5px] text-[#8b939b]">
                    Print covers this page only — use CSV for the full statement.
                  </p>
                )}
              </div>
            </div>

            {exportError && (
              <div className="ledger-no-print mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {exportError}
              </div>
            )}

            <div id="ledger-print-area">
              <div className="mb-4">
                <h2 className="text-[20px] font-semibold text-[#20242a]">Account Statement</h2>
                <p className="mt-0.5 text-sm text-[#5b626a]">
                  {student.name}
                  {student.studentCode ? ` · ${student.studentCode}` : ""}
                  {" — "}
                  {formatDay(summary?.from) ?? "Beginning"} to {formatDay(summary?.to) ?? "today"}
                </p>
              </div>

              <LedgerTable
                rows={rows}
                openingBalance={summary?.openingBalance ?? 0}
                closingBalance={summary?.closingBalance ?? 0}
                totalCredit={summary?.totalCredit ?? 0}
                totalDebit={summary?.totalDebit ?? 0}
                showOpeningRow={hasRange}
                loading={statementQuery.isPending}
                error={loadError}
                emptyLabel={
                  hasRange
                    ? "No ledger entries in this period."
                    : "This student has no ledger entries yet."
                }
              />
            </div>

            {!statementQuery.isPending && !loadError && totalCount > pageSize && (
              <PaginationControls
                className="ledger-no-print mt-6"
                rangeLabel={`${startRow}-${endRow} of ${totalCount}`}
                currentPage={currentPage}
                totalPages={pagination?.totalPages ?? 1}
                hasPrev={pagination?.hasPrev ?? currentPage > 1}
                hasNext={pagination?.hasNext ?? false}
                onPrev={() => setPage((value) => Math.max(value - 1, 1))}
                onNext={() =>
                  setPage((value) => Math.min(value + 1, pagination?.totalPages || value + 1))
                }
                rowsPerPage={pageSize}
                rowsPerPageOptions={[20, 50, 100]}
                onRowsPerPageChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
              />
            )}

            <p className="ledger-no-print mt-4 text-xs text-[#8b939b]">
              Credit increases what the student owes; debit reduces it. Note that a refund is
              recorded as a debit — it lowers the outstanding balance rather than reversing the
              original payment, which stays in the history above.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
