import { useEffect, useState } from "react";
import {
  Search,
  Folder,
  Plus,
  Settings,
  Pencil,
  Copy,
  Terminal,
  FolderOpen,
  Code,
  X,
  Trash2,
} from "lucide-react";
import { useStore } from "../store";
import * as lore from "../lib/lore";
import type { RepoEntry } from "../types";

type Menu = { x: number; y: number; repo: RepoEntry };

export function RepoMenu({
  onClose,
  onAdd,
  onSettings,
}: {
  onClose: () => void;
  onAdd: () => void;
  onSettings: () => void;
}) {
  const { repos, current, selectRepo, removeRepo, renameRepo, deleteRepo, setToast, setError } =
    useStore();
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<Menu | null>(null);
  const [editing, setEditing] = useState<{ path: string; value: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<RepoEntry | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (menu ? setMenu(null) : onClose());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, onClose]);

  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(() => setToast(`Copied ${label}`));
  const open = (action: "explorer" | "shell" | "editor", path: string) =>
    lore.openExternal(action, path).catch((e) => setError(e?.message ?? String(e)));
  function commitRename() {
    if (editing && editing.value.trim()) renameRepo(editing.path, editing.value.trim());
    setEditing(null);
  }

  const filtered = repos.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div className="menu-backdrop" onClick={onClose} />
      <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="menu-search">
          <Search />
          <input
            autoFocus
            placeholder="Filter repositories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="menu-list">
          {filtered.length === 0 && <div className="menu-empty">No repositories</div>}
          {filtered.map((r) => (
            <div
              key={r.path}
              className={`repo-item ${current?.path === r.path ? "active" : ""}`}
              onClick={() => {
                if (editing?.path !== r.path) {
                  selectRepo(r);
                  onClose();
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, repo: r });
              }}
            >
              {editing?.path === r.path ? (
                <input
                  className="repo-rename"
                  autoFocus
                  value={editing.value}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditing({ path: r.path, value: e.target.value })}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
              ) : (
                <div className="repo-name">
                  <Folder size={14} /> {r.name}
                </div>
              )}
              <div className="repo-path">{r.path}</div>
            </div>
          ))}
        </div>
        <div className="menu-foot">
          <button className="btn" onClick={() => { onClose(); onAdd(); }}>
            <Plus size={15} /> Add
          </button>
          <button className="btn-ghost" title="Settings" onClick={() => { onClose(); onSettings(); }}>
            <Settings size={16} />
          </button>
        </div>
      </div>

      {menu && (
        <>
          <div
            className="ctx-backdrop"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            className="ctx-menu"
            style={{ left: Math.min(menu.x, window.innerWidth - 240), top: Math.min(menu.y, window.innerHeight - 340) }}
          >
            <div className="ctx-path">{menu.repo.name}</div>
            <button className="ctx-item" onClick={() => { setEditing({ path: menu.repo.path, value: menu.repo.name }); setMenu(null); }}>
              <Pencil /> Create alias
            </button>
            <button className="ctx-item" onClick={() => { copy(menu.repo.name, "repo name"); setMenu(null); }}>
              <Copy /> Copy repo name
            </button>
            <button className="ctx-item" onClick={() => { copy(menu.repo.path, "repo path"); setMenu(null); }}>
              <Copy /> Copy repo path
            </button>
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => { open("shell", menu.repo.path); setMenu(null); }}>
              <Terminal /> Open in shell
            </button>
            <button className="ctx-item" onClick={() => { open("explorer", menu.repo.path); setMenu(null); }}>
              <FolderOpen /> Show in Explorer
            </button>
            <button className="ctx-item" onClick={() => { open("editor", menu.repo.path); setMenu(null); }}>
              <Code /> Open in editor
            </button>
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => { removeRepo(menu.repo.path); setMenu(null); }}>
              <X /> Remove from list
            </button>
            <button className="ctx-item ctx-danger" onClick={() => { setConfirmDel(menu.repo); setMenu(null); }}>
              <Trash2 /> Delete repository…
            </button>
          </div>
        </>
      )}

      {confirmDel && (
        <div className="overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>Delete repository</span>
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="hint">
                Delete <b>{confirmDel.name}</b>? This removes it from the app, deletes the local{" "}
                <b>.lore</b> folder, and attempts a server-side delete. Your actual project files are
                <b> not</b> deleted.
              </div>
              <div className="modal-foot">
                <button className="btn" onClick={() => setConfirmDel(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const r = confirmDel;
                    setConfirmDel(null);
                    deleteRepo(r);
                    onClose();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
