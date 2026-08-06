import { useQuery } from "@tanstack/react-query";
import {
  fetchClassWiseOutstanding,
  fetchDailyCollection,
  fetchDueStudents,
  fetchFeeTypeCollection,
  fetchMonthlyCollection,
} from "../../api/services/reports";
import { safeId } from "../../api/normalize";
import { retryTransientOnly } from "../../lib/apiError";
import { toPaise } from "../../lib/money";

const REPORTS_ROOT = "feeReports";

export const METHOD_LABELS = {
  CASH: "Cash",
  UPI: "UPI",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
  NET_BANKING: "Net Banking",
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer",
};

// ─── Pure selectors (unit-tested) ──────────────────────────────────────────

function startOfDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(value) {
  const date = startOfDay(value);
  return date ? new Date(date.getFullYear(), date.getMonth(), 1) : null;
}

function toIsoDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function normalizeBuckets(list, dateKey) {
  return (list ?? []).map((item) => ({
    key: item?.[dateKey],
    label: item?.[dateKey],
    total: toPaise(item?.total),
    count: item?.count ?? 0,
  }));
}

/**
 * Fill the gaps in a sparse bucket series.
 *
 * Days with no payments are absent from the response entirely. Plotting that
 * as-is draws a line straight across the empty stretches — which reads as
 * "collection was steady" when nothing actually came in — and spaces the axis
 * unevenly. Zero-filling makes the quiet days visible as quiet days.
 */
