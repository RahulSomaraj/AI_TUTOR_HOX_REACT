import { describe, it, expect } from "vitest";
import { formatINR, parseAmount } from "./currency";

describe("formatINR", () => {
    it("formats rupees with 2 decimals", () => {
        expect(formatINR(1500)).toBe("₹1,500.00");
    });
    it("uses the indian grouping system", () => {
        expect(formatINR(1234567)).toBe("₹12,34,567.00");
    });
    it("returns a dash for non-numeric input", () => {
        expect(formatINR("abc")).toBe("-");
        expect(formatINR(null)).toBe("-");
    });
});

describe("parseAmount", () => {
    it("strips currency symbols and separators", () => {
        expect(parseAmount("₹1,500.50")).toBe(1500.5);
    });
    it("rounds to 2 decimals", () => {
        expect(parseAmount("10.005")).toBe(10.01);
    });
    it("returns 0 for garbage", () => {
        expect(parseAmount("abc")).toBe(0);
    });
});