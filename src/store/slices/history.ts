import type { HistorySlice, StoreSet, StoreGet } from "../types";
import * as lore from "../../lib/lore";
import { guard } from "../guard";

export const createHistorySlice = (set: StoreSet, get: StoreGet): HistorySlice => ({
  history: [],
  selectedRevision: null,
  commitFiles: [],
  commitFileSelected: null,

  async loadHistory() {
    const { current } = get();
    if (!current) return;
    set({ busy: true });
    try {
      set({ history: await lore.history(current.path) });
    } catch (e: any) {
      set({ error: e?.message ?? String(e) });
    } finally {
      set({ busy: false });
    }
  },

  async selectRevision(r) {
    const { current } = get();
    if (!current) return;
    set({ selectedRevision: r, commitFiles: [], commitFileSelected: null, diff: "" });
    const parent = (r.parent && r.parent[0]) || "";
    if (!parent || /^0+$/.test(parent)) {
      set({ diff: "(root revision — no parent commit to diff against)" });
      return;
    }
    await guard(set, async () => {
      const files = await lore.commitFiles(current.path, parent, r.revision);
      set({ commitFiles: files });
    });
  },

  async revertRevision(rev) {
    const { current } = get();
    if (!current) return;
    const ok = await guard(set, () => lore.revert(current.path, rev.revision));
    if (ok !== undefined) set({ toast: `Reverted #${rev.revisionNumber}` });
    await get().refresh(true);
    await get().loadHistory();
  },

  async selectCommitFile(path) {
    const { current, selectedRevision } = get();
    if (!current || !selectedRevision) return;
    const parent = (selectedRevision.parent && selectedRevision.parent[0]) || "";
    set({ commitFileSelected: path, diffLoading: true, diff: "" });
    try {
      const patch = await lore.revisionFileDiff(current.path, parent, selectedRevision.revision, path);
      set({ diff: patch || "(no textual diff — binary or unchanged)" });
    } catch (e: any) {
      set({ diff: `(diff unavailable: ${e?.message ?? e})` });
    } finally {
      set({ diffLoading: false });
    }
  },
});
