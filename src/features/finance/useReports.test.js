import { describe, it, expect } from "vitest";
import {
  buildReportParams,
  fillDailyBuckets,
  fillMonthlyBuckets,
  mapClassRows,
  mapDueStudentRows,
  mapFeeTypeRows,
  mapMethodRows,
} from "./useReports";

describe("fillDailyBuckets", () => {
  // The API omits days with no payments. Plotting the sparse array directly
  // draws a line straight over the gaps, which reads as steady collection.
  const sparse = [
    { date: "2026-08-01", total: "15000.00", count: 10 },
    { date: "2026-08-04", total: "30000.00", count: 20 },
  ];

  it("inserts zero buckets for the missing days", () => {
    const filled = fillDailyBuckets(sparse, "2026-08-01", "2026-08-04");
    expect(filled.map((b) => b.key)).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
    ]);
    expect(filled.map((b) => b.total)).toEqual([1500000, 0, 0, 3000000]);
    expect(filled.map((b) => b.count)).toEqual([10, 0, 0, 20]);
  });

  it("spans the requested range even when it extends past the data", () => {
    const filled = fillDailyBuckets(sparse, "2026-07-30", "2026-08-05");
    expect(filled).toHaveLength(7);
    expect(filled[0]).toMatchObject({ key: "2026-07-30", total: 0 });
    expect(filled.at(-1)).toMatchObject({ key: "2026-08-05", total: 0 });
  });

  it("derives the range from the data when no bounds are given", () => {
    const filled = fillDailyBuckets(sparse);
    expect(filled).toHaveLength(4);
  });

  it("handles a single day", () => {
    const filled = fillDailyBuckets([{ date: "2026-08-01", total: "500.00", count: 1 }]);
    expect(filled).toEqual([
      { key: "2026-08-01", label: "2026-08-01", total: 50000, count: 1 },
    ]);
  });

  it("returns nothing for an empty series rather than throwing", () => {
    expect(fillDailyBuckets([])).toEqual([]);
    expect(fillDailyBuckets(undefined)).toEqual([]);
  });

  it("falls back to the raw buckets when the range is inverted", () => {
    const filled = fillDailyBuckets(sparse, "2026-08-04", "2026-08-01");
    expect(filled).toHaveLength(2);
  });

  it("crosses a month boundary correctly", () => {
    const filled = fillDailyBuckets([], "2026-07-30", "2026-08-02");
    expect(filled.map((b) => b.key)).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });
});

describe("fillMonthlyBuckets", () => {
  it("inserts zero buckets for missing months", () => {
    const filled = fillMonthlyBuckets(
      [
        { month: "2026-01", total: "1000.00", count: 2 },
        { month: "2026-04", total: "2000.00", count: 3 },
      ],
      "2026-01-01",
      "2026-04-30"
    );
    expect(filled.map((b) => b.key)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(filled.map((b) => b.total)).toEqual([100000, 0, 0, 200000]);
  });

  it("crosses a year boundary", () => {
    const filled = fillMonthlyBuckets([], "2025-11-01", "2026-02-01");
    expect(filled.map((b) => b.key)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("handles an empty series", () => {
    expect(fillMonthlyBuckets([])).toEqual([]);
  });
});

describe("mapMethodRows", () => {
  it("sorts biggest first — the API returns them unsorted", () => {
    const rows = mapMethodRows([
      { method: "CASH", total: "15000.00", count: 10 },
      { method: "UPI", total: "30000.00", count: 20 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["UPI", "CASH"]);
    expect(rows[0]).toMatchObject({ label: "UPI", value: 3000000, count: 20 });
  });

  it("labels every documented method", () => {
    const rows = mapMethodRows([
      { method: "NET_BANKING", total: "1.00" },
      { method: "BANK_TRANSFER", total: "1.00" },
      { method: "CREDIT_CARD", total: "1.00" },
    ]);
    expect(rows.map((r) => r.label).sort()).toEqual([
      "Bank Transfer",
      "Credit Card",
      "Net Banking",
    ]);
  });

  it("falls back to the raw value for an unknown method", () => {
    expect(mapMethodRows([{ method: "CRYPTO", total: "1.00" }])[0].label).toBe("CRYPTO");
  });
});

describe("mapFeeTypeRows", () => {
  it("reads `charged`, which is billed and not collected", () => {
    const rows = mapFeeTypeRows([
      { feeTypeId: 5, feeTypeName: "Tuition Fee", code: "TUITION", charged: "120000.00", chargeCount: 80 },
    ]);
    expect(rows[0]).toMatchObject({ key: "5", label: "Tuition Fee", value: 12000000, count: 80 });
  });

  it("handles an empty list", () => {
    expect(mapFeeTypeRows(undefined)).toEqual([]);
  });
});

describe("mapClassRows", () => {
  // gradeId: null is a real bucket — students with no class aggregate into it,
  // and reading grade.aliasName off it throws.
  it("renders the null-grade bucket as Unassigned instead of crashing", () => {
    const rows = mapClassRows([
      { gradeId: null, studentCount: 3, outstanding: "20000.00", grade: null },
    ]);
    expect(rows[0]).toMatchObject({
      key: "unassigned",
      label: "Unassigned",
      isUnassigned: true,
      value: 2000000,
      count: 3,
    });
  });

  it("maps a normal class with its school", () => {
    const rows = mapClassRows([
      {
        gradeId: 7,
        studentCount: 12,
        outstanding: "150000.00",
        grade: { id: 7, aliasName: "5A", school: { id: 1, schoolName: "Greenwood High" } },
      },
    ]);
    expect(rows[0]).toMatchObject({
      key: "7",
      label: "5A",
      school: "Greenwood High",
      isUnassigned: false,
      value: 15000000,
    });
  });
});

describe("mapDueStudentRows", () => {
  it("flattens the nested student and converts money", () => {
    const rows = mapDueStudentRows([
      {
        student: { id: 57, name: "Ravi Kumar", studentCode: "GHS-2026-000057", rollNo: 12 },
        outstanding: "12500.00",
        dueDate: "2026-07-15T00:00:00.000Z",
        daysOverdue: 20,
        status: "OVERDUE",
      },
    ]);
    expect(rows[0]).toMatchObject({
      id: "57",
      name: "Ravi Kumar",
      outstanding: 1250000,
      daysOverdue: 20,
      status: "OVERDUE",
    });
  });

  it("tolerates a null due date — those stay DUE forever, never OVERDUE", () => {
    const rows = mapDueStudentRows([
      { student: { id: 1, name: "A" }, outstanding: "100.00", dueDate: null, status: "DUE" },
    ]);
    expect(rows[0].dueDate).toBeNull();
    expect(rows[0].daysOverdue).toBe(0);
  });
});

describe("buildReportParams", () => {
  it("omits every empty value — forbidNonWhitelisted rejects junk", () => {
    expect(buildReportParams({ schoolId: "", gradeId: "", from: "", to: "" })).toEqual({});
    expect(buildReportParams(undefined)).toEqual({});
  });

  it("coerces ids to numbers and passes dates through", () => {
    expect(buildReportParams({ schoolId: "18", gradeId: "62", from: "2026-08-01" })).toEqual({
      schoolId: 18,
      gradeId: 62,
      from: "2026-08-01",
    });
  });
});
