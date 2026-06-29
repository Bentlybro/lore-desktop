import type { ChangesSlice, StoreSet, StoreGet } from "../types";
import * as lore from "../../lib/lore";
import { guard } from "../guard";
import { progressFromEvent } from "../progress";

export const createChangesSlice = (set: StoreSet, get: StoreGet): ChangesSlice => ({
  revision: undefined,
  files: [],
  selectedPath: null,
  diff: "",
  diffLoading: false,
  conflictOp: null,
  amendMode: false,
  locks: {},

  setAmendMode(b) {
    set({ amendMode: b });
  },

  async loadLocks() {
    const { current } = get();
    if (!current) return;
    const ep = get().epoch;
    try {
      const list = await lore.lockQuery(current.path);
      if (get().epoch !== ep) return; // repo switched mid-load
      const map: Record<string, import("../../lib/api/lock").LockEntry> = {};
      for (const l of list) map[l.path] = l;
      set({ locks: map });
    } catch {
      // Locks require the server; ignore when it's unavailable.
    }
  },

  async lockFile(path) {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.lockAcquire(current.path, [path]));
    await get().loadLocks();
    set({ toast: `Locked ${path.split("/").pop()}` });
  },

  async unlockFile(path) {
    const { current } = get();
    if (!current) return;
    await guard(set, () => lore.lockRelease(current.path, [path]));
    await get().loadLocks();
    set({ toast: `Unlocked ${path.split("/").pop()}` });
  },

  async refresh(scan = true) {
    const { current } = get();
    if (!current) return;
    const ep = get().epoch;
    set({ busy: true });
    try {
      const s = await lore.status(current.path, scan);
      if (get().epoch !== ep) return; // repo switched mid-load — drop stale result
      set({ revision: s.revision ?? undefined, files: s.files });
      const sel = get().selectedPath;
      if (sel && s.files.some((f) => f.p === sel)) await get().selectFile(sel);
    } catch (e: any) {
      if (get().epoch === ep) set({ error: e?.message ?? String(e) });
    } finally {
      if (get().epoch === ep) set({ busy: false });
    }
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
    const ep = get().epoch;
    set({ selectedPath: path, diffLoading: true, diff: "" });
    try {
      const patch = await lore.fileDiff(current.path, path);
      if (get().epoch !== ep || get().selectedPath !== path) return; // superseded
      set({ diff: patch || "(no textual diff — file may be new or binary)", diffLoading: false });
    } catch (e: any) {
      if (get().epoch !== ep || get().selectedPath !== path) return;
      set({ diff: `(diff unavailable: ${e?.message ?? e})`, diffLoading: false });
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
    let target = ""; // specific path/dir to drop from staging; "" => full rebuild
    if (kind === "file") {
      pattern = "/" + path;
      target = path;
    } else if (kind === "ext") {
      const base = path.split("/").pop() ?? "";
      const dot = base.lastIndexOf(".");
      if (dot > 0) pattern = "*" + base.slice(dot); // "*.ext"
    } else if (kind === "folder") {
      const slash = path.lastIndexOf("/");
      if (slash >= 0) {
        pattern = "/" + path.slice(0, slash) + "/";
        target = path.slice(0, slash);
      }
    }
    if (!pattern) return;
    await guard(set, async () => {
      await lore.ignoreAdd(current.path, pattern);
      // Drop the now-ignored path(s) from the staged set + clear stale dirty
      // flags, so the commit won't still try to read them.
      if (target) {
        await lore.unstage(current.path, [target]);
        await lore.scanPaths(current.path, [target]);
      } else {
        await lore.reconcileStaging(current.path); // *.ext — rebuild staging
      }
    });
    await get().refresh(true);
    set({ toast: `Ignored ${pattern}` });
  },

  async makeLoreignore(gitignorePath) {
    const { current } = get();
    if (!current) return;
    const created = await guard(set, async () => {
      const c = await lore.makeLoreignore(current.path, gitignorePath);
      // Rebuild staging so all the newly-ignored junk drops out of the commit.
      if (c) await lore.reconcileStaging(current.path);
      return c;
    });
    if (created !== undefined) {
      set({ toast: created ? "Created .loreignore from .gitignore" : ".loreignore already exists" });
      await get().refresh(true);
    }
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

  async discard(file) {
    const { current } = get();
    if (!current) return;
    // New (untracked) files must be purged to discard them; tracked files are
    // restored to their committed state.
    await guard(set, () => lore.reset(current.path, [file.p], { purge: file.a === "add" }));
    if (get().selectedPath === file.p) set({ selectedPath: null, diff: "" });
    await get().refresh(true);
    set({ toast: `Discarded ${file.p.split("/").pop()}` });
  },

  async discardAll() {
    const { current, files } = get();
    if (!current || files.length === 0) return;
    await guard(set, () => lore.reset(current.path, ["."], { purge: true }));
    set({ selectedPath: null, diff: "" });
    await get().refresh(true);
    set({ toast: "Discarded all changes" });
  },

  async moveFile(from, to) {
    const { current } = get();
    if (!current || !to.trim() || to.trim() === from) return;
    const dest = to.trim();
    // `lore stage move` only records a rename — it doesn't move the file. Move
    // it on disk first, then record it so history is preserved.
    await guard(set, async () => {
      await lore.movePath(current.path, from, dest);
      await lore.stageMove(current.path, from, dest);
    });
    if (get().selectedPath === from) set({ selectedPath: null, diff: "" });
    await get().refresh(true);
    set({ toast: `Moved to ${dest.split("/").pop()}` });
  },

  async commit(message) {
    const { current } = get();
    if (!current) return;
    set({
      progress: { active: true, title: "Committing…", detail: "Fragmenting & hashing…", frac: -1 },
    });
    const ok = await guard(set, () =>
      lore.commit(current.path, message, (e) => {
        const p = progressFromEvent(e);
        if (p) set((st) => ({ progress: { ...st.progress, ...p } }));
      }),
    );
    set((st) => ({ progress: { ...st.progress, active: false } }));
    if (ok !== undefined) set({ toast: "Committed", conflictOp: null });
    await get().refresh(false);
    await get().loadHistory();
  },

  async amend(message) {
    const { current } = get();
    if (!current) return;
    set({ progress: { active: true, title: "Amending…", detail: "Rewriting last commit…", frac: -1 } });
    const ok = await guard(set, () => lore.amend(current.path, message));
    set((st) => ({ progress: { ...st.progress, active: false } }));
    if (ok !== undefined) set({ toast: "Amended last commit", amendMode: false });
    await get().refresh(false);
    await get().loadHistory();
  },

  async push() {
    const { current } = get();
    if (!current) return;
    set({ progress: { active: true, title: "Pushing…", detail: "", frac: -1 } });
    const ok = await guard(set, () =>
      lore.push(current.path, (e) => {
        const p = progressFromEvent(e);
        if (p) set((st) => ({ progress: { ...st.progress, ...p } }));
      }),
    );
    set((st) => ({ progress: { ...st.progress, active: false } }));
    if (ok !== undefined) set({ toast: "Push complete" });
    await get().refresh(false);
  },

  async sync() {
    const { current } = get();
    if (!current) return;
    set({ progress: { active: true, title: "Syncing…", detail: "", frac: -1 } });
    const ok = await guard(set, () =>
      lore.sync(current.path, (e) => {
        const p = progressFromEvent(e);
        if (p) set((st) => ({ progress: { ...st.progress, ...p } }));
      }),
    );
    set((st) => ({ progress: { ...st.progress, active: false } }));
    if (ok !== undefined) set({ toast: "Sync complete" });
    await get().refresh(false);
    await get().loadHistory();
  },
});
