import type { StoreSet, UiSlice } from "../types";

export const createUiSlice = (set: StoreSet): UiSlice => ({
  busy: false,
  progress: { active: false, title: "", detail: "", frac: -1 },
  error: null,
  toast: null,
  confirm: null,
  fileHistoryPath: null,
  renamePath: null,
  compare: null,
  setError(e) {
    set({ error: e });
  },
  setToast(t) {
    set({ toast: t });
  },
  askConfirm(c) {
    set({ confirm: c });
  },
  closeConfirm() {
    set({ confirm: null });
  },
  openFileHistory(path) {
    set({ fileHistoryPath: path });
  },
  closeFileHistory() {
    set({ fileHistoryPath: null });
  },
  openRename(path) {
    set({ renamePath: path });
  },
  closeRename() {
    set({ renamePath: null });
  },
  openCompare(c) {
    set({ compare: c });
  },
  closeCompare() {
    set({ compare: null });
  },
});
