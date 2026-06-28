import { describe, it, expect, beforeEach, vi } from "vitest";

// Shared mutable mock state for the lore CLI bridge.
const h = vi.hoisted(() => ({
  outcome: { events: [] as any[], ok: true, error: null as any, errorCode: null as any },
  calls: [] as { args: string[]; cwd?: string; stream?: boolean }[],
}));

vi.mock("../../src/lib/core", () => ({
  runLore: async (args: string[], cwd?: string) => {
    h.calls.push({ args, cwd });
    return h.outcome;
  },
  runLoreStream: async (args: string[], cwd: any) => {
    h.calls.push({ args, cwd, stream: true });
    return h.outcome;
  },
  ensureOk: (o: any) => o,
  dataOf: (o: any, tag: string) => o.events.filter((e: any) => e.tagName === tag).map((e: any) => e.data),
  firstData: (o: any, tag: string) => o.events.find((e: any) => e.tagName === tag)?.data,
  LoreError: class LoreError extends Error {},
}));

import * as staging from "../../src/lib/api/staging";
import * as reset from "../../src/lib/api/reset";
import * as revision from "../../src/lib/api/revision";
import * as branch from "../../src/lib/api/branch";
import * as history from "../../src/lib/api/history";
import * as diff from "../../src/lib/api/diff";
import * as lock from "../../src/lib/api/lock";
import * as repository from "../../src/lib/api/repository";
import * as commit from "../../src/lib/api/commit";

const CWD = "/repo";
const ev = (events: any[]) => {
  h.outcome = { events, ok: true, error: null, errorCode: null };
};
const lastArgs = () => h.calls[h.calls.length - 1].args;
const lastCwd = () => h.calls[h.calls.length - 1].cwd;

beforeEach(() => {
  h.calls = [];
  h.outcome = { events: [], ok: true, error: null, errorCode: null };
});

describe("staging args", () => {
  it("stage / unstage pass paths", async () => {
    await staging.stage(CWD, ["a", "b"]);
    expect(lastArgs()).toEqual(["stage", "a", "b"]);
    expect(lastCwd()).toBe(CWD);
    await staging.unstage(CWD, ["a"]);
    expect(lastArgs()).toEqual(["unstage", "a"]);
  });
  it("stageAllDir / unstageAllDir use '.'", async () => {
    await staging.stageAllDir(CWD);
    expect(lastArgs()).toEqual(["stage", "."]);
    await staging.unstageAllDir(CWD);
    expect(lastArgs()).toEqual(["unstage", "."]);
  });
  it("stageMove records a rename", async () => {
    await staging.stageMove(CWD, "x", "y");
    expect(lastArgs()).toEqual(["stage", "move", "x", "y"]);
  });
  it("reconcileStaging unstages then re-stages with --scan", async () => {
    await staging.reconcileStaging(CWD);
    expect(h.calls[0].args).toEqual(["unstage", "."]);
    expect(h.calls[1].args).toEqual(["stage", ".", "--scan"]);
  });
});

describe("reset args", () => {
  it("plain reset", async () => {
    await reset.reset(CWD, ["a"]);
    expect(lastArgs()).toEqual(["reset", "a"]);
  });
  it("purge flag precedes paths", async () => {
    await reset.reset(CWD, ["a"], { purge: true });
    expect(lastArgs()).toEqual(["reset", "--purge", "a"]);
  });
  it("revision option", async () => {
    await reset.reset(CWD, ["a"], { revision: "r1" });
    expect(lastArgs()).toEqual(["reset", "--revision", "r1", "a"]);
  });
});

