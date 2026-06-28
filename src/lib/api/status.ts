import { invoke } from "@tauri-apps/api/core";
import type { StatusPayload } from "../../types";
import { runLore, ensureOk, LoreError } from "../core";

// Dedicated, lean status command. `scan: true` does the full filesystem walk
// (detects external edits, slow on huge repos); `scan: false` is the cheap
// read of persisted dirty/staged flags — used to refresh after our own actions.
export async function status(cwd: string, scan = true): Promise<StatusPayload> {
  const p = await invoke<StatusPayload>("lore_status", { cwd, scan });
  if (!p.ok) throw new LoreError(p.error ?? "status failed", null);
  return p;
}

// Content-compare just the given paths (a scoped scan): detects real
// adds/edits/deletes AND clears phantom dirty flags from FS events on files
// whose content actually matches the commit. Cheap — only walks the listed
// paths, not the whole tree. Used by the live file watcher.
export const scanPaths = (cwd: string, paths: string[]) =>
  runLore(["status", "--scan", ...paths], cwd).then(ensureOk);
