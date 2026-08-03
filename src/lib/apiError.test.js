import { describe, it, expect } from "vitest";
import { apiErrorMessage, isEndpointMissing } from "./apiError";

const missingRoute = {
  response: {
    status: 404,
    data: { message: "Cannot GET /students/57/fees/summary", statusCode: 404 },
  },
};

const missingRecord = {
  response: {
    status: 404,
    data: { message: "Student with ID 999 not found", error: "NOT_FOUND", statusCode: 404 },
  },
};

describe("isEndpointMissing", () => {
  it("recognises Express's default body for a route that doesn't exist", () => {
    expect(isEndpointMissing(missingRoute)).toBe(true);
  });

  it("does not confuse a missing record with a missing route", () => {
    expect(isEndpointMissing(missingRecord)).toBe(false);
  });

  it("ignores non-404 failures", () => {
    expect(isEndpointMissing({ response: { status: 403, data: {} } })).toBe(false);
    expect(isEndpointMissing({})).toBe(false);
  });
});

describe("apiErrorMessage", () => {
  it("replaces the raw 'Cannot GET ...' string with something a person can act on", () => {
    const message = apiErrorMessage(missingRoute, "fallback");
    expect(message).not.toMatch(/Cannot GET/);
    expect(message).toMatch(/not.*(available|deployed)/i);
  });

  it("uses the caller's wording for a missing endpoint when given one", () => {
    expect(apiErrorMessage(missingRoute, "fallback", "Not deployed yet.")).toBe("Not deployed yet.");
  });

  it("passes a real backend message through untouched", () => {
    expect(apiErrorMessage(missingRecord, "fallback")).toBe("Student with ID 999 not found");
  });

  it("joins the array form returned by validation failures", () => {
    const err = { response: { status: 400, data: { message: ["amount must not be less than 0.01", "method must be an enum"] } } };
    expect(apiErrorMessage(err, "fallback")).toBe(
      "amount must not be less than 0.01, method must be an enum"
    );
  });

  it("falls back to `error` then the axios message then the caller's default", () => {
    expect(apiErrorMessage({ response: { status: 500, data: { error: "INTERNAL" } } }, "fb")).toBe("INTERNAL");
    expect(apiErrorMessage({ message: "Network Error" }, "fb")).toBe("Network Error");
    expect(apiErrorMessage({}, "fb")).toBe("fb");
    expect(apiErrorMessage({ response: { data: { message: "   " } } }, "fb")).toBe("fb");
  });
});
