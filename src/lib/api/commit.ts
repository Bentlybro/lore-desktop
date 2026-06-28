import type { LoreEvent } from "../../types";
import { runLoreStream, ensureOk, firstData } from "../core";

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

// ---- Push / Sync (streamed for progress) ----

export const push = (cwd: string, onEvent: (e: LoreEvent) => void) =>
  runLoreStream(["push"], cwd, onEvent).then(ensureOk);
export const sync = (cwd: string, onEvent: (e: LoreEvent) => void) =>
  runLoreStream(["sync"], cwd, onEvent).then(ensureOk);
