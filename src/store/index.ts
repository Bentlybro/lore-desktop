import { create } from "zustand";
import type { AppStore } from "./types";
import { createUiSlice } from "./slices/ui";
import { createReposSlice } from "./slices/repos";
import { createChangesSlice } from "./slices/changes";
import { createBranchSlice } from "./slices/branches";
import { createHistorySlice } from "./slices/history";

export const useStore = create<AppStore>((set, get) => ({
  ...createUiSlice(set),
  ...createReposSlice(set, get),
  ...createChangesSlice(set, get),
  ...createBranchSlice(set, get),
  ...createHistorySlice(set, get),
}));

export type { AppStore, Tab, CommitFileRow, ProgressState } from "./types";
