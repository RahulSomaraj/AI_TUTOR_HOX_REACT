import { useQuery } from "@tanstack/react-query";
import { fetchLedger, fetchStatement } from "../../api/services/ledger";
import { safeId } from "../../api/normalize";
import { retryTransientOnly } from "../../lib/apiError";
import { MAX_PAGE_SIZE } from "../../api/listParams";
import { toPaise } from "../../lib/money";

export const LEDGER_ROOT = "ledger";
export const STATEMENT_ROOT = "ledgerStatement";

const ENTRY_TYPE_LABELS = {
  FEE_CHARGE: "Fee charge",
  FINE_CHARGE: "Fine",
  ADDITIONAL_CHARGE: "Additional charge",
  FEE_PAYMENT: "Payment",
  REFUND: "Refund",
  DISCOUNT: "Discount",
};

export function entryTypeLabel(type) {
  return ENTRY_TYPE_LABELS[type] ?? type ?? "-";
}

// ─── Pure selectors (unit-tested) ──────────────────────────────────────────

/**
 * Normalize the statement's rows into paise integers.
 *
 * The API guarantees exactly one of `credit`/`debit` is a string per row and
 * the other is null, so each row carries its own direction — we never infer it.
 * `balance` is the running balance *at that row*, computed server-side, which
 * is what makes client-side pagination safe here: the figure doesn't depend on
 * which rows happen to be on screen.
 */
export function mapStatementRows(statement) {
  return (statement?.rows ?? []).map((row, index) => ({
    key: `${row?.date ?? "row"}-${index}`,
    date: row?.date ?? null,
    description: row?.description || "-",
    type: row?.type ?? null,
    typeLabel: entryTypeLabel(row?.type),
    credit: row?.credit == null ? null : toPaise(row.credit),
    debit: row?.debit == null ? null : toPaise(row.debit),
    balance: toPaise(row?.balance),
  }));
}

/** Period totals and opening/closing balances, in paise. */
export function summarizeStatement(statement) {
  return {
    openingBalance: toPaise(statement?.openingBalance),
    closingBalance: toPaise(statement?.closingBalance),
    totalCredit: toPaise(statement?.totals?.totalCredit),
    totalDebit: toPaise(statement?.totals?.totalDebit),
    from: statement?.period?.from ?? null,
    to: statement?.period?.to ?? null,
  };
}

/**
 * Drop empty range bounds — sending `from: ""` trips `forbidNonWhitelisted`.
 *
 * Omitting `page`/`limit` is meaningful, not an oversight: pagination is
 * opt-in, and without it the endpoint returns the complete statement. That's
 * what the CSV and print exports need.
 */
export function buildStatementParams({ from, to, page, limit } = {}) {
  const params = {};
  if (from) params.from = new Date(from).toISOString();
  if (to) params.to = new Date(to).toISOString();
  if (page) params.page = Number(page);
  if (limit) params.limit = Math.min(Number(limit), MAX_PAGE_SIZE);
  return params;
}

// ─── Queries ───────────────────────────────────────────────────────────────

/** Full account: student, lifetime summary, and every entry ascending. */
export function useLedgerQuery(studentId) {
  return useQuery({
    queryKey: [LEDGER_ROOT, safeId(studentId)],
    queryFn: async () => {
      const response = await fetchLedger(studentId);
      const body = response?.data ?? response;
      return {
        student: body?.student ?? null,
        entries: body?.entries ?? [],
        summary: body?.summary ?? null,
      };
    },
    enabled: Boolean(studentId),
    retry: retryTransientOnly,
  });
}

/**
 * Statement rows for a period. With no `from`/`to` this is the entire history
 * with an opening balance of zero, so it serves the unfiltered view too.
 *
 * ⚠️ The shared DTO accepts `entryType` but this endpoint ignores it — only
 * from/to are applied. If a type filter is ever added to this page it has to go
 * through `GET .../ledger/transactions`, or it will silently do nothing.
 */
export function useStatementQuery(studentId, range) {
  const params = buildStatementParams(range);
  return useQuery({
    queryKey: [STATEMENT_ROOT, safeId(studentId), params],
    queryFn: async () => {
      const response = await fetchStatement(studentId, params);
      const body = response?.data ?? response;
      return {
        student: body?.student ?? null,
        rows: mapStatementRows(body),
        // openingBalance / closingBalance / totals always describe the whole
        // requested period, never the page — so a header rendered beside page 3
        // is still correct. Never sum the visible rows to get a total.
        summary: summarizeStatement(body),
        pagination: body?.pagination ?? response?.pagination ?? null,
      };
    },
    enabled: Boolean(studentId),
    retry: retryTransientOnly,
    placeholderData: (previous) => previous,
  });
}

/**
 * The complete statement for a period, regardless of what page the table is on.
 *
 * Exports must not silently ship one page. This is a one-off fetch on click
 * rather than a second always-live query, so the cost is only paid when someone
 * actually downloads or prints.
 */
export async function fetchFullStatement(studentId, range) {
  const { page, limit, ...rest } = range ?? {};
  void page;
  void limit;
  const response = await fetchStatement(studentId, buildStatementParams(rest));
  const body = response?.data ?? response;
  return { rows: mapStatementRows(body), summary: summarizeStatement(body) };
}
