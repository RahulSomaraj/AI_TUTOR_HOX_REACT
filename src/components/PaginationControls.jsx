import { ChevronLeft, ChevronRight, ChevronsLeftRight } from "lucide-react";

export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  rowsPerPage,
  rowsPerPageOptions = [10, 20, 50],
  onRowsPerPageChange,
  rangeLabel,
  disabled = false,
  className = "",
}) {
  const canGoPrev = hasPrev ?? currentPage > 1;
  const canGoNext = hasNext ?? currentPage < totalPages;
  const showRowsPerPage = rowsPerPage !== undefined && onRowsPerPageChange;

  return (
    <div
      className={`flex flex-col gap-4 ty-caption xl:flex-row xl:items-center xl:justify-between ${className}`}
    >
      <div className="flex flex-wrap items-center gap-4">
        {showRowsPerPage && (
          <label className="flex items-center gap-4">
            <span>Rows per page</span>
            <span className="relative inline-flex items-center">
              <select
                value={rowsPerPage}
                onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
                disabled={disabled}
                className="h-12 w-[94px] appearance-none rounded-xl border border-[#cfd4dc] bg-[#f7f9fb] px-5 pr-10 text-[16px] text-[#1f2933] outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rowsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronsLeftRight
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-[#6f7782]"
                size={16}
              />
            </span>
          </label>
        )}
        {rangeLabel && <span>{rangeLabel}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!canGoPrev || disabled}
          onClick={onPrev}
          className="inline-flex h-12 min-w-[118px] items-center justify-center gap-3 rounded-full border border-[#dde1e6] bg-white px-6 text-[16px] text-[#8b9199] transition hover:border-[#155966] hover:text-[#155966] disabled:cursor-not-allowed disabled:text-[#a8adb4] disabled:opacity-70"
        >
          <ChevronLeft size={18} />
          Prev
        </button>
        <button
          type="button"
          disabled={!canGoNext || disabled}
          onClick={onNext}
          className="inline-flex h-12 min-w-[118px] items-center justify-center gap-3 rounded-full border border-[#dde1e6] bg-white px-6 text-[16px] text-[#8b9199] transition hover:border-[#155966] hover:text-[#155966] disabled:cursor-not-allowed disabled:text-[#a8adb4] disabled:opacity-70"
        >
          Next
          <ChevronRight size={18} />
        </button>
        <span className="text-[#20242a]">
          Page {currentPage} of {totalPages || 1}
        </span>
      </div>
    </div>
  );
}
