import { runLore, ensureOk } from "../core";

export interface ResetOpts {
  /** Also delete untracked files among the given paths (discards new files). */
  purge?: boolean;
  /** Reset the files to this revision instead of the current one. */
  revision?: string;
}

/** Discard working-tree changes for the given paths (restore to committed state). */
export const reset = (cwd: string, paths: string[], opts: ResetOpts = {}) => {
  const args = ["reset"];
  if (opts.purge) args.push("--purge");
  if (opts.revision) args.push("--revision", opts.revision);
  args.push(...paths);
  return runLore(args, cwd).then(ensureOk);
};
