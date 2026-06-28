import { describe, it, expect } from "vitest";
import { actionBadge } from "../../src/lib/badges";

describe("actionBadge", () => {
  it("maps known actions", () => {
    expect(actionBadge("add")).toEqual({ label: "A", cls: "b-add" });
    expect(actionBadge("delete")).toEqual({ label: "D", cls: "b-del" });
    expect(actionBadge("move")).toEqual({ label: "R", cls: "b-ren" });
  });
  it("defaults unknown/modify to M", () => {
    expect(actionBadge("modify")).toEqual({ label: "M", cls: "b-mod" });
    expect(actionBadge("keep")).toEqual({ label: "M", cls: "b-mod" });
  });
  it("conflict overrides the action", () => {
    expect(actionBadge("add", true)).toEqual({ label: "C", cls: "b-con" });
    expect(actionBadge("modify", true)).toEqual({ label: "C", cls: "b-con" });
  });
});
