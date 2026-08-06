import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/ui/PageHeader";
import Breadcrumb from "../../components/ui/Breadcrumb";
import DataTable from "../../components/ui/DataTable";
import StatusBadge from "../../components/ui/StatusBadge";
import PaginationControls from "../../components/PaginationControls";
import SchoolScopeSelect from "../../components/Finance/SchoolScopeSelect";
import ChartCard from "../../components/Finance/charts/ChartCard";
import HorizontalBars from "../../components/Finance/charts/HorizontalBars";
import TrendChart from "../../components/Finance/charts/TrendChart";
import { fetchClasses } from "../../api/services/grades";
import { extractList, safeId } from "../../api/normalize";
import { apiErrorMessage } from "../../lib/apiError";
import { formatINR } from "../../lib/currency";
import {
  useClassWiseQuery,
  useCollectionTrendQuery,
  useDueStudentsQuery,
  useFeeTypeReportQuery,
} from "../../features/finance/useReports";

const REPORTS_UNAVAILABLE =
  "Fee reports aren't available on this server yet — the endpoints returned 404.";

const DUE_PAGE_SIZE = 10;

const STATUS_TONES = { OVERDUE: "danger", DUE: "warning", PAID: "success" };

const FIELD_CLASS =
  "h-[40px] w-full rounded-[12px] border border-[#c7cbd1] bg-white px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15 disabled:bg-[#f8fafb] disabled:text-[#9aa3aa]";

function apiError(err, fallback) {
  return apiErrorMessage(err, fallback, REPORTS_UNAVAILABLE);
}

function firstOfThisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function gradeLabel(grade) {
  return grade?.aliasName || grade?.divisionName || `Grade ${grade?.id}`;
}

