import api from "../axiosInstance";

// Fee Collection module — `payment.controller.ts`, base path `/fee-payments`.
// Every payment writes a FeePayment row *and* a balance-reducing ledger entry
// in one backend transaction, so there is no separate "post to ledger" call.

/**
 * Collect a payment. The response is the confirmation payload — it carries the
 * post-payment outstanding balance, so no follow-up call is needed.
 * @param {{studentId:number, amount:number, method:string, paymentType?:string,
 *          referenceNo?:string, paidAt?:string, note?:string}} payload
 */
export async function createPayment(payload) {
  const { data } = await api.post("/fee-payments", payload);
  return data;
}

/** Payment history. Omit `studentId` for every payment. No pagination server-side. */
export async function fetchPayments(params = {}) {
  const { data } = await api.get("/fee-payments", { params });
  return data;
}

/** Single payment, with the `student` relation attached (the list omits it). */
export async function fetchPaymentById(id) {
  const { data } = await api.get(`/fee-payments/${id}`);
  return data;
}

/**
 * Receipt payload for a payment. Returns JSON — there is no server-rendered
 * PDF and no redirect; the client renders and prints it.
 */
export async function fetchReceipt(paymentId) {
  const { data } = await api.get(`/fee-payments/${paymentId}/receipt`);
  return data;
}

/**
 * Refund against a payment. Higher permission bar than collection
 * (SUPER_ADMIN / SCHOOL_ADMIN only). `amount` defaults to the full original.
 *
 * NOTE: a refund posts a DEBIT, which *lowers* outstanding the same direction
 * as a payment — it does not reverse the original payment, and that row stays
 * in history. Deliberate backend design, but model it consciously in any UI.
 */
export async function refundPayment(paymentId, payload = {}) {
  const { data } = await api.post(`/fee-payments/${paymentId}/refund`, payload);
  return data;
}
