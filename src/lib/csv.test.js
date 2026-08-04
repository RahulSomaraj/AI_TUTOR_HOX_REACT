import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins headers and rows with CRLF", () => {
    const csv = toCsv(["A", "B"], [["1", "2"]]);
    expect(csv).toBe("A,B\r\n1,2");
  });

  // A student named "Doe, John" or a note containing a comma would otherwise
  // shift every following column by one.
  it("quotes fields containing a comma", () => {
    expect(toCsv([], [["Doe, John"]])).toBe('"Doe, John"');
  });

  it("doubles inner quotes", () => {
    expect(toCsv([], [['He said "hi"']])).toBe('"He said ""hi"""');
  });

  it("quotes fields containing newlines", () => {
    expect(toCsv([], [["line one\nline two"]])).toBe('"line one\nline two"');
  });

  it("quotes fields with leading or trailing spaces so they survive import", () => {
    expect(toCsv([], [[" padded "]])).toBe('" padded "');
  });

  it("leaves ordinary fields unquoted", () => {
    expect(toCsv([], [["1500.00", "Tuition Fee"]])).toBe("1500.00,Tuition Fee");
  });

  it("renders null and undefined as empty cells, not the strings", () => {
    expect(toCsv([], [[null, undefined, 0]])).toBe(",,0");
  });

  it("handles no headers and no rows", () => {
    expect(toCsv([], [])).toBe("");
    expect(toCsv(["A"], [])).toBe("A");
  });
});
