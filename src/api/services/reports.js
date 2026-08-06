import api from "../axiosInstance";

// Fee Reports — five read-only endpoints under /fees/reports.
//
// Roles: SUPER_ADMIN, SCHOOL_ADMIN, DIRECTOR, PRINCIPAL. STUDENT/PARENT/TEACHER
// get 403.
//
// Server timezone is Asia/Kolkata, so buckets are IST days/months — a payment at
// 2026-08-04T20:00Z lands in the 5 August bucket. `to` is inclusive (pushed to
// 23:59:59.999 server-side). Every money value is a decimal string.

/** Payments bucketed by IST day. `from` defaults to the start of the current month. */
export async function fetchDailyCollection(params = {}) {
  const { data } = await api.get("/fees/reports/collection/daily", { params });
  return data;
}

/** Payments bucketed by IST month. `from` defaults to the start of the current year. */
export async function fetchMonthlyCollection(params = {}) {
  const { data } = await api.get("/fees/reports/collection/monthly", { params });
  return data;
}

/**
 * Amount **billed** per fee type — NOT collected.
 *
 * Payments carry no fee-type link (a payment is against a student, not against
 * "Tuition"), so per-type collection isn't computable from this data. The
 * response carries a `note` saying so, and `charged` vs `totalCollected` are
 * different quantities that must never be summed or shown as parts of one whole.
 *
 * `method` is accepted by the DTO here but silently ignored — don't offer it.
 */
export async function fetchFeeTypeCollection(params = {}) {
  const { data } = await api.get("/fees/reports/collection/fee-type", { params });
  return data;
}

/**
 * Every student with an outstanding balance. The only paginated report.
 *
 * `status=ALL` does not mean everything — it means everything still owing
 * (DUE + OVERDUE), excluding settled students. Pass PAID explicitly for those.
 */
export async function fetchDueStudents(params = {}) {
  const { data } = await api.get("/fees/reports/outstanding/due-students", { params });
  return data;
}

/** Outstanding balance per grade. Takes `schoolId` only — no grade filter, no
 *  date range, no pagination. Current balances, not period-scoped. */
export async function fetchClassWiseOutstanding(params = {}) {
  const { data } = await api.get("/fees/reports/outstanding/class-wise", { params });
  return data;
}
