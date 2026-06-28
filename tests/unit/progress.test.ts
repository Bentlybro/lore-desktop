import { describe, it, expect } from "vitest";
import { progressFromEvent } from "../../src/store/progress";

describe("progressFromEvent", () => {
  it("uses the lagging (min) fraction for commit progress", () => {
    const p = progressFromEvent({
      tagName: "revisionCommitProgress",
      data: { count: { fileCount: 1, fileTotal: 4, bytesTransferred: 50, bytesTotal: 100 } },
    });
    expect(p?.frac).toBeCloseTo(0.25); // min(0.25 files, 0.5 bytes)
    expect(p?.detail).toContain("1 / 4 files");
  });

  it("is indeterminate (-1) when totals are zero", () => {
    const p = progressFromEvent({
      tagName: "revisionCommitProgress",
      data: { count: { fileCount: 0, fileTotal: 0, bytesTransferred: 0, bytesTotal: 0 } },
    });
    expect(p?.frac).toBe(-1);
  });

  it("computes byte fraction for push fragments", () => {
    const p = progressFromEvent({
      tagName: "branchPushFragmentProgress",
      data: { bytesTransferred: 50, bytesTotal: 100, fragments: 3 },
    });
    expect(p?.frac).toBeCloseTo(0.5);
    expect(p?.detail).toContain("fragments");
  });

  it("returns null for unrelated events", () => {
    expect(progressFromEvent({ tagName: "somethingElse", data: {} })).toBeNull();
  });
});
