import { describe, it, expect } from "vitest";
import { selectAcademicYears } from "./useAcademicYears";

const rows = [
  { id: 1, name: "2022-2023", isActive: false },
  { id: 2, name: "2023-2024", isActive: false },
  { id: 3, name: "2024-2025", isActive: false },
  { id: 4, name: "2025-2026", isActive: true },
  { id: 5, name: "2026-2027", isActive: false },
];

describe("selectAcademicYears — pagination", () => {
  it("returns the first page and reports totals", () => {
    const { raw, pagination } = selectAcademicYears(rows, { page: 1, limit: 2, search: "" });
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
    const { raw, pagination } = selectAcademicYears(rows, { page: 3, limit: 2, search: "" });
    expect(raw).toHaveLength(1);
    expect(pagination).toMatchObject({ currentPage: 3, hasPrev: true, hasNext: false });
  });

  it("clamps an out-of-range page to the last page", () => {
    const { pagination } = selectAcademicYears(rows, { page: 99, limit: 2, search: "" });
    expect(pagination.currentPage).toBe(3);
  });

  it("keeps totalPages at 1 when there are no rows", () => {
    const { raw, pagination } = selectAcademicYears([], { page: 1, limit: 10, search: "" });
    expect(raw).toHaveLength(0);
    expect(pagination).toMatchObject({ totalPages: 1, totalCount: 0, hasNext: false });
  });
});

describe("selectAcademicYears — search", () => {
  it("matches on name by substring", () => {
    const { raw } = selectAcademicYears(rows, { page: 1, limit: 10, search: "2025-2026" });
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(4);
  });

  it("ignores surrounding whitespace", () => {
    const { raw } = selectAcademicYears(rows, { page: 1, limit: 10, search: "  2026-2027  " });
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(5);
  });

  it("returns everything when search is empty", () => {
    const { raw } = selectAcademicYears(rows, { page: 1, limit: 10, search: "" });
    expect(raw).toHaveLength(5);
  });

  it("returns nothing for a non-match", () => {
    const { raw, pagination } = selectAcademicYears(rows, { page: 1, limit: 10, search: "1999" });
    expect(raw).toHaveLength(0);
    expect(pagination.totalCount).toBe(0);
  });
});
