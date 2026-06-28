import { describe, it, expect } from "vitest";
import { parseDiff, looksLikeDiff } from "../../src/lib/diff-parse";

describe("looksLikeDiff", () => {
  it("recognises hunks and +/- lines", () => {
    expect(looksLikeDiff("@@ -1 +1 @@")).toBe(true);
    expect(looksLikeDiff("+added")).toBe(true);
    expect(looksLikeDiff("-removed")).toBe(true);
  });
  it("rejects plain placeholder text", () => {
    expect(looksLikeDiff("(no textual diff — binary)")).toBe(false);
    expect(looksLikeDiff("")).toBe(false);
  });
});

describe("parseDiff", () => {
  it("tracks old/new line numbers across a hunk", () => {
    const patch = ["@@ -10,3 +10,4 @@", " ctx", "-gone", "+new1", "+new2", " tail"].join("\n");
    const rows = parseDiff(patch);
    expect(rows[0]).toEqual({ kind: "hunk", text: "@@ -10,3 +10,4 @@" });
    expect(rows[1]).toEqual({ kind: "ctx", oldLn: 10, newLn: 10, text: "ctx" });
    expect(rows[2]).toEqual({ kind: "del", oldLn: 11, text: "gone" });
    expect(rows[3]).toEqual({ kind: "add", newLn: 11, text: "new1" });
    expect(rows[4]).toEqual({ kind: "add", newLn: 12, text: "new2" });
    expect(rows[5]).toEqual({ kind: "ctx", oldLn: 12, newLn: 13, text: "tail" });
  });

  it("skips the +++/--- file headers", () => {
    const patch = ["--- a/x", "+++ b/x", "@@ -1 +1 @@", "+hi"].join("\n");
    const rows = parseDiff(patch);
    expect(rows.find((r) => r.text.startsWith("---"))).toBeUndefined();
    expect(rows.find((r) => r.text.startsWith("+++"))).toBeUndefined();
    expect(rows).toHaveLength(2); // hunk + one add
  });

  it("resets counters on a new hunk header", () => {
    const patch = ["@@ -1,1 +1,1 @@", " a", "@@ -50,1 +60,1 @@", " b"].join("\n");
    const rows = parseDiff(patch);
    expect(rows[3]).toEqual({ kind: "ctx", oldLn: 50, newLn: 60, text: "b" });
  });
});
