import type { Revision } from "../../types";
import { runLore, ensureOk } from "../core";

export interface FileRevision extends Revision {
  action: string;
}

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

/** Revisions that touched a single file, newest first (each tagged with its action). */
export async function fileHistory(cwd: string, path: string, length?: number): Promise<FileRevision[]> {
  const args = ["file", "history", path];
  if (length) args.push(String(length));
  const o = ensureOk(await runLore(args, cwd));
  // `file history` emits a `fileHistory` entry per revision, each followed by
  // its message/timestamp/creator metadata events (same shape as revision history).
  const revs: FileRevision[] = [];
  let current: FileRevision | null = null;
  for (const e of o.events) {
    if (e.tagName === "fileHistory") {
      current = {
        revision: e.data.revision,
        revisionNumber: e.data.revisionNumber,
        parent: Array.isArray(e.data.parent) ? e.data.parent : [],
        action: e.data.action ?? "modify",
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
