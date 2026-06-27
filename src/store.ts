import { create } from "zustand";
import * as lore from "./lib/lore";
import type {
  Branch,
  FileRow,
  LoreEvent,
  Revision,
  RepoEntry,
  Settings,
  StatusRevision,
} from "./types";

export type Tab = "changes" | "history" | "branches";

export type CommitFileRow = { path: string; action: string };

function baseName(p: string): string {
  const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function fmtBytes(n: number): string {
  if (!n || n < 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

interface ProgressState {
  active: boolean;
  title: string;
  detail: string;
  frac: number; // 0..1, or -1 for indeterminate
}

/** Map a streamed commit/push/sync event to a progress-bar update. */
function progressFromEvent(e: LoreEvent): Partial<ProgressState> | null {
  const d = e.data ?? {};
  switch (e.tagName) {
    case "revisionCommitProgress":
    case "revisionCommitEnd": {
      const c = d.count ?? {};
      const bt = c.bytesTotal ?? 0;
      const frac =
        bt > 0 ? c.bytesTransferred / bt : c.fileTotal > 0 ? c.fileCount / c.fileTotal : -1;
      return {
        detail: `${(c.fileCount ?? 0).toLocaleString()} / ${(c.fileTotal ?? 0).toLocaleString()} files · ${fmtBytes(c.bytesTransferred ?? 0)} / ${fmtBytes(bt)}`,
        frac,
      };
    }
    case "branchPushFragmentBegin":
    case "branchPushFragmentProgress":
    case "branchPushFragmentEnd": {
      const bt = d.bytesTotal ?? 0;
      const frac = bt > 0 ? (d.bytesTransferred ?? 0) / bt : -1;
      const total = d.fragments ?? 0;
      return {
        detail: `${fmtBytes(d.bytesTransferred ?? 0)} / ${fmtBytes(bt)}${total ? ` · ${total.toLocaleString()} fragments` : ""}`,
        frac,
      };
    }
    default:
      return null;
  }
}

interface AppStore {
  settings: Settings | null;
  repos: RepoEntry[];
  current: RepoEntry | null;
  tab: Tab;

  revision?: StatusRevision;
  files: FileRow[];
  selectedPath: string | null;
  diff: string;
  diffLoading: boolean;

  branches: Branch[];
  history: Revision[];
  selectedRevision: Revision | null;
  commitFiles: CommitFileRow[];
  commitFileSelected: string | null;

  busy: boolean;
  progress: ProgressState;
  error: string | null;
  toast: string | null;

  init: () => Promise<void>;
  switchBranchRefresh: () => Promise<void>;
  loadHistory: () => Promise<void>;
  selectRevision: (r: Revision) => Promise<void>;
  selectCommitFile: (path: string) => Promise<void>;
  persistRepos: (repos: RepoEntry[]) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  selectRepo: (r: RepoEntry | null) => Promise<void>;
  setTab: (t: Tab) => void;
  refresh: (scan?: boolean) => Promise<void>;
  onRepoChanged: (paths: string[]) => Promise<void>;
  selectFile: (path: string) => Promise<void>;
  toggleStage: (f: FileRow) => Promise<void>;
  ignore: (path: string, kind: "file" | "ext" | "folder") => Promise<void>;
  stageAll: () => Promise<void>;
  commit: (message: string) => Promise<void>;
  push: () => Promise<void>;
  sync: () => Promise<void>;
  switchBranch: (name: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  addRepo: (path: string) => Promise<void>;
  clone: (repo: string, dest: string) => Promise<void>;
  createRepo: (repo: string, dir: string) => Promise<void>;
  setError: (e: string | null) => void;
  setToast: (t: string | null) => void;
}

export const useStore = create<AppStore>((set, get) => {
  /** Run an async action with busy state + error capture. */
  async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    set({ busy: true, error: null });
    try {
      return await fn();
    } catch (e: any) {
      set({ error: e?.message ?? String(e) });
      return undefined;
    } finally {
      set({ busy: false });
    }
  }

  return {
    settings: null,
    repos: [],
    current: null,
    tab: "changes",
    files: [],
    selectedPath: null,
    diff: "",
    diffLoading: false,
    branches: [],
    history: [],
    selectedRevision: null,
    commitFiles: [],
    commitFileSelected: null,
    busy: false,
    progress: { active: false, title: "", detail: "", frac: -1 },
    error: null,
    toast: null,

    async init() {
      const settings = await lore.getSettings();
      set({ settings, repos: settings.repos ?? [] });
    },

    async persistRepos(repos) {
      const settings = { ...(get().settings as Settings), repos };
      await lore.saveSettings(settings);
      set({ settings, repos });
    },

    async saveSettings(s) {
      await lore.saveSettings(s);
      set({ settings: s, repos: s.repos ?? [] });
    },

    async selectRepo(r) {
      set({
        current: r,
        files: [],
        selectedPath: null,
        diff: "",
        branches: [],
        history: [],
        revision: undefined,
        selectedRevision: null,
        commitFiles: [],
        commitFileSelected: null,
      });
      if (r) {
        // Warm mode: keep this repo's state hot for faster repeated scans/commits.
        lore.startService(r.path).catch(() => {});
        // Live change detection (GitHub-Desktop style).
        lore.startWatch(r.path).catch(() => {});
        await get().refresh();
      }
    },

    setTab(t) {
      set({ tab: t });
      const { current } = get();
      if (!current) return;
      if (t === "branches") get().switchBranchRefresh();
      if (t === "history") get().loadHistory();
    },

    // internal helpers exposed on the object below
    switchBranchRefresh: async () => {
      const { current } = get();
      if (!current) return;
      await guard(async () => set({ branches: await lore.branchList(current.path) }));
    },
    loadHistory: async () => {
      const { current } = get();
      if (!current) return;
      await guard(async () => set({ history: await lore.history(current.path) }));
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
      await guard(async () => {
        const files = await lore.commitFiles(current.path, parent, r.revision);
        set({ commitFiles: files });
      });
    },

    async selectCommitFile(path) {
      const { current, selectedRevision } = get();
      if (!current || !selectedRevision) return;
      const parent = (selectedRevision.parent && selectedRevision.parent[0]) || "";
      set({ commitFileSelected: path, diffLoading: true, diff: "" });
      try {
        const patch = await lore.revisionFileDiff(
          current.path,
          parent,
          selectedRevision.revision,
          path,
        );
        set({ diff: patch || "(no textual diff — binary or unchanged)" });
      } catch (e: any) {
        set({ diff: `(diff unavailable: ${e?.message ?? e})` });
      } finally {
        set({ diffLoading: false });
      }
    },

    async refresh(scan = true) {
      const { current } = get();
      if (!current) return;
      await guard(async () => {
        const s = await lore.status(current.path, scan);
        set({ revision: s.revision ?? undefined, files: s.files });
        const sel = get().selectedPath;
        if (sel && s.files.some((f) => f.p === sel)) await get().selectFile(sel);
      });
    },

    async onRepoChanged(paths) {
      const { current, busy } = get();
      if (!current || paths.length === 0) return;
      // An operation/refresh is already running; it refreshes when it finishes.
      if (busy) return;
      // Only meaningful on the Changes tab.
      if (get().tab !== "changes") return;
      try {
        if (paths.length <= 100) {
          // Scoped content-compare of just the changed paths (cheap) — only
          // reflects REAL changes, never phantoms from Lore's own file touches.
          await lore.scanPaths(current.path, paths);
          await get().refresh(false);
        } else {
          // Big batch (e.g. a Unity reimport) — a full scan is the safer call.
          await get().refresh(true);
        }
      } catch {
        await get().refresh(true);
      }
    },

    async selectFile(path) {
      const { current } = get();
      if (!current) return;
      set({ selectedPath: path, diffLoading: true, diff: "" });
      try {
        const patch = await lore.fileDiff(current.path, path);
        set({ diff: patch || "(no textual diff — file may be new or binary)" });
      } catch (e: any) {
        set({ diff: `(diff unavailable: ${e?.message ?? e})` });
      } finally {
        set({ diffLoading: false });
      }
    },

    async toggleStage(f) {
      const { current, files } = get();
      if (!current) return;
      const target = !f.s;
      // Optimistic local flip — no full re-scan (which is brutal on huge repos).
      set({ files: files.map((x) => (x.p === f.p ? { ...x, s: target } : x)) });
      try {
        if (target) await lore.stage(current.path, [f.p]);
        else await lore.unstage(current.path, [f.p]);
      } catch (e: any) {
        set({ error: e?.message ?? String(e) });
        await get().refresh(false); // resync on failure
      }
    },

    async ignore(path, kind) {
      const { current } = get();
      if (!current) return;
      let pattern = "";
      if (kind === "file") {
        pattern = "/" + path;
      } else if (kind === "ext") {
        const base = path.split("/").pop() ?? "";
        const dot = base.lastIndexOf(".");
        if (dot > 0) pattern = "*" + base.slice(dot); // "*.ext"
      } else if (kind === "folder") {
        const slash = path.lastIndexOf("/");
        if (slash >= 0) pattern = "/" + path.slice(0, slash) + "/";
      }
      if (!pattern) return;
      await guard(() => lore.ignoreAdd(current.path, pattern));
      await get().refresh(true);
      set({ toast: `Ignored ${pattern}` });
    },

    async stageAll() {
      const { current, files } = get();
      if (!current || files.length === 0) return;
      // Optimistic: flip all rows to staged immediately, stage them all with a
      // single `lore stage .` in the background (never pass N paths → no OS
      // command-line blowup, no 7s re-scan). Busy spinner covers the bg stage
      // so a commit can't fire before staging finishes.
      set({ files: files.map((x) => ({ ...x, s: true })), busy: true, error: null });
      try {
        await lore.stageAllDir(current.path);
      } catch (e: any) {
        set({ error: e?.message ?? String(e) });
        await get().refresh(false);
      } finally {
        set({ busy: false });
      }
    },

    async commit(message) {
      const { current } = get();
      if (!current) return;
      set({
        progress: { active: true, title: "Committing…", detail: "Fragmenting & hashing…", frac: -1 },
      });
      const ok = await guard(() =>
        lore.commit(current.path, message, (e) => {
          const p = progressFromEvent(e);
          if (p) set((st) => ({ progress: { ...st.progress, ...p } }));
        }),
      );
      set((st) => ({ progress: { ...st.progress, active: false } }));
      if (ok !== undefined) set({ toast: "Committed" });
      await get().refresh(false);
      await get().loadHistory();
    },

    async push() {
      const { current } = get();
      if (!current) return;
      set({ progress: { active: true, title: "Pushing…", detail: "", frac: -1 } });
      await guard(() =>
        lore.push(current.path, (e) => {
          const p = progressFromEvent(e);
          if (p) set((st) => ({ progress: { ...st.progress, ...p } }));
        }),
      );
      set((st) => ({ progress: { ...st.progress, active: false }, toast: "Push complete" }));
      await get().refresh(false);
    },

    async sync() {
      const { current } = get();
      if (!current) return;
      set({ progress: { active: true, title: "Syncing…", detail: "", frac: -1 } });
      await guard(() =>
        lore.sync(current.path, (e) => {
          const p = progressFromEvent(e);
          if (p) set((st) => ({ progress: { ...st.progress, ...p } }));
        }),
      );
      set((st) => ({ progress: { ...st.progress, active: false }, toast: "Sync complete" }));
      await get().refresh(false);
      await get().loadHistory();
    },

    async switchBranch(name) {
      const { current } = get();
      if (!current) return;
      await guard(() => lore.branchSwitch(current.path, name));
      await get().switchBranchRefresh();
      await get().refresh(true);
      await get().loadHistory();
      set({ toast: `Switched to ${name}` });
    },

    async createBranch(name) {
      const { current } = get();
      if (!current) return;
      await guard(() => lore.branchCreate(current.path, name));
      await get().switchBranchRefresh();
      set({ toast: `Created branch ${name}` });
    },

    async addRepo(path) {
      const settings = get().settings as Settings;
      const entry: RepoEntry = { name: baseName(path), path, serverUrl: settings.serverUrl };
      const repos = [...get().repos.filter((r) => r.path !== path), entry];
      await get().persistRepos(repos);
      await get().selectRepo(entry);
    },

    async clone(repo, dest) {
      const settings = get().settings as Settings;
      set({ progress: { active: true, title: `Cloning ${repo}…`, detail: "", frac: -1 } });
      const res = await guard(() =>
        lore.cloneRepo(settings.serverUrl, repo, dest, settings.identity, (e) => {
          const p = progressFromEvent(e);
          if (p) set((st) => ({ progress: { ...st.progress, ...p } }));
        }),
      );
      set((st) => ({ progress: { ...st.progress, active: false } }));
      if (res !== undefined) await get().addRepo(dest);
    },

    async createRepo(repo, dir) {
      const settings = get().settings as Settings;
      const res = await guard(() => lore.createRepo(settings.serverUrl, repo, dir, settings.identity));
      if (res !== undefined) await get().addRepo(dir);
    },

    setError(e) {
      set({ error: e });
    },
    setToast(t) {
      set({ toast: t });
    },
  };
});
