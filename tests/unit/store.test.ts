import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/lib/lore", () => {
  const ok = { events: [], ok: true, error: null, errorCode: null };
  return {
    reset: vi.fn(async () => ok),
    status: vi.fn(async () => ({ ok: true, error: null, revision: null, files: [], total: 0 })),
    stage: vi.fn(async () => ok),
    unstage: vi.fn(async () => ok),
    amend: vi.fn(async () => ok),
    mergeResolve: vi.fn(async () => ok),
    revertResolve: vi.fn(async () => ok),
    cherryPickResolve: vi.fn(async () => ok),
    mergeAbort: vi.fn(async () => ok),
    revertAbort: vi.fn(async () => ok),
    cherryPickAbort: vi.fn(async () => ok),
    history: vi.fn(async () => []),
    lockQuery: vi.fn(async () => []),
    lockAcquire: vi.fn(async () => ok),
    lockRelease: vi.fn(async () => ok),
  };
});

import { useStore } from "../../src/store";
import * as lore from "../../src/lib/lore";

const repo = { name: "r", path: "/p", serverUrl: "lore://x" };
const file = (p: string, a = "modify") => ({ p, a, s: false, d: true, c: false });

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
    current: repo,
    files: [],
    conflictOp: null,
    amendMode: false,
    selectedPath: null,
    diff: "",
    locks: {},
    error: null,
  });
});

describe("discard", () => {
  it("purges new (added) files", async () => {
    await useStore.getState().discard(file("new.txt", "add"));
    expect(lore.reset).toHaveBeenCalledWith("/p", ["new.txt"], { purge: true });
  });
  it("does not purge tracked modifications", async () => {
    await useStore.getState().discard(file("m.txt", "modify"));
    expect(lore.reset).toHaveBeenCalledWith("/p", ["m.txt"], { purge: false });
  });
  it("clears the diff when discarding the selected file", async () => {
    useStore.setState({ selectedPath: "m.txt", diff: "stuff" });
    await useStore.getState().discard(file("m.txt"));
    expect(useStore.getState().selectedPath).toBeNull();
    expect(useStore.getState().diff).toBe("");
  });
});

describe("conflict resolution dispatch", () => {
  it.each([
    ["merge", "mergeResolve"],
    ["revert", "revertResolve"],
    ["cherry-pick", "cherryPickResolve"],
  ] as const)("resolveConflict uses %s for a %s conflict", async (op, fn) => {
    useStore.setState({ conflictOp: op });
    await useStore.getState().resolveConflict("f.txt", "mine");
    expect((lore as any)[fn]).toHaveBeenCalledWith("/p", "mine", ["f.txt"]);
  });

  it.each([
    ["merge", "mergeAbort"],
    ["revert", "revertAbort"],
    ["cherry-pick", "cherryPickAbort"],
  ] as const)("abortConflict uses %s for a %s conflict", async (op, fn) => {
    useStore.setState({ conflictOp: op });
    await useStore.getState().abortConflict();
    expect((lore as any)[fn]).toHaveBeenCalledWith("/p");
    expect(useStore.getState().conflictOp).toBeNull();
  });

  it("defaults to merge when no op is set", async () => {
    useStore.setState({ conflictOp: null });
    await useStore.getState().resolveAllConflicts("theirs");
    expect(lore.mergeResolve).toHaveBeenCalledWith("/p", "theirs");
  });
});

describe("toggleStage (optimistic)", () => {
  it("stages and flips the flag without a rescan", async () => {
    useStore.setState({ files: [file("a.txt")] });
    await useStore.getState().toggleStage(file("a.txt"));
    expect(lore.stage).toHaveBeenCalledWith("/p", ["a.txt"]);
    expect(useStore.getState().files[0].s).toBe(true);
    expect(lore.status).not.toHaveBeenCalled();
  });
  it("unstages a staged file", async () => {
    const f = { ...file("a.txt"), s: true };
    useStore.setState({ files: [f] });
    await useStore.getState().toggleStage(f);
    expect(lore.unstage).toHaveBeenCalledWith("/p", ["a.txt"]);
    expect(useStore.getState().files[0].s).toBe(false);
  });
});

describe("amend", () => {
  it("calls amend and clears amend mode", async () => {
    useStore.setState({ amendMode: true });
    await useStore.getState().amend("new message");
    expect(lore.amend).toHaveBeenCalledWith("/p", "new message");
    expect(useStore.getState().amendMode).toBe(false);
  });
});

describe("locks", () => {
  it("lockFile acquires then reloads locks", async () => {
    await useStore.getState().lockFile("bin.unity");
    expect(lore.lockAcquire).toHaveBeenCalledWith("/p", ["bin.unity"]);
    expect(lore.lockQuery).toHaveBeenCalled();
  });
  it("unlockFile releases then reloads locks", async () => {
    await useStore.getState().unlockFile("bin.unity");
    expect(lore.lockRelease).toHaveBeenCalledWith("/p", ["bin.unity"]);
    expect(lore.lockQuery).toHaveBeenCalled();
  });
  it("loadLocks builds a path->entry map", async () => {
    (lore.lockQuery as any).mockResolvedValueOnce([{ path: "a", owner: "o", lockedAt: 1 }]);
    await useStore.getState().loadLocks();
    expect(useStore.getState().locks["a"]).toEqual({ path: "a", owner: "o", lockedAt: 1 });
  });
});
