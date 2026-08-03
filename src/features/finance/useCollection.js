import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPayment } from "../../api/services/payments";
import {
  fetchFeeSummary,
  fetchLedger,
  generateFeeCharges,
} from "../../api/services/ledger";
import { fetchStudentFeesByStudent } from "../../api/services/finance";
import { extractList, safeId } from "../../api/normalize";
import { toPaise } from "../../lib/money";

const SUMMARY_ROOT = "feeSummary";
const LEDGER_ROOT = "ledger";
const PAYMENTS_ROOT = "payments";
const STUDENT_FEES_ROOT = "studentFees";

const CREDIT_TYPES = new Set(["FEE_CHARGE", "FINE_CHARGE", "ADDITIONAL_CHARGE"]);

const CHARGE_TYPE_LABELS = {
  FEE_CHARGE: "Fee",
  FINE_CHARGE: "Fine",
  ADDITIONAL_CHARGE: "Additional",
};

// ─── Pure selectors (unit-tested; no network, no hooks) ─────────────────────

/**
 * Fold the fee-summary payload's money strings into paise integers.
 * Everything downstream does integer arithmetic — see src/lib/money.js.
 */
export function summarizeDues(summary) {
  const breakdown = summary?.breakdown ?? {};
  return {
    outstanding: toPaise(summary?.outstanding),
    totalCharged: toPaise(summary?.totalCharged),
    totalPaid: toPaise(summary?.totalPaid),
    totalDiscount: toPaise(summary?.totalDiscount),
    totalRefund: toPaise(summary?.totalRefund),
    breakdown: {
      feeCharges: toPaise(breakdown.feeCharges),
      fineCharges: toPaise(breakdown.fineCharges),
      additionalCharges: toPaise(breakdown.additionalCharges),
      payments: toPaise(breakdown.payments),
      discounts: toPaise(breakdown.discounts),
      refunds: toPaise(breakdown.refunds),
    },
  };
}

/**
 * Group the ledger's CREDIT entries into one row per charge.
 *
 * ⚠️ These are charges, NOT per-fee balances. The backend allocates payments
 * against the student's overall balance, never against a specific fee — no
 * field links a payment to the charge it settles. A "balance per fee type" is
 * therefore not derivable, and apportioning payments to fake one would be a
 * fiction the ledger can't back up. Charges here; outstanding once, at the
 * student level.
 */
