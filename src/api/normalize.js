// Shared API-response normalizers.
//
// The backend returns list/pagination data in several shapes (`data`,
// `data.data`, `data.<key>`, `pagination` vs `meta`, etc.). These helpers used
// to be copy-pasted into many page components (extractList x5, extractPagination
// x9, safeId x4). They now live here once.

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Pull an array out of an arbitrarily-shaped API response.
 * @param {*} response raw response body
 * @param {string[]} keys candidate keys that may hold the array
 */
export function  extractList(response, keys = []) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }
  return [];
}

/**
 * Normalize pagination metadata into a predictable shape.
 */
export function extractPagination(
  response,
  fallbackCount = 0,
  fallbackPageSize = DEFAULT_PAGE_SIZE
) {
  const pagination =
    response?.pagination ??
    response?.data?.pagination ??
    response?.meta ??
    response?.data?.meta ??
    null;

  if (pagination) {
    const currentPage = Number(
      pagination.currentPage ?? pagination.page ?? pagination.pageNumber ?? 1
    );
    const totalPages = Number(
      pagination.totalPages ??
        pagination.pageCount ??
        (pagination.totalCount && pagination.pageSize
          ? Math.ceil(pagination.totalCount / pagination.pageSize)
          : 1)
    );
    const totalCount = Number(
      pagination.totalCount ?? pagination.total ?? pagination.count ?? fallbackCount
    );
    const pageSize = Number(
      pagination.pageSize ?? pagination.limit ?? pagination.perPage ?? fallbackPageSize
    );

    return {
      currentPage,
      totalPages,
      totalCount,
      pageSize,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
    };
  }

  return {
    currentPage: 1,
    totalPages: 1,
    totalCount: fallbackCount,
    pageSize: fallbackPageSize,
    hasPrev: false,
    hasNext: false,
  };
}

/** Coerce an id-ish value to a stable string (never undefined/null). */
export function safeId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}
