import { describe, it, expect } from "vitest";
import { splitPath, fileDir, fileExt } from "../../src/lib/paths";

describe("splitPath", () => {
  it("splits dir (with trailing slash) and name", () => {
    expect(splitPath("a/b/c.txt")).toEqual({ dir: "a/b/", name: "c.txt" });
  });
  it("handles a root-level file", () => {
    expect(splitPath("c.txt")).toEqual({ dir: "", name: "c.txt" });
  });
});

describe("fileDir", () => {
  it("returns dir without trailing slash", () => {
    expect(fileDir("a/b/c.txt")).toBe("a/b");
  });
  it("returns empty at root", () => {
    expect(fileDir("c.txt")).toBe("");
  });
});

describe("fileExt", () => {
  it("returns extension without the dot", () => {
    expect(fileExt("a/b/c.txt")).toBe("txt");
    expect(fileExt("archive.tar.gz")).toBe("gz");
  });
  it("returns empty for no extension or dotfiles", () => {
    expect(fileExt("Makefile")).toBe("");
    expect(fileExt(".gitignore")).toBe("");
  });
});
