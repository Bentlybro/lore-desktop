import type { StoreSet, UiSlice } from "../types";

export const createUiSlice = (set: StoreSet): UiSlice => ({
  busy: false,
  progress: { active: false, title: "", detail: "", frac: -1 },
  error: null,
  toast: null,
  setError(e) {
    set({ error: e });
  },
  setToast(t) {
    set({ toast: t });
  },
});
