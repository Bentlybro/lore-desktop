import { runLore, ensureOk, dataOf } from "../core";

export async function fileDiff(cwd: string, path: string): Promise<string> {
  const o = ensureOk(await runLore(["file", "diff", path], cwd));
  return (dataOf(o, "fileDiff") as any[]).map((d) => d.patch).join("\n");
}

export interface CommitFile {
  path: string;
  action: string;
}

/** Files changed by a revision = diff from its parent to itself. */
export async function commitFiles(cwd: string, parent: string, rev: string): Promise<CommitFile[]> {
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
