import type { HistorySlice, StoreSet, StoreGet } from "../types";
import * as lore from "../../lib/lore";
import { guard } from "../guard";

const HISTORY_PAGE = 100;

export const createHistorySlice = (set: StoreSet, get: StoreGet): HistorySlice => ({
  history: [],
  historyLimit: HISTORY_PAGE,
  historyHasMore: false,
  selectedRevision: null,
  commitFiles: [],
  commitFileSelected: null,

  async loadHistory() {
    const { current, historyLimit } = get();
    if (!current) return;
    const ep = get().epoch;
    set({ busy: true });
    try {
      const revs = await lore.history(current.path, historyLimit);
      if (get().epoch !== ep) return; // repo switched mid-load
      set({ history: revs, historyHasMore: revs.length >= historyLimit });
    } catch (e: any) {
      if (get().epoch === ep) set({ error: e?.message ?? String(e) });
    } finally {
      if (get().epoch === ep) set({ busy: false });
    }
  },

  async loadMoreHistory() {
    set({ historyLimit: get().historyLimit + HISTORY_PAGE });
    await get().loadHistory();
  },

  async selectRevision(r) {
    const { current } = get();
    if (!current) return;
    const ep = get().epoch;
    set({ selectedRevision: r, commitFiles: [], commitFileSelected: null, diff: "" });
    const parent = (r.parent && r.parent[0]) || "";
    if (!parent || /^0+$/.test(parent)) {
      set({ diff: "(root revision — no parent commit to diff against)" });
      return;
    }
    await guard(set, async () => {
      const files = await lore.commitFiles(current.path, parent, r.revision);
      if (get().epoch !== ep || get().selectedRevision?.revision !== r.revision) return; // superseded
      set({ commitFiles: files });
    });
  },

  async revertRevision(rev) {
    const { current } = get();
    if (!current) return;
    // Conflicts are expected (CLI may exit non-zero) — capture, surface below.
    set({ busy: true, error: null });
    let err: string | null = null;
    try {
      await lore.revert(current.path, rev.revision);
    } catch (e: any) {
      err = e?.message ?? String(e);
    } finally {
      set({ busy: false });
    }
    await get().refresh(true);
    await get().loadHistory();
    const conflicts = get().files.some((f) => f.c);
    if (conflicts)
      set({ error: null, conflictOp: "revert", toast: `Revert of #${rev.revisionNumber} has conflicts — resolve, then commit` });
    else if (err) set({ error: err });
    else set({ conflictOp: null, toast: `Reverted #${rev.revisionNumber}` });
  },

  async cherryPickRevision(rev) {
    const { current } = get();
    if (!current) return;
    set({ busy: true, error: null });
    let err: string | null = null;
    try {
      await lore.cherryPick(current.path, rev.revision);
    } catch (e: any) {
      err = e?.message ?? String(e);
    } finally {
      set({ busy: false });
    }
    await get().refresh(true);
    await get().loadHistory();
    const conflicts = get().files.some((f) => f.c);
    if (conflicts)
      set({ error: null, conflictOp: "cherry-pick", toast: `Cherry-pick of #${rev.revisionNumber} has conflicts — resolve, then commit` });
    else if (err) set({ error: err });
    else set({ conflictOp: null, toast: `Cherry-picked #${rev.revisionNumber}` });
  },

  async resetBranchTo(rev) {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.branchReset(current.path, rev.revision));
    await get().refresh(true);
    await get().loadHistory();
    await get().switchBranchRefresh();
    set({ toast: `Branch reset to #${rev.revisionNumber}` });
  },

  async selectCommitFile(path) {
    const { current, selectedRevision } = get();
    if (!current || !selectedRevision) return;
    const ep = get().epoch;
    const rev = selectedRevision.revision;
    const parent = (selectedRevision.parent && selectedRevision.parent[0]) || "";
    set({ commitFileSelected: path, diffLoading: true, diff: "" });
    const stale = () =>
      get().epoch !== ep || get().commitFileSelected !== path || get().selectedRevision?.revision !== rev;
    try {
      const patch = await lore.revisionFileDiff(current.path, parent, rev, path);
      if (stale()) return; // superseded by another selection / repo switch
      set({ diff: patch || "(no textual diff — binary or unchanged)", diffLoading: false });
    } catch (e: any) {
      if (stale()) return;
      set({ diff: `(diff unavailable: ${e?.message ?? e})`, diffLoading: false });
    }
  },
});
