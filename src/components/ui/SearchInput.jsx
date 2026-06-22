import { Search } from "lucide-react";

// Rounded search input with a leading icon. Controlled via value/onChange
// (onChange receives the raw string, not the event).
export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) {
  return (
    <label className={`relative block w-full max-w-[370px] ${className}`}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#20242a]"
        size={20}
        strokeWidth={2}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-[38px] w-full rounded-[22px] border border-[#c7cbd1] bg-[#fbfbfd] pl-12 pr-4 text-[14px] text-[#20242a] outline-none transition placeholder:text-[#5b626a] focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/15"
      />
    </label>
  );
}
