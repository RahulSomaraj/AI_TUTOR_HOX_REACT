import { Loader2 } from "lucide-react";

/**
 * Generic data table driven by a `columns` config:
 *   columns = [{ key, header, align?, render?(row) }]
 * Handles loading / error / empty states so pages don't re-implement them.
 */
export default function DataTable({
  columns,
  rows = [],
  loading = false,
  error = "",
  emptyLabel = "No records found.",
  rowKey = (row, index) => row?.id ?? index,
  minWidth = 980,
}) {
  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-[#5b626a]">
        <Loader2 size={22} className="mx-auto animate-spin text-[#155966]" />
        <p className="mt-3">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="py-16 text-center text-sm text-[#5b626a]">{emptyLabel}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-[#edf0f2]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-4 text-[16px] font-medium text-[#16191d] ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className="border-b border-[#eef0f2] last:border-b-0"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-5 text-[15px] text-[#2a2d32] ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
