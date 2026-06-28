import type { LoreEvent } from "../types";
import type { ProgressState } from "./types";
import { fmtBytes } from "../lib/format";

/** Map a streamed commit/push/sync event to a progress-bar update. */
export function progressFromEvent(e: LoreEvent): Partial<ProgressState> | null {
  const d = e.data ?? {};
  switch (e.tagName) {
    case "revisionCommitProgress":
    case "revisionCommitEnd": {
      const c = d.count ?? {};
      const ft = c.fileTotal ?? 0;
      const bt = c.bytesTotal ?? 0;
      const fileFrac = ft > 0 ? (c.fileCount ?? 0) / ft : -1;
      const byteFrac = bt > 0 ? (c.bytesTransferred ?? 0) / bt : -1;
      // Use the lagging dimension so the bar never reads "almost done" while a
      // big chunk of work (e.g. many small files) is still outstanding.
      const frac =
        fileFrac >= 0 && byteFrac >= 0 ? Math.min(fileFrac, byteFrac) : Math.max(fileFrac, byteFrac);
      return {
        detail: `${(c.fileCount ?? 0).toLocaleString()} / ${ft.toLocaleString()} files · ${fmtBytes(c.bytesTransferred ?? 0)} / ${fmtBytes(bt)}`,
        frac,
      };
    }
    case "branchPushFragmentBegin":
    case "branchPushFragmentProgress":
    case "branchPushFragmentEnd": {
      const bt = d.bytesTotal ?? 0;
      const frac = bt > 0 ? (d.bytesTransferred ?? 0) / bt : -1;
      const total = d.fragments ?? 0;
      return {
        detail: `${fmtBytes(d.bytesTransferred ?? 0)} / ${fmtBytes(bt)}${total ? ` · ${total.toLocaleString()} fragments` : ""}`,
        frac,
      };
    }
    default:
      return null;
  }
}
