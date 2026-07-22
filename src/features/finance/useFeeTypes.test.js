import { describe, it, expect } from "vitest";
import { selectFeeTypes } from "./useFeeTypes";

const rows = [
  { id: 1, name: "Tuition Fee", code: "TUITION" },
  { id: 2, name: "Admission Fee", code: "ADMISSION" },
  { id: 3, name: "Library Fee", code: "LIBRARY" },
  { id: 4, name: "Exam Fee", code: "EXAM" },
  { id: 5, name: "Late Payment Fine", code: "LATE_FINE" },
];

describe("selectFeeTypes — pagination", () => {
  it("returns the first page and reports totals", () => {
    const { raw, pagination } = selectFeeTypes(rows, { page: 1, limit: 2, search: "" });
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
    const { raw, pagination } = selectFeeTypes(rows, { page: 3, limit: 2, search: "" });
    expect(raw).toHaveLength(1);
    expect(pagination).toMatchObject({ currentPage: 3, hasPrev: true, hasNext: false });
  });

  it("clamps an out-of-range page to the last page", () => {
    const { pagination } = selectFeeTypes(rows, { page: 99, limit: 2, search: "" });
    expect(pagination.currentPage).toBe(3);
  });

  it("keeps totalPages at 1 when there are no rows", () => {
    const { raw, pagination } = selectFeeTypes([], { page: 1, limit: 10, search: "" });
    expect(raw).toHaveLength(0);
    expect(pagination).toMatchObject({ totalPages: 1, totalCount: 0, hasNext: false });
  });
});

describe("selectFeeTypes — search", () => {
  it("matches on name, case-insensitively", () => {
    const { raw, pagination } = selectFeeTypes(rows, { page: 1, limit: 10, search: "library" });
    expect(raw).toHaveLength(1);
    expect(raw[0].code).toBe("LIBRARY");
    expect(pagination.totalCount).toBe(1);
  });

  it("matches on code", () => {
    const { raw } = selectFeeTypes(rows, { page: 1, limit: 10, search: "LATE_FINE" });
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(5);
  });

  it("ignores surrounding whitespace", () => {
    const { raw } = selectFeeTypes(rows, { page: 1, limit: 10, search: "  exam  " });
    expect(raw).toHaveLength(1);
  });

  it("returns everything when search is empty", () => {
    const { raw } = selectFeeTypes(rows, { page: 1, limit: 10, search: "" });
    expect(raw).toHaveLength(5);
  });

  it("returns nothing for a non-match", () => {
    const { raw, pagination } = selectFeeTypes(rows, { page: 1, limit: 10, search: "zzz" });
    expect(raw).toHaveLength(0);
    expect(pagination.totalCount).toBe(0);
  });
});