export function fillDailyBuckets(days, from, to) {
  const list = days ?? [];
  const byDate = new Map(list.map((d) => [d?.date, d]));
  const start = startOfDay(from ?? list[0]?.date);
  const end = startOfDay(to ?? list[list.length - 1]?.date);
  if (!start || !end || end < start) return normalizeBuckets(list, "date");

  const out = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = toIsoDay(cursor);
    const hit = byDate.get(key);
    out.push({ key, label: key, total: toPaise(hit?.total), count: hit?.count ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function fillMonthlyBuckets(months, from, to) {
  const list = months ?? [];
  const byMonth = new Map(list.map((m) => [m?.month, m]));
  const start = startOfMonth(from ?? (list[0]?.month ? `${list[0].month}-01` : null));
  const last = list[list.length - 1]?.month;
  const end = startOfMonth(to ?? (last ? `${last}-01` : null));
  if (!start || !end || end < start) return normalizeBuckets(list, "month");

  const out = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const hit = byMonth.get(key);
    out.push({ key, label: key, total: toPaise(hit?.total), count: hit?.count ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

/** Payment methods, biggest first — the API returns them unsorted. */
export function mapMethodRows(byMethod) {
  return (byMethod ?? [])
    .map((row) => ({
      key: row?.method,
      label: METHOD_LABELS[row?.method] ?? row?.method ?? "Unknown",
      value: toPaise(row?.total),
      count: row?.count ?? 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Amount BILLED per fee type. Never label this as collected — see the service. */
export function mapFeeTypeRows(byFeeType) {
  return (byFeeType ?? []).map((row) => ({
    key: safeId(row?.feeTypeId),
    label: row?.feeTypeName ?? "Fee",
    code: row?.code ?? "",
    value: toPaise(row?.charged),
    count: row?.chargeCount ?? 0,
  }));
}

/**
 * Outstanding per class.
 *
 * `gradeId: null` is a real bucket, not bad data — students with no grade
 * aggregate into it, and admin-created students land there. Reading
 * `grade.aliasName` off that row throws.
 */
export function mapClassRows(classes) {
  return (classes ?? []).map((row) => ({
    key: row?.gradeId == null ? "unassigned" : safeId(row.gradeId),
    label: row?.grade?.aliasName ?? row?.grade?.divisionName ?? "Unassigned",
    school: row?.grade?.school?.schoolName ?? "",
    isUnassigned: row?.gradeId == null,
    value: toPaise(row?.outstanding),
    count: row?.studentCount ?? 0,
  }));
}

export function mapDueStudentRows(rows) {
  return (rows ?? []).map((row) => ({
    id: safeId(row?.student?.id),
    name: row?.student?.name ?? "—",
    studentCode: row?.student?.studentCode ?? "—",
    rollNo: row?.student?.rollNo ?? "—",
    outstanding: toPaise(row?.outstanding),
    dueDate: row?.dueDate ?? null,
    daysOverdue: row?.daysOverdue ?? 0,
    status: row?.status ?? "DUE",
  }));
}

/** Drop empty values — `forbidNonWhitelisted` rejects unknown keys, and an
 *  empty string is neither a valid int nor a valid date. */
export function buildReportParams(scope) {
  const { schoolId, gradeId, from, to } = scope ?? {};
  const params = {};
  if (schoolId) params.schoolId = Number(schoolId);
  if (gradeId) params.gradeId = Number(gradeId);
  if (from) params.from = from;
  if (to) params.to = to;
  return params;
}

// ─── Queries ───────────────────────────────────────────────────────────────

const SHARED = { retry: retryTransientOnly, placeholderData: (previous) => previous };

export function useCollectionTrendQuery(granularity, scope) {
  const params = buildReportParams(scope);
  return useQuery({
    queryKey: [REPORTS_ROOT, "collection", granularity, params],
    queryFn: async () => {
      const response =
        granularity === "monthly"
          ? await fetchMonthlyCollection(params)
          : await fetchDailyCollection(params);
      const body = response?.data ?? response;

      return {
        buckets:
          granularity === "monthly"
            ? fillMonthlyBuckets(body?.months, params.from, params.to)
            : fillDailyBuckets(body?.days, params.from, params.to),
        methods: mapMethodRows(body?.byMethod),
        totalCollected: toPaise(body?.summary?.totalCollected),
        totalTransactions: body?.summary?.totalTransactions ?? 0,
        period: body?.period ?? null,
      };
    },
    ...SHARED,
  });
}

export function useFeeTypeReportQuery(scope) {
  // `method` is deliberately never passed — this endpoint accepts it and then
  // ignores it, so offering the filter would be a lie.
  const params = buildReportParams(scope);
  return useQuery({
    queryKey: [REPORTS_ROOT, "feeType", params],
    queryFn: async () => {
      const response = await fetchFeeTypeCollection(params);
      const body = response?.data ?? response;
      return {
        rows: mapFeeTypeRows(body?.byFeeType),
        note: body?.note ?? "",
        totalCollected: toPaise(body?.totalCollected),
      };
    },
    ...SHARED,
  });
}

export function useClassWiseQuery(schoolId) {
  // schoolId only: this endpoint takes no grade filter and no date range, so
  // forwarding the page's other scope values would silently do nothing.
  const params = schoolId ? { schoolId: Number(schoolId) } : {};
  return useQuery({
    queryKey: [REPORTS_ROOT, "classWise", params],
    queryFn: async () => {
      const response = await fetchClassWiseOutstanding(params);
      const body = response?.data ?? response;
      return {
        rows: mapClassRows(body?.classes),
        totalOutstanding: toPaise(body?.summary?.totalOutstanding),
        totalStudents: body?.summary?.totalStudents ?? 0,
      };
    },
    ...SHARED,
  });
}

export function useDueStudentsQuery({ schoolId, gradeId, status, page, limit }) {
  const params = { page, limit };
  if (schoolId) params.schoolId = Number(schoolId);
  if (gradeId) params.gradeId = Number(gradeId);
  if (status) params.status = status;

  return useQuery({
    queryKey: [REPORTS_ROOT, "dueStudents", params],
    queryFn: async () => {
      const response = await fetchDueStudents(params);
      const body = response?.data ?? response;
      // `pagination` sits beside `data` rather than inside it, and `summary`
      // covers the whole filtered set, not just this page.
      return {
        rows: mapDueStudentRows(Array.isArray(body?.data) ? body.data : []),
        pagination: body?.pagination ?? response?.pagination ?? null,
        totalStudents: body?.summary?.totalStudents ?? 0,
        totalOutstanding: toPaise(body?.summary?.totalOutstanding),
      };
    },
    ...SHARED,
  });
}
