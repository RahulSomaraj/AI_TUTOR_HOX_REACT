import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import useOutsideClick from "../../hooks/useOutsideClick";
import useDebounce from "../../hooks/useDebounce";

/**
 * Dropdown with a built-in search box. `onSearch(query)` is called (debounced)
 * so the parent can fetch matching options; `onChange(option)` fires on select.
 * `value` and each option are { value, label } objects.
 */
export default function SearchableSelect({
  value,
  onChange, 
  onSearch,
  options = [],
  placeholder = "Select",
  searchPlaceholder = "Search...",
  disabled = false,
  loading = false,
  emptyLabel = "No results found",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query);

  useOutsideClick(ref, () => {
    setOpen(false);
    setQuery("");
  });

  useEffect(() => {
    if (open) onSearch?.(debouncedQuery);
  }, [debouncedQuery, onSearch, open]);

  function handleOpen() {
    if (disabled) return;
    setOpen((current) => !current);
    setQuery("");
    onSearch?.("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(option) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`flex h-[40px] w-full items-center justify-between gap-3 rounded-[12px] border px-4 text-left text-[14px] outline-none transition ${
          disabled
            ? "cursor-not-allowed border-[#dce3e7] bg-[#f8fafb] text-[#9aa3aa]"
            : "border-[#c7cbd1] bg-white text-[#5b626a] hover:border-[#155966]"
        } ${open ? "border-[#155966] ring-2 ring-[#155966]/15" : ""}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {loading && !options.length ? "Loading..." : value?.label || placeholder}
        </span>
        {loading && open ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-[#155966]" />
        ) : (
          <ChevronDown
            className={`shrink-0 text-[#5b626a] transition ${open ? "rotate-180" : ""}`}
            size={16}
            strokeWidth={2}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#e7ecef] bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-[#eef0f2] px-3 py-2">
            <Search size={14} className="shrink-0 text-[#7c858c]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-[#20242a] outline-none placeholder:text-[#8d969c]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded p-1 text-[#7c858c] transition hover:bg-[#f3f7f8]"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-[#155966]" />
              </div>
            ) : options.length === 0 ? (
              <p className="px-4 py-4 text-center text-xs text-[#8d969c]">{emptyLabel}</p>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-[#f5fafc] ${
                    value?.value === option.value
                      ? "font-semibold text-[#155966]"
                      : "text-[#30363b]"
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}