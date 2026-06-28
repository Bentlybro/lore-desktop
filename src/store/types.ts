// Shared store types. AppStore is the intersection of every slice's interface,
// so each slice file stays focused while get()/set() see the whole store.
import type { StoreApi } from "zustand";
import type { Branch, FileRow, Revision, RepoEntry, Settings, StatusRevision } from "../types";
import type { LockEntry } from "../lib/api/lock";

export type Tab = "changes" | "history" | "branches";
export type CommitFileRow = { path: string; action: string };
export type ConflictOp = "merge" | "revert" | "cherry-pick";

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
  conflictOp: ConflictOp | null;
  amendMode: boolean;
  setAmendMode: (b: boolean) => void;
  locks: Record<string, LockEntry>;
  loadLocks: () => Promise<void>;
  lockFile: (path: string) => Promise<void>;
  unlockFile: (path: string) => Promise<void>;
  refresh: (scan?: boolean) => Promise<void>;
  onRepoChanged: (paths: string[]) => Promise<void>;
  selectFile: (path: string) => Promise<void>;
  toggleStage: (f: FileRow) => Promise<void>;
  ignore: (path: string, kind: "file" | "ext" | "folder") => Promise<void>;
  makeLoreignore: (gitignorePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  discard: (file: FileRow) => Promise<void>;
  discardAll: () => Promise<void>;
  moveFile: (from: string, to: string) => Promise<void>;
  commit: (message: string) => Promise<void>;
  amend: (message: string) => Promise<void>;
  push: () => Promise<void>;
  sync: () => Promise<void>;
}

export interface BranchSlice {
  branches: Branch[];
  switchBranchRefresh: () => Promise<void>;
  switchBranch: (name: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  mergeBranch: (name: string) => Promise<void>;
  abortConflict: () => Promise<void>;
  resolveConflict: (path: string, side: "mine" | "theirs") => Promise<void>;
  resolveAllConflicts: (side: "mine" | "theirs") => Promise<void>;
  archiveBranch: (name: string) => Promise<void>;
  protectBranch: (name: string, protect: boolean) => Promise<void>;
}

export interface HistorySlice {
  history: Revision[];
  historyLimit: number;
  historyHasMore: boolean;
  selectedRevision: Revision | null;
  commitFiles: CommitFileRow[];
  commitFileSelected: string | null;
  loadHistory: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  selectRevision: (r: Revision) => Promise<void>;
  selectCommitFile: (path: string) => Promise<void>;
  revertRevision: (rev: Revision) => Promise<void>;
  cherryPickRevision: (rev: Revision) => Promise<void>;
  resetBranchTo: (rev: Revision) => Promise<void>;
}

export interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface CompareRefs {
  baseRev: string;
  baseLabel: string;
  targetRev: string;
  targetLabel: string;
}

export interface UiSlice {
  busy: boolean;
  progress: ProgressState;
  error: string | null;
  toast: string | null;
  confirm: ConfirmState | null;
  fileHistoryPath: string | null;
  renamePath: string | null;
  compare: CompareRefs | null;
  setError: (e: string | null) => void;
  setToast: (t: string | null) => void;
  askConfirm: (c: ConfirmState) => void;
  closeConfirm: () => void;
  openFileHistory: (path: string) => void;
  closeFileHistory: () => void;
  openRename: (path: string) => void;
  closeRename: () => void;
  openCompare: (c: CompareRefs) => void;
  closeCompare: () => void;
}

export type AppStore = ReposSlice & ChangesSlice & BranchSlice & HistorySlice & UiSlice;

export type StoreSet = StoreApi<AppStore>["setState"];
export type StoreGet = StoreApi<AppStore>["getState"];
