import { describe, it, expect } from "vitest";
import { eligibilityLabel, getStudentEligibility } from "./studentEligibility";

const eligible = {
  id: 60,
  isActive: true,
  isVerified: true,
  isTermsAccepted: true,
  isAcademicInfoComplete: true,
  rollNo: 12,
  gradeId: 61,
  schoolId: 1,
};

describe("getStudentEligibility", () => {
  it("passes a fully set-up student", () => {
    expect(getStudentEligibility(eligible)).toEqual({ eligible: true, missing: [] });
  });

  it("reports each backend condition separately", () => {
    expect(getStudentEligibility({ ...eligible, isVerified: false }).missing).toEqual([
      "Not verified",
    ]);
    expect(getStudentEligibility({ ...eligible, isTermsAccepted: false }).missing).toEqual([
      "Terms not accepted",
    ]);
    expect(getStudentEligibility({ ...eligible, isActive: false }).missing).toEqual(["Inactive"]);
    expect(getStudentEligibility({ ...eligible, isDeleted: true }).missing).toEqual(["Deleted"]);
  });

  it("accumulates every blocker, not just the first", () => {
    const { eligible: ok, missing } = getStudentEligibility({
      ...eligible,
      isVerified: false,
      isTermsAccepted: false,
    });
    expect(ok).toBe(false);
    expect(missing).toEqual(["Not verified", "Terms not accepted"]);
  });

  // The backend recomputes isAcademicInfoComplete as gradeId && schoolId &&
  // rollNo. "Academic info incomplete" tells an admin nothing actionable, so we
  // name the actual missing field.
  it("names the missing roll number rather than the flag", () => {
    const student = { ...eligible, isAcademicInfoComplete: false, rollNo: null };
    expect(getStudentEligibility(student).missing).toEqual(["No roll number"]);
  });

  it("treats an empty-string roll number as missing", () => {
    const student = { ...eligible, isAcademicInfoComplete: false, rollNo: "" };
    expect(getStudentEligibility(student).missing).toEqual(["No roll number"]);
  });

  it("accepts roll number zero — 0 is a legitimate roll number, not absence", () => {
    const student = { ...eligible, isAcademicInfoComplete: false, rollNo: 0 };
    expect(getStudentEligibility(student).missing).not.toContain("No roll number");
  });

  it("falls back to class then school when the roll number is present", () => {
    expect(
      getStudentEligibility({ ...eligible, isAcademicInfoComplete: false, gradeId: null }).missing
    ).toEqual(["No class assigned"]);
    expect(
      getStudentEligibility({ ...eligible, isAcademicInfoComplete: false, schoolId: null }).missing
    ).toEqual(["No school assigned"]);
  });

  it("reads nested grade/school objects when the flat ids are absent", () => {
    const student = {
      ...eligible,
      isAcademicInfoComplete: false,
      gradeId: undefined,
      schoolId: undefined,
      grade: { id: 61 },
      school: { id: 1 },
    };
    expect(student.rollNo).toBe(12);
    expect(getStudentEligibility(student).missing).toEqual(["Academic info incomplete"]);
  });

  it("treats a missing/undefined student as ineligible rather than throwing", () => {
    expect(getStudentEligibility(undefined).eligible).toBe(false);
    expect(getStudentEligibility({}).eligible).toBe(false);
  });
});

describe("eligibilityLabel", () => {
  it("summarises the pass case", () => {
    expect(eligibilityLabel(eligible)).toBe("Eligible");
  });

  it("joins multiple blockers into one line", () => {
    expect(eligibilityLabel({ ...eligible, isVerified: false, isTermsAccepted: false })).toBe(
      "Not verified · Terms not accepted"
    );
  });
});
