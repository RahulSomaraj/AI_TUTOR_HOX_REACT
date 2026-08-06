import { describe, it, expect } from "vitest";
import {
  buildStatementParams,
  entryTypeLabel,
  mapStatementRows,
  summarizeStatement,
} from "./useLedger";

const statement = {
  student: { id: 42, name: "John Doe", studentCode: "STU00042" },
  period: { from: "2026-07-01T00:00:00.000Z", to: "2026-07-31T00:00:00.000Z" },
  openingBalance: "0.00",
  closingBalance: "250.00",
  totals: { totalCredit: "1750.00", totalDebit: "1500.00" },
  rows: [
    {
      date: "2026-07-01T00:00:00.000Z",
      description: "Tuition Fee",
      type: "FEE_CHARGE",
      credit: "1500.00",
      debit: null,
      balance: "1500.00",
    },
    {
      date: "2026-07-15T00:00:00.000Z",
      description: "Late fee - July",
      type: "FINE_CHARGE",
      credit: "250.00",
      debit: null,
      balance: "1750.00",
    },
    {
      date: "2026-07-30T10:35:00.000Z",
      description: "Payment received (RCP-000123)",
      type: "FEE_PAYMENT",
      credit: null,
      debit: "1500.00",
      balance: "250.00",
    },
  ],
};

describe("mapStatementRows", () => {
  it("keeps credit and debit as separate nullable columns", () => {
    const rows = mapStatementRows(statement);

    expect(rows[0]).toMatchObject({ credit: 150000, debit: null });
    expect(rows[2]).toMatchObject({ credit: null, debit: 150000 });
  });

  // null and 0 must not collapse: an empty cell and a genuine zero are
  // different things on a statement.
  it("preserves a zero amount as 0, not null", () => {
    const rows = mapStatementRows({ rows: [{ credit: "0.00", debit: null, balance: "0.00" }] });
    expect(rows[0].credit).toBe(0);
    expect(rows[0].debit).toBeNull();
  });

  it("carries the server-computed running balance through untouched", () => {
    const rows = mapStatementRows(statement);
    expect(rows.map((row) => row.balance)).toEqual([150000, 175000, 25000]);
  });

  it("labels entry types for display", () => {
    const rows = mapStatementRows(statement);
    expect(rows.map((row) => row.typeLabel)).toEqual(["Fee charge", "Fine", "Payment"]);
  });

  it("gives every row a stable unique key", () => {
    const rows = mapStatementRows(statement);
    expect(new Set(rows.map((row) => row.key)).size).toBe(3);
  });

  it("handles a missing or empty statement", () => {
    expect(mapStatementRows(undefined)).toEqual([]);
    expect(mapStatementRows({ rows: [] })).toEqual([]);
  });
});

describe("summarizeStatement", () => {
  it("converts balances and totals to paise", () => {
    expect(summarizeStatement(statement)).toMatchObject({
      openingBalance: 0,
      closingBalance: 25000,
      totalCredit: 175000,
      totalDebit: 150000,
    });
  });

  it("keeps the period bounds, which are null when unfiltered", () => {
    const result = summarizeStatement({ ...statement, period: { from: null, to: null } });
    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
  });

  it("handles a negative closing balance (student in advance)", () => {
    expect(summarizeStatement({ closingBalance: "-500.00" }).closingBalance).toBe(-50000);
  });

  it("degrades to zeros rather than NaN", () => {
    expect(summarizeStatement(undefined)).toMatchObject({ openingBalance: 0, closingBalance: 0 });
  });
});

describe("buildStatementParams", () => {
  it("omits absent bounds entirely — forbidNonWhitelisted rejects empty strings", () => {
    expect(buildStatementParams({ from: "", to: "" })).toEqual({});
    expect(buildStatementParams(undefined)).toEqual({});
  });

  it("sends ISO-8601 for the bounds that are set", () => {
    const params = buildStatementParams({ from: "2026-07-01", to: "" });
    expect(params.from).toMatch(/^2026-0[67]-\d{2}T/);
    expect(params).not.toHaveProperty("to");
  });

  // Pagination is opt-in: omitting both is how the exports ask for the whole
  // period rather than whichever page is on screen.
  it("omits page and limit when not given", () => {
    const params = buildStatementParams({ from: "2026-07-01" });
    expect(params).not.toHaveProperty("page");
    expect(params).not.toHaveProperty("limit");
  });

  it("passes page and limit through, clamped to the server maximum", () => {
    expect(buildStatementParams({ page: 3, limit: 20 })).toMatchObject({ page: 3, limit: 20 });
    expect(buildStatementParams({ limit: 500 }).limit).toBe(50);
  });
});

describe("entryTypeLabel", () => {
  it("maps every documented ledger entry type", () => {
    expect(entryTypeLabel("FEE_CHARGE")).toBe("Fee charge");
    expect(entryTypeLabel("ADDITIONAL_CHARGE")).toBe("Additional charge");
    expect(entryTypeLabel("DISCOUNT")).toBe("Discount");
    expect(entryTypeLabel("REFUND")).toBe("Refund");
  });

  it("falls back to the raw value for anything unrecognised", () => {
    expect(entryTypeLabel("NEW_TYPE")).toBe("NEW_TYPE");
    expect(entryTypeLabel(null)).toBe("-");
  });
});
