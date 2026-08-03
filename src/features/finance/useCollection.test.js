import { describe, it, expect } from "vitest";
import {
  buildPaymentPayload,
  findUnchargedFees,
  mapChargeRows,
  suggestPaymentType,
  summarizeDues,
} from "./useCollection";

const ledgerEntries = [
  {
    id: 500,
    entryType: "FEE_CHARGE",
    direction: "CREDIT",
    amount: "1500.00",
    description: "Tuition Fee",
    studentFeeId: 88,
    entryDate: "2026-07-01T00:00:00.000Z",
  },
  {
    id: 502,
    entryType: "FEE_CHARGE",
    direction: "CREDIT",
    amount: "1500.00",
    description: "Tuition Fee",
    studentFeeId: 88,
    entryDate: "2026-08-01T00:00:00.000Z",
  },
  {
    id: 503,
    entryType: "FINE_CHARGE",
    direction: "CREDIT",
    amount: "250.00",
    description: "Late fee - July",
    studentFeeId: null,
    entryDate: "2026-07-15T00:00:00.000Z",
  },
  {
    id: 504,
    entryType: "FEE_PAYMENT",
    direction: "DEBIT",
    amount: "1500.00",
    description: "Payment received (RCP-000123)",
    paymentId: 123,
    entryDate: "2026-07-30T00:00:00.000Z",
  },
];

describe("summarizeDues", () => {
  it("converts every money string to exact paise", () => {
    const result = summarizeDues({
      totalCharged: "1750.00",
      totalPaid: "1500.00",
      totalDiscount: "0.00",
      totalRefund: "0.00",
      outstanding: "250.00",
      breakdown: {
        feeCharges: "1500.00",
        fineCharges: "250.00",
        additionalCharges: "0.00",
        payments: "1500.00",
        discounts: "0.00",
        refunds: "0.00",
      },
    });

    expect(result.outstanding).toBe(25000);
    expect(result.totalCharged).toBe(175000);
    expect(result.breakdown.fineCharges).toBe(25000);
  });

  it("degrades to zeros rather than NaN when the payload is missing", () => {
    const result = summarizeDues(undefined);
    expect(result.outstanding).toBe(0);
    expect(result.breakdown.payments).toBe(0);
  });
});

describe("mapChargeRows", () => {
  it("keeps only CREDIT entries — payments are not charges", () => {
    const rows = mapChargeRows(ledgerEntries);
    expect(rows.every((row) => row.entryType !== "FEE_PAYMENT")).toBe(true);
  });

  it("groups repeat charges of the same description and sums them exactly", () => {
    const rows = mapChargeRows(ledgerEntries);
    const tuition = rows.find((row) => row.label === "Tuition Fee");

    expect(tuition.count).toBe(2);
    expect(tuition.amount).toBe(300000);
    expect(tuition.latestDate).toBe("2026-08-01T00:00:00.000Z");
  });

  it("separates fines from fees and orders by amount desc", () => {
    const rows = mapChargeRows(ledgerEntries);
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe("Tuition Fee");
    expect(rows[1]).toMatchObject({ entryType: "FINE_CHARGE", typeLabel: "Fine", amount: 25000 });
  });

  it("handles an empty or missing ledger", () => {
    expect(mapChargeRows([])).toEqual([]);
    expect(mapChargeRows(undefined)).toEqual([]);
  });
});

describe("findUnchargedFees", () => {
  // Assigning a fee creates a StudentFee row but posts nothing to the ledger.
  // Missing this means showing "nothing outstanding" to a student who owes money.
  const assignedFees = [
    { id: 88, isActive: true, classFee: { feeStructure: { amount: "1500.00", feeType: { name: "Tuition Fee" } } } },
    { id: 89, isActive: true, classFee: { feeStructure: { amount: "800.00", feeType: { name: "Lab Fee" } } } },
  ];

  it("returns fees that have no matching FEE_CHARGE entry", () => {
    const result = findUnchargedFees(assignedFees, ledgerEntries);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "89", label: "Lab Fee", amount: 80000 });
  });

  it("returns nothing once every fee has been charged", () => {
    const charged = [
      ...ledgerEntries,
      { entryType: "FEE_CHARGE", amount: "800.00", studentFeeId: 89, description: "Lab Fee" },
    ];
    expect(findUnchargedFees(assignedFees, charged)).toEqual([]);
  });

  it("prefers amountOverride over the structure amount", () => {
    const overridden = [{ id: 90, isActive: true, amountOverride: "1200.00", classFee: { feeStructure: { amount: "1500.00", feeType: { name: "Tuition Fee" } } } }];
    expect(findUnchargedFees(overridden, [])[0].amount).toBe(120000);
  });

  it("ignores inactive and soft-deleted assignments", () => {
    const mixed = [
      { id: 91, isActive: false, classFee: { feeStructure: { amount: "500.00" } } },
      { id: 92, isDeleted: true, classFee: { feeStructure: { amount: "500.00" } } },
    ];
    expect(findUnchargedFees(mixed, [])).toEqual([]);
  });

  it("treats an empty ledger as everything uncharged", () => {
    expect(findUnchargedFees(assignedFees, [])).toHaveLength(2);
  });
});

describe("suggestPaymentType", () => {
  it("calls an exact settlement FULL", () => {
    expect(suggestPaymentType(25000, 25000)).toBe("FULL");
  });

  it("calls a short payment PARTIAL", () => {
    expect(suggestPaymentType(10000, 25000)).toBe("PARTIAL");
  });

  it("calls an overpayment ADVANCE", () => {
    expect(suggestPaymentType(30000, 25000)).toBe("ADVANCE");
  });

  it("calls any payment against a cleared balance ADVANCE", () => {
    expect(suggestPaymentType(10000, 0)).toBe("ADVANCE");
    expect(suggestPaymentType(10000, -5000)).toBe("ADVANCE");
  });
});

describe("buildPaymentPayload", () => {
  const base = { studentId: "42", amountPaise: 150000, method: "UPI", paymentType: "FULL" };

  it("sends amount as a number, not a decimal string", () => {
    const payload = buildPaymentPayload(base);
    expect(payload.amount).toBe(1500);
    expect(payload.studentId).toBe(42);
  });

  it("converts sub-rupee amounts correctly", () => {
    expect(buildPaymentPayload({ ...base, amountPaise: 1 }).amount).toBe(0.01);
    expect(buildPaymentPayload({ ...base, amountPaise: 150050 }).amount).toBe(1500.5);
  });

  // forbidNonWhitelisted is on, and an empty referenceNo stores a meaningless
  // blank rather than null.
  it("omits blank optionals entirely", () => {
    const payload = buildPaymentPayload({ ...base, referenceNo: "   ", note: "" });
    expect(payload).not.toHaveProperty("referenceNo");
    expect(payload).not.toHaveProperty("note");
    expect(payload).not.toHaveProperty("paidAt");
  });

  it("trims and includes optionals that have content", () => {
    const payload = buildPaymentPayload({ ...base, referenceNo: " UPI-8829911 ", note: " July " });
    expect(payload.referenceNo).toBe("UPI-8829911");
    expect(payload.note).toBe("July");
  });

  it("sends paidAt as ISO-8601 when a date is picked", () => {
    const payload = buildPaymentPayload({ ...base, paidAt: "2026-07-30" });
    expect(payload.paidAt).toMatch(/^2026-07-\d{2}T/);
  });
});
