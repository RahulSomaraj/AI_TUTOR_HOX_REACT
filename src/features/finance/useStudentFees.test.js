import { describe, it, expect } from "vitest";
import { mapAssignmentRows } from "./useStudentFees";

const students = [
  { id: 101, name: "Asha Menon", studentCode: "GHS-2026-000101", contactEmail: "asha@example.com" },
  { id: 102, name: "Ben Varghese", studentCode: "GHS-2026-000102", contactEmail: "ben@example.com" },
  { id: 103, name: "Chitra Nair", studentCode: "GHS-2026-000103", contactEmail: "" },
];

describe("mapAssignmentRows", () => {
  it("marks students with a matching student-fee as assigned", () => {
    const studentFees = [{ id: 500, studentId: 102, classFeeId: 9 }];
    const rows = mapAssignmentRows(students, studentFees);

    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.id === "101").isAssigned).toBe(false);
    expect(rows.find((r) => r.id === "102")).toMatchObject({ isAssigned: true, studentFeeId: "500" });
    expect(rows.find((r) => r.id === "103").isAssigned).toBe(false);
  });

  it("marks everyone unassigned when the student-fee list is empty", () => {
    const rows = mapAssignmentRows(students, []);
    expect(rows.every((r) => !r.isAssigned)).toBe(true);
    expect(rows.every((r) => r.studentFeeId === null)).toBe(true);
  });

  it("handles a missing/undefined student-fee list", () => {
    const rows = mapAssignmentRows(students, undefined);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => !r.isAssigned)).toBe(true);
  });

  it("falls back to placeholder fields when student data is sparse", () => {
    const rows = mapAssignmentRows([{ id: 200 }], []);
    expect(rows[0]).toMatchObject({
      id: "200",
      name: "Unnamed Student",
      studentCode: "-",
      contactEmail: "",
    });
  });

  it("returns an empty array for an empty student list", () => {
    expect(mapAssignmentRows([], [])).toEqual([]);
  });
});