function formatDay(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Headline number. Exactly one hero per view — this is it. */
function StatTile({ label, value, hint, hero = false }) {
  return (
    <div className="rounded-[14px] bg-white px-4 py-4 shadow-[0_4px_16px_rgba(18,53,64,0.05)]">
      <p className="text-xs uppercase tracking-[0.5px] text-[#8b939b]">{label}</p>
      <p
        className={`mt-1 font-semibold text-[#20242a] ${hero ? "text-[34px] leading-tight" : "text-[20px]"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-[#8b939b]">{hint}</p>}
    </div>
  );
}

function MoneyTable({ rows, valueHeader, secondaryHeader, secondaryOf }) {
  return (
    <DataTable
      minWidth={420}
      rowKey={(row) => row.key}
      rows={rows}
      columns={[
        { key: "label", header: "Name", render: (row) => row.label },
        {
          key: "value",
          header: valueHeader,
          align: "right",
          render: (row) => (
            <span className="tabular-nums">{formatINR(row.value / 100)}</span>
          ),
        },
        {
          key: "count",
          header: secondaryHeader,
          align: "right",
          render: (row) => <span className="tabular-nums">{secondaryOf(row)}</span>,
        },
      ]}
    />
  );
}

export default function ReportsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [from, setFrom] = useState(firstOfThisMonth);
  const [to, setTo] = useState(today);
  const [granularity, setGranularity] = useState("daily");
  const [dueStatus, setDueStatus] = useState("ALL");
  const [duePage, setDuePage] = useState(1);

  const scope = useMemo(() => ({ schoolId, gradeId, from, to }), [schoolId, gradeId, from, to]);

  const gradeOptionsQuery = useQuery({
    queryKey: ["grades", "options", schoolId],
    queryFn: async () => {
      const response = await fetchClasses({ schoolId, limit: 50 });
      return extractList(response, ["grades"]);
    },
    enabled: Boolean(schoolId),
  });

  const trendQuery = useCollectionTrendQuery(granularity, scope);
  const feeTypeQuery = useFeeTypeReportQuery(scope);
  const classWiseQuery = useClassWiseQuery(schoolId);
  const dueQuery = useDueStudentsQuery({
    schoolId,
    gradeId,
    status: dueStatus,
    page: duePage,
    limit: DUE_PAGE_SIZE,
  });

  function handleSchoolChange(next) {
    setSchoolId(next);
    setGradeId("");
    setDuePage(1);
  }

  function handleGradeChange(next) {
    setGradeId(next);
    setDuePage(1);
  }

  const dueRows = dueQuery.data?.rows ?? [];
  const duePagination = dueQuery.data?.pagination;

  const dueColumns = [
    {
      key: "name",
      header: "Student",
      render: (row) => (
        <div>
          <span className="font-medium text-[#2a2d32]">{row.name}</span>
          <span className="ml-2 text-xs text-[#8b939b]">{row.studentCode}</span>
        </div>
      ),
    },
    { key: "rollNo", header: "Roll No", render: (row) => row.rollNo },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (row) => (
        <span className="font-semibold tabular-nums text-[#20242a]">
          {formatINR(row.outstanding / 100)}
        </span>
      ),
    },
    { key: "dueDate", header: "Due Date", render: (row) => formatDay(row.dueDate) },
    {
      key: "daysOverdue",
      header: "Days Overdue",
      align: "right",
      // 0 for both DUE and PAID — a dash reads better than a misleading zero.
      render: (row) => (row.daysOverdue > 0 ? row.daysOverdue : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge label={row.status} tone={STATUS_TONES[row.status] ?? "neutral"} />
      ),
    },
  ];

  const startRow =
    (duePagination?.totalCount ?? 0) === 0 ? 0 : (duePage - 1) * DUE_PAGE_SIZE + 1;
  const endRow = Math.min(duePage * DUE_PAGE_SIZE, duePagination?.totalCount ?? 0);

  return (
    <div className="ty-page-shell">
      <Breadcrumb items={[{ label: "Fee Management", path: "/finance" }, { label: "Reports" }]} />
      <PageHeader title="Reports" subtitle="Collection and outstanding summaries." />

      {/* One filter row scoping everything below it — never per-card filters. */}
      <div className="mb-6 grid gap-4 rounded-[18px] bg-white px-4 py-4 sm:px-5 lg:grid-cols-4">
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">School</span>
          <SchoolScopeSelect value={schoolId} onChange={handleSchoolChange} />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Class</span>
          <select
            value={gradeId}
            onChange={(event) => handleGradeChange(event.target.value)}
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
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">From</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total outstanding"
          value={formatINR((dueQuery.data?.totalOutstanding ?? 0) / 100)}
          hint="Across the whole filtered set"
          hero
        />
        <StatTile
          label="Students owing"
          value={dueQuery.data?.totalStudents ?? 0}
          hint="Due or overdue"
        />
        <StatTile
          label="Collected in period"
          value={formatINR((trendQuery.data?.totalCollected ?? 0) / 100)}
          hint={`${from || "start"} to ${to || "today"}`}
        />
        <StatTile
          label="Transactions"
          value={trendQuery.data?.totalTransactions ?? 0}
          hint="Payments recorded"
        />
      </div>

      <div className="mb-6">
        <ChartCard
          title="Collection over time"
          subtitle="Payments received, bucketed by IST day or month."
          loading={trendQuery.isPending}
          refreshing={trendQuery.isFetching && !trendQuery.isPending}
          error={trendQuery.isError ? apiError(trendQuery.error, "Failed to load collection") : ""}
          isEmpty={(trendQuery.data?.buckets ?? []).length === 0}
          emptyLabel="No payments in this period."
          actions={
            <div className="flex rounded-lg border border-[#e3e9ec] p-0.5">
              {["daily", "monthly"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGranularity(option)}
                  aria-pressed={granularity === option}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                    granularity === option
                      ? "bg-[#155966] text-white"
                      : "text-[#5b626a] hover:bg-[#f1f6f7]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          }
          table={
            <MoneyTable
              rows={(trendQuery.data?.buckets ?? []).map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                value: bucket.total,
                count: bucket.count,
              }))}
              valueHeader="Collected"
              secondaryHeader="Payments"
              secondaryOf={(row) => row.count}
            />
          }
        >
          <TrendChart buckets={trendQuery.data?.buckets ?? []} granularity={granularity} />
        </ChartCard>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Collection by payment method"
          subtitle="How the money in this period came in."
          loading={trendQuery.isPending}
          refreshing={trendQuery.isFetching && !trendQuery.isPending}
          isEmpty={(trendQuery.data?.methods ?? []).length === 0}
          emptyLabel="No payments in this period."
          table={
            <MoneyTable
              rows={trendQuery.data?.methods ?? []}
              valueHeader="Collected"
              secondaryHeader="Payments"
              secondaryOf={(row) => row.count}
            />
          }
        >
          <HorizontalBars
            rows={trendQuery.data?.methods ?? []}
            secondary={(row) => `${row.count} payment${row.count === 1 ? "" : "s"}`}
          />
        </ChartCard>

        <ChartCard
          title="Billed by fee type"
          subtitle="Amount charged per fee type — not amount collected."
          note={feeTypeQuery.data?.note}
          loading={feeTypeQuery.isPending}
          refreshing={feeTypeQuery.isFetching && !feeTypeQuery.isPending}
          error={
            feeTypeQuery.isError ? apiError(feeTypeQuery.error, "Failed to load fee types") : ""
          }
          isEmpty={(feeTypeQuery.data?.rows ?? []).length === 0}
          emptyLabel="Nothing charged in this period."
          table={
            <MoneyTable
              rows={feeTypeQuery.data?.rows ?? []}
              valueHeader="Billed"
              secondaryHeader="Charges"
              secondaryOf={(row) => row.count}
            />
          }
        >
          <HorizontalBars
            rows={feeTypeQuery.data?.rows ?? []}
            secondary={(row) => `${row.count} charge${row.count === 1 ? "" : "s"}`}
          />
        </ChartCard>
      </div>

      <div className="mb-6">
        <ChartCard
          title="Outstanding by class"
          subtitle="Current balances per class — not affected by the date range or class filter."
          loading={classWiseQuery.isPending}
          refreshing={classWiseQuery.isFetching && !classWiseQuery.isPending}
          error={
            classWiseQuery.isError
              ? apiError(classWiseQuery.error, "Failed to load class balances")
              : ""
          }
          isEmpty={(classWiseQuery.data?.rows ?? []).length === 0}
          emptyLabel="No outstanding balances."
          table={
            <MoneyTable
              rows={classWiseQuery.data?.rows ?? []}
              valueHeader="Outstanding"
              secondaryHeader="Students"
              secondaryOf={(row) => row.count}
            />
          }
        >
          <HorizontalBars
            rows={classWiseQuery.data?.rows ?? []}
            secondary={(row) => `${row.count} student${row.count === 1 ? "" : "s"}`}
          />
        </ChartCard>
      </div>

      <section className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-6 sm:py-7">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-[#20242a]">Students with dues</h2>
            <p className="mt-1 text-[13px] text-[#5b626a]">
              Overdue first, then by how long they&apos;ve been overdue. Not affected by the date
              range.
            </p>
          </div>

          <label className="block sm:w-[220px]">
            <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
            <select
              value={dueStatus}
              onChange={(event) => {
                setDueStatus(event.target.value);
                setDuePage(1);
              }}
              className={FIELD_CLASS}
            >
              {/* ALL excludes settled students — labelled for what it does, not
                  what it's called. */}
              <option value="ALL">Still owing (due + overdue)</option>
              <option value="DUE">Due</option>
              <option value="OVERDUE">Overdue</option>
              <option value="PAID">Settled</option>
            </select>
          </label>
        </div>

        <DataTable
          columns={dueColumns}
          rows={dueRows}
          loading={dueQuery.isPending}
          error={dueQuery.isError ? apiError(dueQuery.error, "Failed to load students") : ""}
          emptyLabel="No students match this filter."
          rowKey={(row) => row.id}
          minWidth={880}
        />

        {!dueQuery.isPending && !dueQuery.isError && dueRows.length > 0 && (
          <PaginationControls
            className="mt-6"
            rangeLabel={`${startRow}-${endRow} of ${duePagination?.totalCount ?? dueRows.length}`}
            currentPage={duePagination?.currentPage ?? duePage}
            totalPages={duePagination?.totalPages ?? 1}
            hasPrev={duePagination?.hasPrev ?? duePage > 1}
            hasNext={duePagination?.hasNext ?? false}
            onPrev={() => setDuePage((value) => Math.max(value - 1, 1))}
            onNext={() =>
              setDuePage((value) => Math.min(value + 1, duePagination?.totalPages || value + 1))
            }
          />
        )}
      </section>
    </div>
  );
}