describe("revision args", () => {
  it("amend", async () => {
    await revision.amend(CWD, "msg");
    expect(lastArgs()).toEqual(["revision", "amend", "msg"]);
  });
  it("revert with options", async () => {
    await revision.revert(CWD, "r");
    expect(lastArgs()).toEqual(["revision", "revert", "r"]);
    await revision.revert(CWD, "r", { message: "m", noCommit: true });
    expect(lastArgs()).toEqual(["revision", "revert", "r", "--message", "m", "--no-commit"]);
  });
  it("revert abort / resolve", async () => {
    await revision.revertAbort(CWD);
    expect(lastArgs()).toEqual(["revision", "revert", "abort"]);
    await revision.revertResolve(CWD, "mine", ["a"]);
    expect(lastArgs()).toEqual(["revision", "revert", "resolve", "mine", "a"]);
  });
  it("cherry-pick + resolve + abort", async () => {
    await revision.cherryPick(CWD, "r");
    expect(lastArgs()).toEqual(["revision", "cherry-pick", "r"]);
    await revision.cherryPickResolve(CWD, "theirs");
    expect(lastArgs()).toEqual(["revision", "cherry-pick", "resolve", "theirs"]);
    await revision.cherryPickAbort(CWD);
    expect(lastArgs()).toEqual(["revision", "cherry-pick", "abort"]);
  });
  it("restore with/without message", async () => {
    await revision.restore(CWD);
    expect(lastArgs()).toEqual(["revision", "restore"]);
    await revision.restore(CWD, "m");
    expect(lastArgs()).toEqual(["revision", "restore", "m"]);
  });
});

describe("branch args + parsing", () => {
  it("switch / create / merge", async () => {
    await branch.branchSwitch(CWD, "dev");
    expect(lastArgs()).toEqual(["branch", "switch", "dev"]);
    await branch.branchCreate(CWD, "dev");
    expect(lastArgs()).toEqual(["branch", "create", "dev"]);
    await branch.branchMerge(CWD, "dev");
    expect(lastArgs()).toEqual(["branch", "merge", "dev"]);
  });
  it("merge abort / resolve", async () => {
    await branch.mergeAbort(CWD);
    expect(lastArgs()).toEqual(["branch", "merge", "abort"]);
    await branch.mergeResolve(CWD, "mine", ["a"]);
    expect(lastArgs()).toEqual(["branch", "merge", "resolve", "mine", "a"]);
  });
  it("archive / protect / unprotect / reset", async () => {
    await branch.branchArchive(CWD, "old");
    expect(lastArgs()).toEqual(["branch", "archive", "old"]);
    await branch.branchProtect(CWD, "main");
    expect(lastArgs()).toEqual(["branch", "protect", "main"]);
    await branch.branchUnprotect(CWD, "main");
    expect(lastArgs()).toEqual(["branch", "unprotect", "main"]);
    await branch.branchReset(CWD, "rev1");
    expect(lastArgs()).toEqual(["branch", "reset", "rev1"]);
  });
  it("branchList dedupes by id, keeping the current entry", async () => {
    ev([
      { tagName: "branchListEntry", data: { id: "1", name: "main", isCurrent: false } },
      { tagName: "branchListEntry", data: { id: "1", name: "main", isCurrent: true } },
      { tagName: "branchListEntry", data: { id: "2", name: "dev", isCurrent: false } },
    ]);
    const list = await branch.branchList(CWD);
    expect(list).toHaveLength(2);
    expect(list.find((b) => b.id === "1")?.isCurrent).toBe(true);
  });
});

describe("history parsing", () => {
  it("history merges metadata into each revision", async () => {
    ev([
      { tagName: "revisionHistoryEntry", data: { revision: "a", revisionNumber: 1, parent: ["p"] } },
      { tagName: "metadata", data: { key: "message", value: { data: "hi" } } },
      { tagName: "metadata", data: { key: "creator", value: { data: "me" } } },
      { tagName: "metadata", data: { key: "timestamp", value: { data: 123 } } },
    ]);
    const revs = await history.history(CWD);
    expect(revs).toEqual([
      { revision: "a", revisionNumber: 1, parent: ["p"], message: "hi", creator: "me", timestamp: 123 },
    ]);
  });
  it("fileHistory captures the per-revision action", async () => {
    ev([
      { tagName: "fileHistory", data: { revision: "a", revisionNumber: 2, parent: ["p", "0"], action: "move" } },
      { tagName: "metadata", data: { key: "message", value: { data: "renamed" } } },
    ]);
    const revs = await history.fileHistory(CWD, "f.cs");
    expect(lastArgs()).toEqual(["file", "history", "f.cs"]);
    expect(revs[0]).toMatchObject({ revision: "a", revisionNumber: 2, action: "move", message: "renamed" });
  });
});

