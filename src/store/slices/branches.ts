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
});
