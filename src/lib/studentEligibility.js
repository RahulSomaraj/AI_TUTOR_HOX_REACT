// Attendance eligibility for a student.
//
// The backend's attendance validator requires all of:
//   isDeleted: false · isActive · isTermsAccepted · isVerified · isAcademicInfoComplete
// and `isAcademicInfoComplete` is a stored column recomputed on every create and
// update as `gradeId != null && schoolId != null && rollNo != null`.
//
// `GET /users` returns every one of these flags, so we can tell an admin exactly
// what's missing *before* they fill in an attendance form, rather than after the
// submit fails. That's the whole point of this module.

/**
 * @param {object} student a row from GET /users
 * @returns {{eligible: boolean, missing: string[]}} human-readable blockers
 */
export function getStudentEligibility(student) {
  const missing = [];

  if (student?.isDeleted) missing.push("Deleted");
  if (student?.isActive === false) missing.push("Inactive");
  if (!student?.isVerified) missing.push("Not verified");
  if (!student?.isTermsAccepted) missing.push("Terms not accepted");

  if (!student?.isAcademicInfoComplete) {
    // Name the specific field rather than the flag — "academic info incomplete"
    // tells an admin nothing about what to go and fix.
    const rollNo = student?.rollNo;
    const gradeId = student?.gradeId ?? student?.grade?.id;
    const schoolId = student?.schoolId ?? student?.school?.id;

    if (rollNo === null || rollNo === undefined || rollNo === "") missing.push("No roll number");
    else if (!gradeId) missing.push("No class assigned");
    else if (!schoolId) missing.push("No school assigned");
    else missing.push("Academic info incomplete");
  }

  return { eligible: missing.length === 0, missing };
}

/** One-line summary for a tooltip or a table cell. */
export function eligibilityLabel(student) {
  const { eligible, missing } = getStudentEligibility(student);
  return eligible ? "Eligible" : missing.join(" · ");
}
