import { invoke, Channel } from "@tauri-apps/api/core";
import type {
  Branch,
  LoreEvent,
  LoreOutcome,
  Revision,
  Settings,
  StatusPayload,
} from "../types";

/** Run a lore command and get the full event stream once it completes. */
export async function runLore(args: string[], cwd?: string): Promise<LoreOutcome> {
  return invoke<LoreOutcome>("run_lore", { args, cwd: cwd ?? null });
}

/** Run a lore command, streaming each event to `onEvent` as it arrives. */
export async function runLoreStream(
  args: string[],
  cwd: string | undefined,
  onEvent: (e: LoreEvent) => void,
): Promise<LoreOutcome> {
  const channel = new Channel<LoreEvent>();
  channel.onmessage = onEvent;
  return invoke<LoreOutcome>("run_lore_stream", {
    args,
    cwd: cwd ?? null,
    onEvent: channel,
  });
}

export class LoreError extends Error {
  code: number | null;
  constructor(message: string, code: number | null) {
    super(message);
    this.code = code;
    this.name = "LoreError";
  }
}

/** Throw if the outcome failed; otherwise return it. */
function ensureOk(o: LoreOutcome): LoreOutcome {
  if (!o.ok) throw new LoreError(o.error ?? "lore command failed", o.errorCode);
  return o;
}

const dataOf = (o: LoreOutcome, tag: string): any[] =>
  o.events.filter((e) => e.tagName === tag).map((e) => e.data);
const firstData = (o: LoreOutcome, tag: string): any | undefined =>
  o.events.find((e) => e.tagName === tag)?.data;

// ---- Settings ----

export const getSettings = (): Promise<Settings> => invoke<Settings>("get_settings");
export const saveSettings = (settings: Settings): Promise<void> =>
  invoke<void>("save_settings", { settings });

// ---- Status ----

// Dedicated, lean status command. `scan: true` does the full filesystem walk
// (detects external edits, slow on huge repos); `scan: false` is the cheap
// read of persisted dirty/staged flags — used to refresh after our own actions.
export async function status(cwd: string, scan = true): Promise<StatusPayload> {
  const p = await invoke<StatusPayload>("lore_status", { cwd, scan });
  if (!p.ok) throw new LoreError(p.error ?? "status failed", null);
  return p;
}

// ---- Staging ----

export const stage = (cwd: string, files: string[]) =>
  runLore(["stage", ...files], cwd).then(ensureOk);
export const unstage = (cwd: string, files: string[]) =>
  runLore(["unstage", ...files], cwd).then(ensureOk);

// Stage / unstage everything under the repo root in a single cheap command —
// avoids passing tens of thousands of paths as args (which blows the OS
// command-line length limit). Dirty flags are already set by `status --scan`.
export const stageAllDir = (cwd: string) => runLore(["stage", "."], cwd).then(ensureOk);
export const unstageAllDir = (cwd: string) => runLore(["unstage", "."], cwd).then(ensureOk);

// Rebuild the staged set from scratch, respecting .loreignore: clears the
// staged anchor, then re-scans + re-stages only non-ignored changes. Used after
// .loreignore changes so already-staged-but-now-ignored files drop out (and
// their stale dirty flags clear), which a plain "stage ." would otherwise keep.
export async function reconcileStaging(cwd: string) {
  await runLore(["unstage", "."], cwd).then(ensureOk);
  return runLore(["stage", ".", "--scan"], cwd).then(ensureOk);
}

// ---- Commit ----

export interface CommitResult {
  revision: string;
  revisionNumber: number;
}
// Streamed so the UI gets live revisionCommitProgress events (file/byte counts).
export async function commit(
  cwd: string,
  message: string,
  onEvent: (e: LoreEvent) => void,
): Promise<CommitResult | undefined> {
  const o = ensureOk(await runLoreStream(["commit", message], cwd, onEvent));
  return firstData(o, "revisionCommitRevision");
}

// Per-repo background service ("warm mode").
export const startService = (cwd: string) => invoke<void>("lore_service", { cwd, action: "start" });
export const stopService = (cwd: string) => invoke<void>("lore_service", { cwd, action: "stop" });

// Content-compare just the given paths (a scoped scan): detects real
// adds/edits/deletes AND clears phantom dirty flags from FS events on files
// whose content actually matches the commit. Cheap — only walks the listed
// paths, not the whole tree. Used by the live file watcher.
export const scanPaths = (cwd: string, paths: string[]) =>
  runLore(["status", "--scan", ...paths], cwd).then(ensureOk);

// Filesystem watcher (emits the "repo-changed" event with changed paths).
export const startWatch = (cwd: string) => invoke<void>("start_watch", { cwd });
export const stopWatch = () => invoke<void>("stop_watch");

