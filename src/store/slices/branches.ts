import type { BranchSlice, StoreSet, StoreGet } from "../types";
import * as lore from "../../lib/lore";
import { guard } from "../guard";

export const createBranchSlice = (set: StoreSet, get: StoreGet): BranchSlice => ({
  branches: [],

  // Read-only refresher: manages `busy` itself and never clears `error`, so a
  // refresh triggered right after a failed action can't wipe its toast.
  async switchBranchRefresh() {
    const { current } = get();
    if (!current) return;
    set({ busy: true });
    try {
      set({ branches: await lore.branchList(current.path) });
    } catch (e: any) {
      set({ error: e?.message ?? String(e) });
    } finally {
      set({ busy: false });
    }
  },

  async switchBranch(name) {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.branchSwitch(current.path, name));
    await get().switchBranchRefresh();
    await get().refresh(true);
    await get().loadHistory();
    set({ toast: `Switched to ${name}` });
  },

  async createBranch(name) {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.branchCreate(current.path, name));
    await get().switchBranchRefresh();
    set({ toast: `Created branch ${name}` });
  },

  async mergeBranch(name) {
    const { current } = get();
    if (!current) return;
    // Conflicts are an expected outcome (not a hard failure): the CLI may exit
    // non-zero, so capture the error and only surface it if no conflicts arose.
    set({ busy: true, error: null });
    let mergeErr: string | null = null;
    try {
      await lore.branchMerge(current.path, name);
    } catch (e: any) {
      mergeErr = e?.message ?? String(e);
    } finally {
      set({ busy: false });
    }
    await get().switchBranchRefresh();
    await get().refresh(true);
    await get().loadHistory();
    const conflicts = get().files.some((f) => f.c);
    if (conflicts) set({ error: null, toast: `Merge of ${name} has conflicts — resolve each, then commit` });
    else if (mergeErr) set({ error: mergeErr });
    else set({ toast: `Merged ${name}` });
  },

  async abortMerge() {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.mergeAbort(current.path));
    await get().refresh(true);
    await get().loadHistory();
    set({ toast: "Merge aborted" });
  },

  async resolveConflict(path, side) {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.mergeResolve(current.path, side, [path]));
    if (get().selectedPath === path) set({ selectedPath: null, diff: "" });
    await get().refresh(true);
  },

  async resolveAllConflicts(side) {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.mergeResolve(current.path, side));
    await get().refresh(true);
    set({ toast: `Resolved all conflicts using ${side === "mine" ? "my" : "their"} version` });
  },
});
