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
    const ep = get().epoch;
    set({ busy: true });
    try {
      const list = await lore.branchList(current.path);
      if (get().epoch !== ep) return; // repo switched mid-load
      set({ branches: list });
    } catch (e: any) {
      if (get().epoch === ep) set({ error: e?.message ?? String(e) });
    } finally {
      if (get().epoch === ep) set({ busy: false });
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

  async archiveBranch(name) {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.branchArchive(current.path, name));
    await get().switchBranchRefresh();
    set({ toast: `Archived ${name}` });
  },

  async protectBranch(name, protect) {
    const { current } = get();
    if (!current) return;
    await guard(set, () =>
      protect ? lore.branchProtect(current.path, name) : lore.branchUnprotect(current.path, name),
    );
    await get().switchBranchRefresh();
    set({ toast: `${protect ? "Protected" : "Unprotected"} ${name}` });
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
    if (conflicts) set({ error: null, conflictOp: "merge", toast: `Merge of ${name} has conflicts — resolve each, then commit` });
    else if (mergeErr) set({ error: mergeErr });
    else set({ conflictOp: null, toast: `Merged ${name}` });
  },

  // Abort whichever conflicting operation is in progress (merge/revert/cherry-pick).
  async abortConflict() {
    const { current, conflictOp } = get();
    if (!current) return;
    const op = conflictOp ?? "merge";
    const abort =
      op === "revert" ? lore.revertAbort : op === "cherry-pick" ? lore.cherryPickAbort : lore.mergeAbort;
    await guard(set, () => abort(current.path));
    set({ conflictOp: null });
    await get().refresh(true);
    await get().loadHistory();
    set({ toast: `${op === "merge" ? "Merge" : op === "revert" ? "Revert" : "Cherry-pick"} aborted` });
  },

  async resolveConflict(path, side) {
    const { current, conflictOp } = get();
    if (!current) return;
    const op = conflictOp ?? "merge";
    const resolve =
      op === "revert" ? lore.revertResolve : op === "cherry-pick" ? lore.cherryPickResolve : lore.mergeResolve;
    await guard(set, () => resolve(current.path, side, [path]));
    if (get().selectedPath === path) set({ selectedPath: null, diff: "" });
    await get().refresh(true);
    if (!get().files.some((f) => f.c)) set({ conflictOp: null });
  },

  async resolveAllConflicts(side) {
    const { current, conflictOp } = get();
    if (!current) return;
    const op = conflictOp ?? "merge";
    const resolve =
      op === "revert" ? lore.revertResolve : op === "cherry-pick" ? lore.cherryPickResolve : lore.mergeResolve;
    await guard(set, () => resolve(current.path, side));
    await get().refresh(true);
    if (!get().files.some((f) => f.c)) set({ conflictOp: null });
    set({ toast: `Resolved all conflicts using ${side === "mine" ? "my" : "their"} version` });
  },
});
