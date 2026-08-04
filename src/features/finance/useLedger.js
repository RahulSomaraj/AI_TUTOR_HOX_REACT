import { useQuery } from "@tanstack/react-query";
import { fetchLedger, fetchStatement } from "../../api/services/ledger";
import { safeId } from "../../api/normalize";
import { retryTransientOnly } from "../../lib/apiError";
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
 * Client-side pagination. These endpoints return the complete non-deleted set
 * with no `pagination` object and no page/limit params, so a student with a
 * long history arrives in one response and the slicing has to happen here.
 */
export function paginateRows(rows = [], page = 1, pageSize = 15) {
  const totalCount = rows.length;
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      pageSize,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
    },
  };
}

/** Drop empty range bounds — sending `from: ""` trips `forbidNonWhitelisted`. */
export function buildStatementParams({ from, to } = {}) {
  const params = {};
  if (from) params.from = new Date(from).toISOString();
  if (to) params.to = new Date(to).toISOString();
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
    queryKey: [STATEMENT_ROOT, safeId(studentId), params.from ?? "", params.to ?? ""],
    queryFn: async () => {
      const response = await fetchStatement(studentId, params);
      const body = response?.data ?? response;
      return {
        student: body?.student ?? null,
        rows: mapStatementRows(body),
        summary: summarizeStatement(body),
      };
    },
    enabled: Boolean(studentId),
    retry: retryTransientOnly,
    placeholderData: (previous) => previous,
  });
}
