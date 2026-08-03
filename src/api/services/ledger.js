import api from "../axiosInstance";

// Student Ledger module — `ledger.controller.ts` (`/students/:studentId/ledger`)
// and `student-fee-summary.controller.ts` (`/students/:studentId/fees`).
//
// The ledger is append-only. CREDIT entries (FEE_CHARGE, FINE_CHARGE,
// ADDITIONAL_CHARGE) increase outstanding; DEBIT entries (FEE_PAYMENT, REFUND,
// DISCOUNT) decrease it. Every entry stores the running `balanceAfter`.
//
// None of these endpoints paginate — a student with a long history returns the
// entire set in one response.

/** Full account statement: student, summary totals, and all entries ascending. */
export async function fetchLedger(studentId) {
  const { data } = await api.get(`/students/${studentId}/ledger`);
  return data;
}

/**
 * Filterable entry history, most recent first.
 * @param {{entryType?:string, from?:string, to?:string}} params ISO-8601 dates
 */
export async function fetchLedgerTransactions(studentId, params = {}) {
  const { data } = await api.get(`/students/${studentId}/ledger/transactions`, { params });
  return data;
}

/**
 * Statement for a date range, with opening/closing balances.
 * Only `from`/`to` are applied — the shared DTO accepts `entryType` but this
 * endpoint ignores it; use fetchLedgerTransactions when you need to filter by
 * type. Returns JSON, not a PDF/CSV.
 */
export async function fetchStatement(studentId, params = {}) {
  const { data } = await api.get(`/students/${studentId}/ledger/statement`, { params });
  return data;
}

/**
 * Manual charge — posts a CREDIT entry, increasing outstanding.
 * `type` accepts only FINE_CHARGE or ADDITIONAL_CHARGE; anything else is a 400.
 */
export async function createLedgerCharge(studentId, payload) {
  const { data } = await api.post(`/students/${studentId}/ledger/charges`, payload);
  return data;
}

/** Discount / scholarship — posts a DISCOUNT DEBIT entry, decreasing outstanding. */
export async function createLedgerDiscount(studentId, payload) {
  const { data } = await api.post(`/students/${studentId}/ledger/discounts`, payload);
  return data;
}

/**
 * Post a FEE_CHARGE for every active StudentFee not yet charged. Idempotent —
 * already-charged fees are skipped, so calling twice is safe.
 *
 * This is the bridge between fee *assignment* and fee *collection*: assigning a
 * fee on the Student Fee Assignment page does NOT create a ledger charge, so a
 * newly-assigned student shows nothing outstanding until this runs.
 */
export async function generateFeeCharges(studentId) {
  const { data } = await api.post(`/students/${studentId}/ledger/generate-fee-charges`);
  return data;
}

/** Aggregated position: totals, outstanding, and a per-category breakdown. */
export async function fetchFeeSummary(studentId) {
  const { data } = await api.get(`/students/${studentId}/fees/summary`);
  return data;
}