describe("diff parsing + args", () => {
  it("fileDiff joins patches", async () => {
    ev([{ tagName: "fileDiff", data: { patch: "@@ -1 +1 @@" } }]);
    const out = await diff.fileDiff(CWD, "f.cs");
    expect(lastArgs()).toEqual(["file", "diff", "f.cs"]);
    expect(out).toBe("@@ -1 +1 @@");
  });
  it("commitFiles diffs parent->rev", async () => {
    ev([{ tagName: "revisionDiffFile", data: { path: "a", action: "add" } }]);
    const files = await diff.commitFiles(CWD, "parent", "rev");
    expect(lastArgs()).toEqual(["revision", "diff", "parent", "--target", "rev"]);
    expect(files).toEqual([{ path: "a", action: "add" }]);
  });
  it("revisionFileDiff passes source/target/path", async () => {
    ev([{ tagName: "fileDiff", data: { patch: "x" } }]);
    await diff.revisionFileDiff(CWD, "parent", "rev", "f.cs");
    expect(lastArgs()).toEqual(["diff", "--source", "parent", "--target", "rev", "f.cs"]);
  });
});

describe("lock args + parsing", () => {
  it("acquire / release", async () => {
    await lock.lockAcquire(CWD, ["a"]);
    expect(lastArgs()).toEqual(["lock", "acquire", "a"]);
    await lock.lockRelease(CWD, ["a"]);
    expect(lastArgs()).toEqual(["lock", "release", "a"]);
  });
  it("query parses lock entries", async () => {
    ev([{ tagName: "lockFileQuery", data: { path: "a", owner: "o", lockedAt: 9, branch: "main" } }]);
    const locks = await lock.lockQuery(CWD);
    expect(lastArgs()).toEqual(["lock", "query"]);
    expect(locks).toEqual([{ path: "a", owner: "o", lockedAt: 9, branch: "main" }]);
  });
});

describe("repository args + parsing", () => {
  it("list / create / clone build the right commands", async () => {
    ev([{ tagName: "repositoryListEntry", data: { id: "1", name: "r" } }]);
    const list = await repository.repositoryList("lore://srv");
    expect(lastArgs()).toEqual(["repository", "list", "lore://srv"]);
    expect(list).toEqual([{ id: "1", name: "r" }]);

    await repository.createRepo("lore://srv", "proj", CWD, "me");
    expect(lastArgs()).toEqual(["repository", "create", "lore://srv/proj", "--identity", "me"]);

    await repository.cloneRepo("lore://srv", "proj", "/dest", "me", () => {});
    const last = h.calls[h.calls.length - 1];
    expect(last.stream).toBe(true);
    expect(last.args).toEqual(["clone", "lore://srv/proj", "/dest", "--identity", "me"]);
  });
  it("info parses repositoryData", async () => {
    ev([{ tagName: "repositoryData", data: { name: "n", id: "abc123", creator: "me", created: 5 } }]);
    const info = await repository.repositoryInfo(CWD);
    expect(info).toMatchObject({ name: "n", id: "abc123", creator: "me", created: 5 });
  });
  it("verifyState reports healthy when healed state is zero", async () => {
    ev([{ tagName: "repositoryVerifyStateEnd", data: { healedStagedState: "0000000000" } }]);
    expect(await repository.verifyState(CWD)).toEqual({ healthy: true });
    ev([{ tagName: "repositoryVerifyStateEnd", data: { healedStagedState: "abc" } }]);
    expect(await repository.verifyState(CWD)).toEqual({ healthy: false });
  });
  it("gc command", async () => {
    await repository.repositoryGc(CWD);
    expect(lastArgs()).toEqual(["repository", "gc"]);
  });
});

describe("commit/push/sync stream", () => {
  it("commit streams and returns the revision", async () => {
    ev([{ tagName: "revisionCommitRevision", data: { revision: "r", revisionNumber: 3 } }]);
    const res = await commit.commit(CWD, "msg", () => {});
    const last = h.calls[h.calls.length - 1];
    expect(last.stream).toBe(true);
    expect(last.args).toEqual(["commit", "msg"]);
    expect(res).toEqual({ revision: "r", revisionNumber: 3 });
  });
  it("push / sync stream their verbs", async () => {
    await commit.push(CWD, () => {});
    expect(h.calls[h.calls.length - 1]).toMatchObject({ args: ["push"], stream: true });
    await commit.sync(CWD, () => {});
    expect(h.calls[h.calls.length - 1]).toMatchObject({ args: ["sync"], stream: true });
  });
});
