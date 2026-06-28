// Shared store types. AppStore is the intersection of every slice's interface,
// so each slice file stays focused while get()/set() see the whole store.
import type { StoreApi } from "zustand";
import type { Branch, FileRow, Revision, RepoEntry, Settings, StatusRevision } from "../types";

export type Tab = "changes" | "history" | "branches";
export type CommitFileRow = { path: string; action: string };

export interface ProgressState {
  active: boolean;
  title: string;
  detail: string;
  frac: number; // 0..1, or -1 for indeterminate
}

export interface ReposSlice {
  settings: Settings | null;
  repos: RepoEntry[];
  current: RepoEntry | null;
  tab: Tab;
  init: () => Promise<void>;
  persistRepos: (repos: RepoEntry[]) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  selectRepo: (r: RepoEntry | null) => Promise<void>;
  setTab: (t: Tab) => void;
  addRepo: (path: string) => Promise<void>;
  removeRepo: (path: string) => Promise<void>;
  renameRepo: (path: string, name: string) => Promise<void>;
  deleteRepo: (repo: RepoEntry) => Promise<void>;
  clone: (repo: string, dest: string) => Promise<void>;
  createRepo: (repo: string, dir: string) => Promise<void>;
}

export interface ChangesSlice {
  revision?: StatusRevision;
  files: FileRow[];
  selectedPath: string | null;
  diff: string;
  diffLoading: boolean;
  refresh: (scan?: boolean) => Promise<void>;
  onRepoChanged: (paths: string[]) => Promise<void>;
  selectFile: (path: string) => Promise<void>;
  toggleStage: (f: FileRow) => Promise<void>;
  ignore: (path: string, kind: "file" | "ext" | "folder") => Promise<void>;
  makeLoreignore: (gitignorePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  commit: (message: string) => Promise<void>;
  push: () => Promise<void>;
  sync: () => Promise<void>;
}

export interface BranchSlice {
  branches: Branch[];
  switchBranchRefresh: () => Promise<void>;
  switchBranch: (name: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
}

export interface HistorySlice {
  history: Revision[];
  selectedRevision: Revision | null;
  commitFiles: CommitFileRow[];
  commitFileSelected: string | null;
  loadHistory: () => Promise<void>;
  selectRevision: (r: Revision) => Promise<void>;
  selectCommitFile: (path: string) => Promise<void>;
}

export interface UiSlice {
  busy: boolean;
  progress: ProgressState;
  error: string | null;
  toast: string | null;
  setError: (e: string | null) => void;
  setToast: (t: string | null) => void;
}

export type AppStore = ReposSlice & ChangesSlice & BranchSlice & HistorySlice & UiSlice;

export type StoreSet = StoreApi<AppStore>["setState"];
export type StoreGet = StoreApi<AppStore>["getState"];
