import { describe, it, expect } from "vitest";
import { selectFeeStructures } from "./useFeeStructures";

const rows = [
  { id: 1, feeType: { name: "Tuition Fee", code: "TUITION" }, academicYear: { name: "2025-2026" } },
  { id: 2, feeType: { name: "Admission Fee", code: "ADMISSION" }, academicYear: { name: "2025-2026" } },
  { id: 3, feeType: { name: "Library Fee", code: "LIBRARY" }, academicYear: { name: "2026-2027" } },
  { id: 4, feeType: { name: "Exam Fee", code: "EXAM" }, academicYear: { name: "2026-2027" } },
  { id: 5, feeType: { name: "Late Payment Fine", code: "LATE_FINE" }, academicYear: { name: "2027-2028" } },
];

describe("selectFeeStructures — pagination", () => {
  it("returns the first page and reports totals", () => {
    const { raw, pagination } = selectFeeStructures(rows, { page: 1, limit: 2, search: "" });
    expect(raw).toHaveLength(2);
    expect(pagination).toMatchObject({
      currentPage: 1,
      totalPages: 3,
      totalCount: 5,
      hasPrev: false,
      hasNext: true,
    });
  });

  it("returns the last (partial) page", () => {
    const { raw, pagination } = selectFeeStructures(rows, { page: 3, limit: 2, search: "" });
    expect(raw).toHaveLength(1);
    expect(pagination).toMatchObject({ currentPage: 3, hasPrev: true, hasNext: false });
  });

  it("clamps an out-of-range page to the last page", () => {
    const { pagination } = selectFeeStructures(rows, { page: 99, limit: 2, search: "" });
    expect(pagination.currentPage).toBe(3);
  });

  it("keeps totalPages at 1 when there are no rows", () => {
    const { raw, pagination } = selectFeeStructures([], { page: 1, limit: 10, search: "" });
    expect(raw).toHaveLength(0);
    expect(pagination).toMatchObject({ totalPages: 1, totalCount: 0, hasNext: false });
  });
});

describe("selectFeeStructures — search", () => {
  it("matches on fee type name, case-insensitively", () => {
    const { raw, pagination } = selectFeeStructures(rows, { page: 1, limit: 10, search: "library" });
    expect(raw).toHaveLength(1);
    expect(raw[0].feeType.code).toBe("LIBRARY");
    expect(pagination.totalCount).toBe(1);
  });

  it("matches on fee type code", () => {
    const { raw } = selectFeeStructures(rows, { page: 1, limit: 10, search: "LATE_FINE" });
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(5);
  });

  it("matches on academic year name", () => {
    const { raw } = selectFeeStructures(rows, { page: 1, limit: 10, search: "2027-2028" });
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(5);
  });

  it("ignores surrounding whitespace", () => {
    const { raw } = selectFeeStructures(rows, { page: 1, limit: 10, search: "  exam  " });
    expect(raw).toHaveLength(1);
  });

  it("returns everything when search is empty", () => {
    const { raw } = selectFeeStructures(rows, { page: 1, limit: 10, search: "" });
    expect(raw).toHaveLength(5);
  });

  it("returns nothing for a non-match", () => {
    const { raw, pagination } = selectFeeStructures(rows, { page: 1, limit: 10, search: "zzz" });
    expect(raw).toHaveLength(0);
    expect(pagination.totalCount).toBe(0);
  });
});
