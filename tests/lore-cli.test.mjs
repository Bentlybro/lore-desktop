// Integration tests for the lore CLI surface Lore Desktop depends on.
//
// These drive the real `lore` binary against a Lore server exactly the way the
// app's Rust adapter does (`lore --json <args>` → newline-delimited JSON events
// → first `complete` is authoritative). They assert every feature works and
// guard the specific regressions we hit during development.
//
// Run:  node --test tests/         (from the project root)
// Env overrides:
//   LORE_BIN       path to the lore binary  (default: ~/bin/lore[.exe])
//   LORE_SERVER    server URL               (default: lore://192.168.0.254:41337)
//   LORE_IDENTITY  commit identity          (default: github@bentlybro.com)
//
// Note: each run creates a uniquely-named repo on the server. Server-side repo
// deletion is auth-gated, so test repos accumulate — point LORE_SERVER at a
// throwaway server if that matters.

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";

const BIN =
  process.env.LORE_BIN ||
  join(homedir(), "bin", process.platform === "win32" ? "lore.exe" : "lore");
const SERVER = process.env.LORE_SERVER || "lore://192.168.0.254:41337";
const IDENTITY = process.env.LORE_IDENTITY || "github@bentlybro.com";

const repoName = `test-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
const repoDir = join(tmpdir(), "lore-desktop-tests", repoName);

/** Spawn `lore --json <args>` and reduce to the adapter's outcome shape. */
function runLore(args, cwd = repoDir) {
  const res = spawnSync(BIN, ["--json", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const events = [];
  for (const line of (res.stdout || "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      events.push(JSON.parse(t));
    } catch {
      /* ignore non-JSON */
    }
  }
  // First `complete` is authoritative; later ones (background relay on a
  // no-auth server) are benign noise — exactly what the app's adapter does.
  let ok = res.status === 0;
  let error = null;
  const complete = events.find((e) => e.tagName === "complete");
  if (complete) {
    const st = complete.data?.status ?? 0;
    const ec = complete.data?.error?.errorCode ?? 0;
    ok = st === 0 && ec === 0;
    if (!ok) error = complete.data?.error?.message || `status ${st}`;
  }
  return { events, ok, error, raw: res.stdout || "" };
}

const dataOf = (o, tag) => o.events.filter((e) => e.tagName === tag).map((e) => e.data);
const firstOf = (o, tag) => o.events.find((e) => e.tagName === tag)?.data;

// Parse history into [{revisionNumber, message}] the way the app does.
function parseHistory(o) {
  const revs = [];
  let cur = null;
  for (const e of o.events) {
    if (e.tagName === "revisionHistoryEntry") {
      cur = { revisionNumber: e.data.revisionNumber, revision: e.data.revision, message: undefined };
      revs.push(cur);
    } else if (e.tagName === "metadata" && cur && e.data.key === "message") {
      cur.message = e.data.value?.data;
    }
  }
  return revs;
}

before(() => {
  rmSync(repoDir, { recursive: true, force: true });
  mkdirSync(join(repoDir, "sub"), { recursive: true });
  writeFileSync(join(repoDir, "a.txt"), "alpha\n");
  writeFileSync(join(repoDir, "b.txt"), "beta\n");
  writeFileSync(join(repoDir, "sub", "c.txt"), "gamma\n");
  const o = runLore(["repository", "create", `${SERVER}/${repoName}`, "--identity", IDENTITY]);
  assert.ok(o.ok, `repository create failed: ${o.error}`);
});

test("status --scan detects new files as adds", () => {
  const o = runLore(["status", "--scan"]);
  assert.ok(o.ok, o.error);
  const files = dataOf(o, "repositoryStatusFile");
  const a = files.find((f) => f.path === "a.txt");
  assert.ok(a, "a.txt should be reported");
  assert.equal(a.action, "add");
});

test("stage . then commit succeeds (revision 1)", () => {
  assert.ok(runLore(["stage", "."]).ok, "stage . failed");
  const o = runLore(["commit", "initial"]);
  assert.ok(o.ok, `commit failed: ${o.error}`);
  const rev = firstOf(o, "revisionCommitRevision");
  assert.ok(rev, "no revisionCommitRevision event");
});

test("working tree is clean after commit (no phantom changes)", () => {
  const o = runLore(["status", "--scan"]);
  assert.ok(o.ok, o.error);
  assert.equal(dataOf(o, "repositoryStatusFile").length, 0, "tree should be clean");
});

test("second commit appears in history (history shows both)", () => {
  appendFileSync(join(repoDir, "a.txt"), "more\n");
  assert.ok(runLore(["stage", "a.txt"]).ok);
  assert.ok(runLore(["commit", "second"]).ok, "second commit failed");
  const revs = parseHistory(runLore(["revision", "history"]));
  assert.equal(revs.length, 2, `expected 2 revisions, got ${revs.length}`);
  assert.deepEqual(
    revs.map((r) => r.revisionNumber).sort((x, y) => x - y),
    [1, 2],
  );
});

test("phantom dirty flag is cleared by a scoped scan", () => {
  // Force-mark an unchanged file dirty, then a scoped scan must reconcile it.
  assert.ok(runLore(["dirty", "a.txt"]).ok);
  assert.ok(
    dataOf(runLore(["status"]), "repositoryStatusFile").some((f) => f.path === "a.txt"),
    "precondition: a.txt should be phantom-dirty",
  );
  assert.ok(runLore(["status", "--scan", "a.txt"]).ok);
  const clean = dataOf(runLore(["status"]), "repositoryStatusFile").every((f) => f.path !== "a.txt");
  assert.ok(clean, "scoped scan should clear the phantom dirty flag");
});

test("file diff returns a unified patch", () => {
  appendFileSync(join(repoDir, "b.txt"), "edited\n");
  const o = runLore(["file", "diff", "b.txt"]);
  assert.ok(o.ok, o.error);
  const fd = firstOf(o, "fileDiff");
  assert.ok(fd?.patch?.includes("+"), "patch should contain an added line");
  // tidy up so later tests see a clean-ish tree
  runLore(["reset", "b.txt"]);
});

test("commit detail: revision diff lists a commit's changed files", () => {
  const revs = parseHistory(runLore(["revision", "history"]));
  const rev2 = revs.find((r) => r.revisionNumber === 2).revision;
  const rev1 = revs.find((r) => r.revisionNumber === 1).revision;
  const o = runLore(["revision", "diff", rev1, "--target", rev2]);
  assert.ok(o.ok, o.error);
  const changed = dataOf(o, "revisionDiffFile").map((d) => d.path);
  assert.ok(changed.includes("a.txt"), "a.txt changed between rev1 and rev2");
});

test("branch create, list, and switch", () => {
  assert.ok(runLore(["branch", "create", "feature-x"]).ok, "branch create failed");
  const names = dataOf(runLore(["branch", "list"]), "branchListEntry").map((b) => b.name);
  assert.ok(names.includes("feature-x"), "feature-x should be listed");
  assert.ok(runLore(["branch", "switch", "main"]).ok, "switch to main failed");
});

test(".loreignore excludes matching files", () => {
  writeFileSync(join(repoDir, "junk.tmp"), "noise\n");
  appendFileSync(join(repoDir, ".loreignore"), "*.tmp\n");
  const files = dataOf(runLore(["status", "--scan"]), "repositoryStatusFile").map((f) => f.path);
  assert.ok(!files.includes("junk.tmp"), "junk.tmp should be ignored");
  assert.ok(files.includes(".loreignore"), ".loreignore itself should show as a change");
});

test("push succeeds and survives the trailing relay event", () => {
  // (commit any pending so there is something to push / branch is ahead)
  runLore(["stage", "."]);
  runLore(["commit", "pre-push"]);
  const o = runLore(["push"]);
  assert.ok(o.ok, `push failed: ${o.error}`);
});

test("first-complete rule: history is OK despite a trailing relay error", () => {
  const o = runLore(["revision", "history"]);
  // On a no-auth server `revision history` emits a benign second `complete`
  // with an error; the adapter must still report the command as successful.
  assert.ok(o.ok, "history must be OK even with a trailing relay 'complete'");
});
