import type { RepoEntry, Settings } from "../../types";
import type { ReposSlice, StoreSet, StoreGet } from "../types";
import * as lore from "../../lib/lore";
import { baseName } from "../../lib/format";
import { guard } from "../guard";
import { progressFromEvent } from "../progress";

export const createReposSlice = (set: StoreSet, get: StoreGet): ReposSlice => ({
  settings: null,
  repos: [],
  current: null,
  tab: "changes",
  epoch: 0,

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
      epoch: get().epoch + 1, // invalidate any in-flight loads from the previous repo
      current: r,
      files: [],
      selectedPath: null,
      diff: "",
      branches: [],
      history: [],
      historyLimit: 100,
      historyHasMore: false,
      revision: undefined,
      selectedRevision: null,
      commitFiles: [],
      commitFileSelected: null,
      locks: {},
    });
    if (r) {
      // Warm mode: keep this repo's state hot for faster repeated scans/commits.
      lore.startService(r.path).catch(() => {});
      // Live change detection (GitHub-Desktop style).
      lore.startWatch(r.path).catch(() => {});
      await get().refresh();
      get().loadLocks();
    } else {
      lore.stopWatch().catch(() => {});
    }
  },

  setTab(t) {
    set({ tab: t });
    const { current } = get();
    if (!current) return;
    if (t === "branches") get().switchBranchRefresh();
    if (t === "history") get().loadHistory();
  },

  async addRepo(path) {
    // Auto-seed .loreignore from .gitignore so junk (build dirs, etc.) is
    // excluded from the very first scan. No-op if either condition fails.
    await lore.seedLoreignore(path).catch(() => {});
    const settings = get().settings as Settings;
    const entry: RepoEntry = { name: baseName(path), path, serverUrl: settings.serverUrl };
    const repos = [...get().repos.filter((r) => r.path !== path), entry];
    await get().persistRepos(repos);
    await get().selectRepo(entry);
  },

  async removeRepo(path) {
    const repos = get().repos.filter((r) => r.path !== path);
    await get().persistRepos(repos);
    if (get().current?.path === path) await get().selectRepo(null);
  },

  async renameRepo(path, name) {
    const repos = get().repos.map((r) => (r.path === path ? { ...r, name } : r));
    await get().persistRepos(repos);
    const cur = get().current;
    if (cur?.path === path) set({ current: { ...cur, name } });
  },

  async deleteRepo(repo) {
    set({ busy: true, error: null });
    let serverMsg: string | null = null;
    try {
      // Best-effort server delete (auth-gated servers refuse — handled).
      const url = await lore.repoRemoteUrl(repo.path).catch(() => "");
      if (url) {
        const o = await lore.runLore(["repository", "delete", url], repo.path);
        if (!o.ok) serverMsg = o.error ?? "server refused";
      }
    } catch (e: any) {
      serverMsg = e?.message ?? String(e);
    }
    // Remove the local .lore folder (user's files are NOT deleted).
    await lore.removeLoreDir(repo.path).catch((e: any) => set({ error: e?.message ?? String(e) }));
    const repos = get().repos.filter((r) => r.path !== repo.path);
    await get().persistRepos(repos);
    if (get().current?.path === repo.path) await get().selectRepo(null);
    set({
      busy: false,
      toast: serverMsg ? `Deleted locally · server: ${serverMsg}` : "Repository deleted",
    });
  },

  async clone(repo, dest) {
    const settings = get().settings as Settings;
    set({ progress: { active: true, title: `Cloning ${repo}…`, detail: "", frac: -1 } });
    const res = await guard(set, () =>
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
    const res = await guard(set, () => lore.createRepo(settings.serverUrl, repo, dir, settings.identity));
    if (res !== undefined) await get().addRepo(dir);
  },
});
