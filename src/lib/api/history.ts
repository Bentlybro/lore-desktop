import type { Revision } from "../../types";
import { runLore, ensureOk } from "../core";

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
