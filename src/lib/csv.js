// Client-side CSV generation.
//
// Needed because the backend's statement endpoint returns JSON, not a file —
// there is no server-rendered CSV or PDF to link to. Accountants open
// statements in a spreadsheet, so CSV is the format that actually gets used;
// printing covers the PDF case.

/**
 * Quote a single field per RFC 4180. Anything containing a comma, quote,
 * newline or carriage return must be quoted, and inner quotes are doubled.
 * A leading/trailing space also gets quoted so spreadsheets don't trim it.
 */
function escapeField(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const needsQuoting = /[",\r\n]/.test(text) || text !== text.trim();
  return needsQuoting ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * @param {string[]} headers
 * @param {Array<Array<unknown>>} rows
 * @returns {string} CRLF-delimited CSV — Excel is happier with CRLF than LF.
 */
export function toCsv(headers, rows = []) {
  const lines = [];
  if (headers?.length) lines.push(headers.map(escapeField).join(","));
  for (const row of rows) lines.push((row ?? []).map(escapeField).join(","));
  return lines.join("\r\n");
}

/**
 * Trigger a browser download for CSV text.
 *
 * The BOM is deliberate: without it Excel on Windows reads UTF-8 as the local
 * ANSI codepage, so a rupee sign or a non-ASCII student name arrives mangled.
 */
export function downloadCsv(filename, csv) {
  const BOM = "\uFEFF"; // escaped, not literal — a raw BOM in source is invisible
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
