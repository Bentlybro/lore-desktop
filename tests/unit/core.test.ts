import { describe, it, expect } from "vitest";
import { ensureOk, dataOf, firstData, LoreError } from "../../src/lib/core";

const outcome = (events: any[], ok = true, error: any = null, errorCode: any = null) => ({
  events,
  ok,
  error,
  errorCode,
});

describe("ensureOk", () => {
  it("returns the outcome when ok", () => {
    const o = outcome([]);
    expect(ensureOk(o)).toBe(o);
  });
  it("throws a LoreError carrying the code when not ok", () => {
    expect(() => ensureOk(outcome([], false, "boom", 7))).toThrow(LoreError);
    try {
      ensureOk(outcome([], false, "boom", 7));
    } catch (e: any) {
      expect(e).toBeInstanceOf(LoreError);
      expect(e.message).toBe("boom");
      expect(e.code).toBe(7);
      expect(e.name).toBe("LoreError");
    }
  });
});

describe("dataOf / firstData", () => {
  const o = outcome([
    { tagName: "x", data: { n: 1 } },
    { tagName: "x", data: { n: 2 } },
    { tagName: "y", data: { n: 3 } },
  ]);
  it("dataOf returns all matching payloads", () => {
    expect(dataOf(o, "x")).toEqual([{ n: 1 }, { n: 2 }]);
    expect(dataOf(o, "z")).toEqual([]);
  });
  it("firstData returns the first match or undefined", () => {
    expect(firstData(o, "x")).toEqual({ n: 1 });
    expect(firstData(o, "z")).toBeUndefined();
  });
});
