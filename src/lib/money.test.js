import { describe, it, expect } from "vitest";
import {
  fromPaise,
  isPayableAmount,
  paiseToNumber,
  sumPaise,
  toPaise,
} from "./money";

describe("toPaise", () => {
  it("parses the API's fixed-2dp decimal strings", () => {
    expect(toPaise("1500.00")).toBe(150000);
    expect(toPaise("0.01")).toBe(1);
    expect(toPaise("1500.50")).toBe(150050);
  });

  it("parses plain numbers and integer-looking strings", () => {
    expect(toPaise(1500)).toBe(150000);
    expect(toPaise("1500")).toBe(150000);
  });

  it("tolerates display formatting the user might paste in", () => {
    expect(toPaise("₹1,500.00")).toBe(150000);
  });

  it("handles negative balances (advances / overpayments)", () => {
    expect(toPaise("-500.00")).toBe(-50000);
  });

  it("returns 0 for blank and unparseable input rather than NaN", () => {
    expect(toPaise("")).toBe(0);
    expect(toPaise(null)).toBe(0);
    expect(toPaise(undefined)).toBe(0);
    expect(toPaise("abc")).toBe(0);
    expect(toPaise(".")).toBe(0);
    expect(toPaise(true)).toBe(0);
  });

  it("rounds at the third decimal instead of silently truncating", () => {
    expect(toPaise("10.005")).toBe(1001);
    expect(toPaise("10.004")).toBe(1000);
  });
});

describe("fromPaise", () => {
  it("round-trips through toPaise", () => {
    expect(fromPaise(toPaise("1500.00"))).toBe("1500.00");
    expect(fromPaise(toPaise("0.07"))).toBe("0.07");
  });

  it("always pads to two decimals", () => {
    expect(fromPaise(5)).toBe("0.05");
    expect(fromPaise(100)).toBe("1.00");
    expect(fromPaise(0)).toBe("0.00");
  });

  it("keeps the sign on negative balances", () => {
    expect(fromPaise(-50000)).toBe("-500.00");
    expect(fromPaise(-5)).toBe("-0.05");
  });
});

describe("sumPaise", () => {
  // The whole reason this module exists: 0.1 + 0.2 !== 0.3 in binary floats,
  // and a one-paise drift on a fee ledger reads as a bookkeeping error.
  it("sums decimal strings without float drift", () => {
    expect(sumPaise(["0.10", "0.20"])).toBe(30);
    expect(fromPaise(sumPaise(["0.10", "0.20"]))).toBe("0.30");
  });

  it("stays exact across a long ledger", () => {
    const entries = Array.from({ length: 100 }, () => "0.07");
    expect(fromPaise(sumPaise(entries))).toBe("7.00");
  });

  it("returns 0 for an empty or missing list", () => {
    expect(sumPaise([])).toBe(0);
    expect(sumPaise()).toBe(0);
  });
});

describe("paiseToNumber", () => {
  it("produces the number shape request bodies expect", () => {
    expect(paiseToNumber(150000)).toBe(1500);
    expect(paiseToNumber(150050)).toBe(1500.5);
    expect(paiseToNumber(1)).toBe(0.01);
  });
});

describe("isPayableAmount", () => {
  it("accepts anything at or above the backend's 0.01 minimum", () => {
    expect(isPayableAmount("0.01")).toBe(true);
    expect(isPayableAmount("1500.00")).toBe(true);
  });

  it("rejects zero, blank and negative amounts", () => {
    expect(isPayableAmount("0")).toBe(false);
    expect(isPayableAmount("0.00")).toBe(false);
    expect(isPayableAmount("")).toBe(false);
    expect(isPayableAmount("-5.00")).toBe(false);
  });
});
