// A route the server doesn't have at all answers with Express's default body,
// `{"message":"Cannot GET /students/57/fees/summary", ...}`. That string is a
// stack-trace artifact, not something to show a person standing at a fee
// counter — and it's indistinguishable, to the caller, from a 404 that means
// "no such student". Worth separating: one is "this build is talking to a
// server that doesn't have the feature", the other is real data.
const MISSING_ROUTE = /^Cannot (GET|POST|PUT|PATCH|DELETE)\s/i;

/** True when a 404 means "this endpoint doesn't exist here", not "no such record". */
export function isEndpointMissing(err) {
  if (err?.response?.status !== 404) return false;
  const message = err?.response?.data?.message;
  return typeof message === "string" && MISSING_ROUTE.test(message);
}

/**
 * Best human-readable message for a failed request.
 * @param {unknown} err axios error
 * @param {string} fallback shown when the server said nothing useful
 * @param {string} [missingEndpointMessage] shown when the route itself is absent
 */
export function apiErrorMessage(err, fallback, missingEndpointMessage) {
  if (isEndpointMissing(err)) {
    return (
      missingEndpointMessage ??
      "This feature isn't available on the server yet — the endpoint returned 404. It may not be deployed."
    );
  }

  const data = err?.response?.data;
  // Validation failures return `message` as an array of strings.
  const raw = data?.message ?? data?.error ?? err?.message;
  const text = Array.isArray(raw) ? raw.filter(Boolean).join(", ") : raw;

  return (typeof text === "string" && text.trim()) || fallback;
}
