import { describe, it, expect } from "vitest";
import { guard } from "../../src/store/guard";

describe("guard", () => {
  it("flips busy around a successful action and clears error", async () => {
    const calls: any[] = [];
    const set = (p: any) => calls.push(p);
    const r = await guard(set as any, async () => 42);
    expect(r).toBe(42);
    expect(calls[0]).toEqual({ busy: true, error: null });
    expect(calls[calls.length - 1]).toEqual({ busy: false });
  });

  it("captures a thrown error and returns undefined", async () => {
    const calls: any[] = [];
    const set = (p: any) => calls.push(p);
    const r = await guard(set as any, async () => {
      throw new Error("nope");
    });
    expect(r).toBeUndefined();
    expect(calls.some((c) => c.error === "nope")).toBe(true);
    expect(calls[calls.length - 1]).toEqual({ busy: false });
  });
});