export function mapChargeRows(ledgerEntries) {
  const grouped = new Map();

  for (const entry of ledgerEntries ?? []) {
    if (!CREDIT_TYPES.has(entry?.entryType)) continue;

    const label = entry?.description || CHARGE_TYPE_LABELS[entry.entryType] || "Charge";
    const key = `${entry.entryType}::${label}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.amount += toPaise(entry?.amount);
      existing.count += 1;
      if (entry?.entryDate && entry.entryDate > existing.latestDate) {
        existing.latestDate = entry.entryDate;
      }
    } else {
      grouped.set(key, {
        key,
        label,
        entryType: entry.entryType,
        typeLabel: CHARGE_TYPE_LABELS[entry.entryType] ?? "Charge",
        amount: toPaise(entry?.amount),
        count: 1,
        latestDate: entry?.entryDate ?? null,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
}

/**
 * Fees assigned to the student that have never been charged to the ledger.
 *
 * Assigning a fee creates a StudentFee row but no ledger entry — the charge
 * only appears once `generate-fee-charges` runs. Without this check the page
 * shows "nothing outstanding" for a student who genuinely owes money, which is
 * the worst failure mode there is on a collections desk.
 */
export function findUnchargedFees(studentFees, ledgerEntries) {
  const charged = new Set(
    (ledgerEntries ?? [])
      .filter((entry) => entry?.entryType === "FEE_CHARGE" && entry?.studentFeeId != null)
      .map((entry) => safeId(entry.studentFeeId))
  );

  return (studentFees ?? [])
    .filter((fee) => fee?.isActive !== false && fee?.isDeleted !== true)
    .filter((fee) => !charged.has(safeId(fee?.id)))
    .map((fee) => ({
      id: safeId(fee?.id),
      label: fee?.classFee?.feeStructure?.feeType?.name ?? "Fee",
      amount: toPaise(fee?.amountOverride ?? fee?.classFee?.feeStructure?.amount),
    }));
}

/**
 * The `paymentType` the amount actually represents. It's only a label on the
 * backend — nothing validates it and the amount is never capped — but a payment
 * tagged FULL that didn't clear the balance makes later reports lie, so derive
 * it from the numbers and let the user override.
 */
export function suggestPaymentType(amountPaise, outstandingPaise) {
  if (amountPaise <= 0) return "FULL";
  if (outstandingPaise <= 0) return "ADVANCE";
  if (amountPaise > outstandingPaise) return "ADVANCE";
  if (amountPaise === outstandingPaise) return "FULL";
  return "PARTIAL";
}

/**
 * Build the POST body. Blank optionals are dropped rather than sent empty —
 * `forbidNonWhitelisted` is on, and `referenceNo: ""` stores a meaningless
 * empty reference instead of null.
 */
export function buildPaymentPayload({
  studentId,
  amountPaise,
  method,
  paymentType,
  referenceNo,
  paidAt,
  note,
}) {
  const payload = {
    studentId: Number(studentId),
    amount: Number((amountPaise / 100).toFixed(2)),
    method,
    paymentType,
  };

  const reference = referenceNo?.trim();
  const comment = note?.trim();
  if (reference) payload.referenceNo = reference;
  if (comment) payload.note = comment;
  if (paidAt) payload.paidAt = new Date(paidAt).toISOString();

  return payload;
}

// ─── Queries & mutations ───────────────────────────────────────────────────

/**
 * React Query retries three times by default, which is wrong for everything in
 * this module: a 404 (endpoint absent, or unknown student) and a 403 (wrong
 * role) give the same answer on the fourth attempt as the first. Retrying only
 * makes the failure take four times as long to surface, and triples the noise
 * in the console. Retry genuine blips — network drops and 5xx — and nothing else.
 */
function retryTransientOnly(failureCount, error) {
  const status = error?.response?.status;
  if (status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export function useFeeSummaryQuery(studentId) {
  return useQuery({
    queryKey: [SUMMARY_ROOT, safeId(studentId)],
    queryFn: async () => {
      const response = await fetchFeeSummary(studentId);
      return summarizeDues(response?.data ?? response);
    },
    enabled: Boolean(studentId),
    retry: retryTransientOnly,
  });
}

export function useLedgerQuery(studentId) {
  return useQuery({
    queryKey: [LEDGER_ROOT, safeId(studentId)],
    queryFn: async () => {
      const response = await fetchLedger(studentId);
      const body = response?.data ?? response;
      return {
        student: body?.student ?? null,
        entries: body?.entries ?? [],
        summary: body?.summary ?? null,
      };
    },
    enabled: Boolean(studentId),
    retry: retryTransientOnly,
  });
}

export function useStudentAssignedFeesQuery(studentId) {
  return useQuery({
    queryKey: [STUDENT_FEES_ROOT, "byStudent", safeId(studentId)],
    queryFn: async () => {
      const response = await fetchStudentFeesByStudent(studentId);
      return extractList(response, ["studentFees"]);
    },
    enabled: Boolean(studentId),
    retry: retryTransientOnly,
  });
}

/** Everything the collection screen shows becomes stale once money moves. */
function useInvalidateStudentMoney() {
  const queryClient = useQueryClient();
  return (studentId) => {
    const id = safeId(studentId);
    queryClient.invalidateQueries({ queryKey: [SUMMARY_ROOT, id] });
    queryClient.invalidateQueries({ queryKey: [LEDGER_ROOT, id] });
    queryClient.invalidateQueries({ queryKey: [STUDENT_FEES_ROOT, "byStudent", id] });
    queryClient.invalidateQueries({ queryKey: [PAYMENTS_ROOT] });
  };
}

export function useCollectPayment() {
  const invalidate = useInvalidateStudentMoney();
  return useMutation({
    mutationFn: (payload) => createPayment(payload),
    onSuccess: (_data, variables) => invalidate(variables?.studentId),
  });
}

export function useGenerateFeeCharges() {
  const invalidate = useInvalidateStudentMoney();
  return useMutation({
    mutationFn: (studentId) => generateFeeCharges(studentId),
    onSuccess: (_data, studentId) => invalidate(studentId),
  });
}