// Append a pattern to .loreignore.
export const ignoreAdd = (cwd: string, pattern: string) =>
  invoke<void>("ignore_add", { cwd, pattern });

// Open a path in the OS file manager / a terminal / an external editor.
export const openExternal = (action: "explorer" | "shell" | "editor", path: string) =>
  invoke<void>("open_external", { action, path });

// Seed .loreignore from an existing .gitignore (if present and no .loreignore).
// Returns true if it created one.
export const seedLoreignore = (cwd: string) => invoke<boolean>("seed_loreignore", { cwd });

// Create a .loreignore from a specific .gitignore (by repo-relative path).
// Returns false if a .loreignore already exists alongside it.
export const makeLoreignore = (cwd: string, gitignore: string) =>
  invoke<boolean>("make_loreignore", { cwd, gitignore });

// ---- Push / Sync (streamed for progress) ----

export const push = (cwd: string, onEvent: (e: LoreEvent) => void) =>
  runLoreStream(["push"], cwd, onEvent).then(ensureOk);
export const sync = (cwd: string, onEvent: (e: LoreEvent) => void) =>
  runLoreStream(["sync"], cwd, onEvent).then(ensureOk);

// ---- Branches ----

export async function branchList(cwd: string): Promise<Branch[]> {
  const o = ensureOk(await runLore(["branch", "list"], cwd));
  // Prefer local entries; dedupe by id keeping the current/local flavour.
  const entries = dataOf(o, "branchListEntry") as Branch[];
  const byId = new Map<string, Branch>();
  for (const b of entries) {
    const prev = byId.get(b.id);
    if (!prev || b.isCurrent) byId.set(b.id, b);
  }
  return [...byId.values()];
}

export const branchSwitch = (cwd: string, name: string) =>
  runLore(["branch", "switch", name], cwd).then(ensureOk);

export const branchCreate = (cwd: string, name: string) =>
  runLore(["branch", "create", name], cwd).then(ensureOk);

// ---- History ----

export async function history(cwd: string): Promise<Revision[]> {
  const o = ensureOk(await runLore(["revision", "history"], cwd));
  // History interleaves a revisionHistoryEntry with following metadata events.
  const revs: Revision[] = [];
  let current: Revision | null = null;
  for (const e of o.events) {
    if (e.tagName === "revisionHistoryEntry") {
      current = {
        revision: e.data.revision,
        revisionNumber: e.data.revisionNumber,
        parent: e.data.parent ?? [],
      };
      revs.push(current);
    } else if (e.tagName === "metadata" && current) {
      const key = e.data.key;
      const val = e.data.value?.data;
      if (key === "message") current.message = val;
      else if (key === "timestamp") current.timestamp = val;
      else if (key === "creator") current.creator = val;
    }
  }
  return revs;
}

// ---- Diff ----

export async function fileDiff(cwd: string, path: string): Promise<string> {
  const o = ensureOk(await runLore(["file", "diff", path], cwd));
  return (dataOf(o, "fileDiff") as any[]).map((d) => d.patch).join("\n");
}

export interface CommitFile {
  path: string;
  action: string;
}

/** Files changed by a revision = diff from its parent to itself. */
export async function commitFiles(
  cwd: string,
  parent: string,
  rev: string,
): Promise<CommitFile[]> {
  const o = ensureOk(await runLore(["revision", "diff", parent, "--target", rev], cwd));
  return (dataOf(o, "revisionDiffFile") as any[]).map((d) => ({
    path: d.path,
    action: d.action,
  }));
}

/** Unified diff of a single file as introduced by a revision. */
export async function revisionFileDiff(
  cwd: string,
  parent: string,
  rev: string,
  path: string,
): Promise<string> {
  const o = ensureOk(await runLore(["diff", "--source", parent, "--target", rev, path], cwd));
  return (dataOf(o, "fileDiff") as any[]).map((d) => d.patch).join("\n");
}

// ---- Repository ops ----

export const repositoryList = async (serverUrl: string): Promise<{ id: string; name: string }[]> => {
  const o = ensureOk(await runLore(["repository", "list", serverUrl]));
  return dataOf(o, "repositoryListEntry");
};

export const cloneRepo = (
  serverUrl: string,
  repo: string,
  dest: string,
  identity: string,
  onEvent: (e: LoreEvent) => void,
) => runLoreStream(["clone", `${serverUrl}/${repo}`, dest, "--identity", identity], undefined, onEvent).then(ensureOk);

export const createRepo = (
  serverUrl: string,
  repo: string,
  cwd: string,
  identity: string,
) => runLore(["repository", "create", `${serverUrl}/${repo}`, "--identity", identity], cwd).then(ensureOk);
