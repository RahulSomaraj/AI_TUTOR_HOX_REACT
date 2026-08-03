import {
  PAYMENT_METHODS,
  REFERENCE_MAX_LENGTH,
  referenceConfigFor,
} from "./paymentMethods";

const FIELD_CLASS =
  "h-11 w-full rounded border border-slate-200 px-4 text-sm outline-none transition focus:border-[#155966] focus:ring-2 focus:ring-[#155966]/10 disabled:bg-slate-50";

export default function PaymentMethodFields({
  method,
  onMethodChange,
  referenceNo,
  onReferenceChange,
  paidAt,
  onPaidAtChange,
  note,
  onNoteChange,
  disabled = false,
  showReferenceError = false,
}) {
  const reference = referenceConfigFor(method);
  const referenceMissing =
    showReferenceError && Boolean(reference?.required) && !referenceNo?.trim();

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Payment Method *</span>
        <select
          value={method}
          onChange={(event) => onMethodChange(event.target.value)}
          disabled={disabled}
          className={FIELD_CLASS}
        >
          {PAYMENT_METHODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Payment Date</span>
        <input
          type="date"
          value={paidAt}
          onChange={(event) => onPaidAtChange(event.target.value)}
          disabled={disabled}
          className={FIELD_CLASS}
        />
        <span className="mt-1 block text-xs text-[#8b939b]">
          Defaults to today. Back-date it to match a cheque or bank statement.
        </span>
      </label>

      {reference && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {reference.label}
            {reference.required ? " *" : ""}
          </span>
          <input
            type="text"
            value={referenceNo}
            maxLength={REFERENCE_MAX_LENGTH}
            onChange={(event) => onReferenceChange(event.target.value)}
            disabled={disabled}
            placeholder={reference.placeholder}
            className={`${FIELD_CLASS} ${referenceMissing ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
          />
          <span
            className={`mt-1 block text-xs ${referenceMissing ? "text-red-600" : "text-[#8b939b]"}`}
          >
            {referenceMissing ? `${reference.label} is required for this method.` : reference.hint}
          </span>
        </label>
      )}

      <label className={`block ${reference ? "" : "sm:col-span-2"}`}>
        <span className="mb-1 block text-sm font-medium text-slate-700">Note</span>
        <input
          type="text"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          disabled={disabled}
          placeholder="e.g. July tuition"
          className={FIELD_CLASS}
        />
      </label>
    </div>
  );
}
