import { parseAmount } from "../../lib/currency";

export default function MoneyInput({
    value,
    onChange,
    disabled = false,
    placeholder = "0.00",
    id
}) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                ₹
            </span>
            <input
                id={id}
                type="text"
                inputMode="decimal"
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
                onBlur={(e) => onChange(e.target.value === "" ? "" : parseAmount(e.target.value).toFixed(2))}
                className="h-11 w-full rounded border border-slate-200 pl-7 pr-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50"
            />
        </div>
    );
};