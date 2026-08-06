// Query-string builder for the paginated list endpoints.
//
// Three rules the API imposes, in one place so every screen obeys them:
//
//  1. `forbidNonWhitelisted` is on — an undocumented or empty-string param is a
//     400, not something the server quietly ignores. So blanks are dropped
//     rather than sent.
//  2. `limit` caps at 50 server-side. Asking for more is an error, so clamp.
//  3. Pagination is opt-in. Send neither `page` nor `limit` and you get the
//     complete set — which is what screens that export or cross-reference the
//     whole list actually want.

export const MAX_PAGE_SIZE = 50;

/**
 * @param {object} input `{ page, limit, search, ...filters }`. Filters are
 *   passed through untouched, so callers coerce ids to numbers themselves.
 * @returns {object} params safe to hand to axios
 */
export function buildListParams(input) {
  const { page, limit, search, ...filters } = input ?? {};
  const params = {};

  if (page) params.page = Number(page);
  if (limit) params.limit = Math.min(Number(limit), MAX_PAGE_SIZE);

  const term = typeof search === "string" ? search.trim() : "";
  if (term) params.search = term;

  for (const [key, value] of Object.entries(filters)) {
    if (value === "" || value === null || value === undefined) continue;
    params[key] = value;
  }

  return params;
}
