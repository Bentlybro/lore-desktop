import { runLore, ensureOk } from "../core";

/** Amend the latest revision (new message + currently staged changes). */
export const amend = (cwd: string, message: string) =>
  runLore(["revision", "amend", message], cwd).then(ensureOk);

export interface RevisionOpClass {
  message?: string;
  noCommit?: boolean;
}

/** Revert a revision (auto-commits when there are no conflicts). */
export const revert = (cwd: string, revision: string, opts: RevisionOpClass = {}) => {
  const args = ["revision", "revert", revision];
  if (opts.message) args.push("--message", opts.message);
  if (opts.noCommit) args.push("--no-commit");
  return runLore(args, cwd).then(ensureOk);
};
export const revertAbort = (cwd: string) =>
  runLore(["revision", "revert", "abort"], cwd).then(ensureOk);

/** Apply a single revision's changes onto the current branch. */
export const cherryPick = (cwd: string, revision: string, opts: RevisionOpClass = {}) => {
  const args = ["revision", "cherry-pick", revision];
  if (opts.message) args.push("--message", opts.message);
  if (opts.noCommit) args.push("--no-commit");
  return runLore(args, cwd).then(ensureOk);
};
export const cherryPickAbort = (cwd: string) =>
  runLore(["revision", "cherry-pick", "abort"], cwd).then(ensureOk);

/** Restore the working tree to the current revision (discard everything). */
export const restore = (cwd: string, message?: string) =>
  runLore(message ? ["revision", "restore", message] : ["revision", "restore"], cwd).then(ensureOk);
