import { Loader2 } from "lucide-react";

// Generic confirmation dialog. Replaces the per-page delete modals and the
// native window.confirm() calls scattered across pages.
export default function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  tone = "danger",
  onCancel,
  onConfirm,
}) {
  const confirmCls =
    tone === "danger"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-[#155966] hover:bg-[#104a55]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[22px] bg-white p-7 text-center shadow-2xl">
        <h2 className="text-lg font-semibold text-[#20242a]">{title}</h2>
        <div className="mt-2 text-sm text-[#5b626a]">{message}</div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-[#d7dde2] py-2.5 text-sm font-medium text-[#5b626a] transition hover:bg-[#f7fafb] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${confirmCls}`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
