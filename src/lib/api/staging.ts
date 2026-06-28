import { runLore, ensureOk } from "../core";

export const stage = (cwd: string, files: string[]) =>
  runLore(["stage", ...files], cwd).then(ensureOk);
export const unstage = (cwd: string, files: string[]) =>
  runLore(["unstage", ...files], cwd).then(ensureOk);

// Stage / unstage everything under the repo root in a single cheap command —
// avoids passing tens of thousands of paths as args (which blows the OS
// command-line length limit). Dirty flags are already set by `status --scan`.
export const stageAllDir = (cwd: string) => runLore(["stage", "."], cwd).then(ensureOk);
export const unstageAllDir = (cwd: string) => runLore(["unstage", "."], cwd).then(ensureOk);

// Move/rename a tracked file (records it as a rename, not delete+add).
export const stageMove = (cwd: string, from: string, to: string) =>
  runLore(["stage", "move", from, to], cwd).then(ensureOk);

// Rebuild the staged set from scratch, respecting .loreignore: clears the
// staged anchor, then re-scans + re-stages only non-ignored changes. Used after
// .loreignore changes so already-staged-but-now-ignored files drop out (and
// their stale dirty flags clear), which a plain "stage ." would otherwise keep.
export async function reconcileStaging(cwd: string) {
  await runLore(["unstage", "."], cwd).then(ensureOk);
  return runLore(["stage", ".", "--scan"], cwd).then(ensureOk);
}
