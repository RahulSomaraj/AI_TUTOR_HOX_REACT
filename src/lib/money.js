// Exact money arithmetic for the fee modules.
//
// The backend serializes every monetary field as a Prisma Decimal(10,2) → a
// JSON *string* ("1500.00"), and explicitly warns against parseFloat-ing them
// and doing arithmetic. Binary floats can't represent 0.10 exactly, so summing
// a ledger with parseFloat drifts — and on a balance screen a drift of one
// paise reads as a bug in the school's books.
//
// Rather than pull in a decimal dependency, we convert to integer paise on the
// way in, do all arithmetic in integers, and format on the way out. INR at 2dp
// stays exact well inside Number.MAX_SAFE_INTEGER (~₹90,071,992,547,409).
//
// Rule of thumb: strings cross the API boundary, paise integers live inside the
// app, and nothing in between ever sees a float.

/**
 * Parse an API money string (or a user-typed amount) into integer paise.
 * Tolerates "₹1,500.00", "1500", 1500, "" and null.
 * @returns {number} integer paise; 0 for blank/unparseable input
 */
export function toPaise(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "boolean") return 0;

  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;

  const negative = cleaned.startsWith("-");
  const [whole = "0", fraction = ""] = cleaned.replace(/-/g, "").split(".");

  const rupees = Number(whole || "0");
  if (!Number.isFinite(rupees)) return 0;

  // Round rather than truncate at the 3rd decimal, so a stray "0.005" behaves
  // the way an accountant expects instead of silently vanishing.
  const paise = Math.round(Number(`0.${fraction || "0"}`) * 100);

  const total = rupees * 100 + (Number.isFinite(paise) ? paise : 0);
  return negative ? -total : total;
}

/**
 * Integer paise → the fixed-2dp string shape the API uses ("1500.00").
 * Use this when sending money back, not for display.
 */
export function fromPaise(paise) {
  const value = Math.trunc(Number(paise) || 0);
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

/**
 * Integer paise → the number a JSON request body wants. The API takes numbers
 * for amounts even though it returns strings ({"amount": 1500} is correct).
 */
export function paiseToNumber(paise) {
  return Number(fromPaise(paise));
}

/** Sum any mix of API money strings / paise-free values, exactly. */
export function sumPaise(values = []) {
  return values.reduce((total, value) => total + toPaise(value), 0);
}

/** True when the string is a well-formed positive amount of at least one paise. */
export function isPayableAmount(value) {
  const paise = toPaise(value);
  return Number.isInteger(paise) && paise > 0;
}
