import { describe, it, expect } from "vitest";
import { fmtBytes, formatDate, baseName } from "../../src/lib/format";

describe("fmtBytes", () => {
  it("handles zero and negatives", () => {
    expect(fmtBytes(0)).toBe("0 B");
    expect(fmtBytes(-5)).toBe("0 B");
  });
  it("formats bytes without decimals", () => {
    expect(fmtBytes(512)).toBe("512 B");
  });
  it("formats KB/MB/GB with one decimal below 10", () => {
    expect(fmtBytes(1024)).toBe("1.0 KB");
    expect(fmtBytes(1536)).toBe("1.5 KB");
    expect(fmtBytes(1048576)).toBe("1.0 MB");
    expect(fmtBytes(1073741824)).toBe("1.0 GB");
  });
  it("drops decimals at/above 10 of a unit", () => {
    expect(fmtBytes(10 * 1024 * 1024)).toBe("10 MB");
  });
});

describe("formatDate", () => {
  it("returns empty for missing/invalid", () => {
    expect(formatDate(undefined)).toBe("");
    expect(formatDate(0)).toBe("");
    expect(formatDate(NaN)).toBe("");
  });
  it("formats a real timestamp to a non-empty string", () => {
    const out = formatDate(Date.UTC(2024, 0, 15, 12, 0, 0));
    expect(out).not.toBe("");
    expect(typeof out).toBe("string");
  });
});

describe("baseName", () => {
  it("returns the last path segment", () => {
    expect(baseName("a/b/c.txt")).toBe("c.txt");
    expect(baseName("a\\b\\c.txt")).toBe("c.txt");
    expect(baseName("file")).toBe("file");
  });
  it("ignores a trailing slash", () => {
    expect(baseName("a/b/")).toBe("b");
  });
});
