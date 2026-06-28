import { runLore, ensureOk, dataOf } from "../core";

export interface LockEntry {
  path: string;
  owner: string;
  lockedAt?: number;
  branch?: string;
}

/** Acquire an edit lock on the given file(s). */
export const lockAcquire = (cwd: string, paths: string[]) =>
  runLore(["lock", "acquire", ...paths], cwd).then(ensureOk);

/** Release the edit lock on the given file(s). */
export const lockRelease = (cwd: string, paths: string[]) =>
  runLore(["lock", "release", ...paths], cwd).then(ensureOk);

/** Every lock currently held in the repository (across users). */
export async function lockQuery(cwd: string): Promise<LockEntry[]> {
  const o = ensureOk(await runLore(["lock", "query"], cwd));
  return (dataOf(o, "lockFileQuery") as any[]).map((d) => ({
    path: d.path,
    owner: d.owner,
    lockedAt: d.lockedAt,
    branch: d.branch,
  }));
}
