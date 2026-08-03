import { Printer, RotateCcw } from "lucide-react";
import { formatINR } from "../../lib/currency";
import { METHOD_LABELS } from "./paymentMethods";

const PAYMENT_TYPE_LABELS = {
  FULL: "Full payment",
  PARTIAL: "Part payment",
  ADVANCE: "Advance",
  INSTALLMENT: "Installment",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-[#5b626a]">{label}</span>
      <span
        className={`text-right text-sm ${strong ? "text-[16px] font-semibold text-[#20242a]" : "font-medium text-[#2a2d32]"}`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Payment receipt.
 *
 * The backend has no server-rendered receipt file — `GET /fee-payments/:id/receipt`
 * returns JSON, so the printable artifact is this markup plus the browser's
 * print dialog ("Save as PDF" covers the download case). Everything shown here
 * comes from the POST response, which already carries the payment, the ledger
 * entry and the post-payment balance; no extra fetch is needed.
 */
export default function ReceiptView({ payment, balance, student, onCollectAnother }) {
  const outstandingAfter = formatINR(balance);
  const isSettled = Number(balance) <= 0;

  return (
    <>
      {/*
        Print isolation. The receipt lives inside the admin shell (sidebar,
        navbar, stepper), none of which belongs on paper. Hiding everything and
        re-showing this subtree is the one approach that doesn't require the
        layout components to know a print mode exists.
      */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
          #receipt-print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; padding: 0 !important;
          }
          .receipt-no-print { display: none !important; }
        }
      `}</style>

      <div className="rounded-[18px] bg-white px-5 py-6 shadow-[0_8px_24px_rgba(18,53,64,0.06)] sm:px-8 sm:py-8">
        <div id="receipt-print-area">
          <div className="border-b border-dashed border-[#d8dee2] pb-5">
            <p className="text-[13px] uppercase tracking-[1px] text-[#8b939b]">Payment Receipt</p>
            <h2 className="mt-1 text-[26px] font-bold text-[#20242a]">
              {payment?.receiptNo ?? "-"}
            </h2>
            <p className="mt-1 text-sm text-[#5b626a]">{formatDateTime(payment?.paidAt)}</p>
          </div>

          <div className="border-b border-dashed border-[#d8dee2] py-4">
            <Row label="Student" value={student?.name ?? "-"} />
            <Row label="Student Code" value={student?.studentCode || "-"} />
          </div>

          <div className="border-b border-dashed border-[#d8dee2] py-4">
            <Row label="Amount Paid" value={formatINR(payment?.amount)} strong />
            <Row label="Method" value={METHOD_LABELS[payment?.method] ?? payment?.method ?? "-"} />
            <Row
              label="Payment Type"
              value={PAYMENT_TYPE_LABELS[payment?.paymentType] ?? payment?.paymentType ?? "-"}
            />
            {payment?.referenceNo && <Row label="Reference" value={payment.referenceNo} />}
            {payment?.note && <Row label="Note" value={payment.note} />}
          </div>

          <div className="pt-4">
            <Row
              label={isSettled ? "Balance" : "Outstanding After Payment"}
              value={outstandingAfter}
              strong
            />
            {Number(balance) < 0 && (
              <p className="mt-1 text-xs text-sky-700">
                Negative balance — this student has paid in advance.
              </p>
            )}
          </div>
        </div>

        <div className="receipt-no-print mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded bg-[#155966] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#104a55]"
          >
            <Printer size={16} />
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onCollectAnother}
            className="inline-flex items-center justify-center gap-2 rounded border border-[#155966] px-5 py-3 text-sm font-semibold text-[#155966] transition hover:bg-[#eef6f9]"
          >
            <RotateCcw size={16} />
            Collect Another Payment
          </button>
        </div>
      </div>
    </>
  );
}
