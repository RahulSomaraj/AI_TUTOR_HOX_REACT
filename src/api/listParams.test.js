import { describe, it, expect } from "vitest";
import { MAX_PAGE_SIZE, buildListParams } from "./listParams";

describe("buildListParams", () => {
  it("passes page and limit through as numbers", () => {
    expect(buildListParams({ page: "2", limit: "10" })).toEqual({ page: 2, limit: 10 });
  });

  // Over the cap the server 400s, so clamping is the difference between a
  // working screen and a broken one.
  it("clamps limit to the server maximum", () => {
    expect(buildListParams({ limit: 500 }).limit).toBe(MAX_PAGE_SIZE);
    expect(buildListParams({ limit: 50 }).limit).toBe(50);
  });

  // Pagination is opt-in: omitting both returns the complete set, which is what
  // screens that export or cross-reference the whole list rely on.
  it("omits pagination entirely when neither is given", () => {
    expect(buildListParams({ schoolId: 18 })).toEqual({ schoolId: 18 });
  });

  it("trims search and drops it when blank", () => {
    expect(buildListParams({ search: "  tuition  " })).toEqual({ search: "tuition" });
    expect(buildListParams({ search: "   " })).toEqual({});
    expect(buildListParams({ search: "" })).toEqual({});
  });

  // forbidNonWhitelisted rejects an empty string as an int or a date, so these
  // have to be absent rather than empty.
  it("drops empty, null and undefined filters", () => {
    expect(
      buildListParams({ schoolId: "", gradeId: null, academicYearId: undefined, classFeeId: 30 })
    ).toEqual({ classFeeId: 30 });
  });

  it("keeps a legitimate zero and false", () => {
    expect(buildListParams({ rollNo: 0, isActive: false })).toEqual({ rollNo: 0, isActive: false });
  });

  it("passes arbitrary filters through untouched", () => {
    expect(buildListParams({ method: "UPI", from: "2026-08-01" })).toEqual({
      method: "UPI",
      from: "2026-08-01",
    });
  });

  it("handles no input at all", () => {
    expect(buildListParams()).toEqual({});
    expect(buildListParams(undefined)).toEqual({});
  });
});
