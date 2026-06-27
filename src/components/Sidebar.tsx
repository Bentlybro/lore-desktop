import { useEffect, useState } from "react";
import { useStore } from "../store";
import * as lore from "../lib/lore";
import type { RepoEntry } from "../types";

type Menu = { x: number; y: number; repo: RepoEntry };

export function Sidebar({ onAdd, onSettings }: { onAdd: () => void; onSettings: () => void }) {
  const { repos, current, selectRepo, removeRepo, renameRepo, deleteRepo, setToast, setError } =
    useStore();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [editing, setEditing] = useState<{ path: string; value: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<RepoEntry | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(() => setToast(`Copied ${label}`));

  const open = (action: "explorer" | "shell" | "editor", path: string) =>
    lore.openExternal(action, path).catch((e) => setError(e?.message ?? String(e)));

  function commitRename() {
    if (editing && editing.value.trim()) {
      renameRepo(editing.path, editing.value.trim());
    }
    setEditing(null);
  }

  return (
    <div className="panel sidebar">
      <div className="repo-list">
        {repos.length === 0 && <div className="placeholder">No repositories</div>}
        {repos.map((r) => (
          <div
            key={r.path}
            className={`repo-item ${current?.path === r.path ? "active" : ""}`}
            onClick={() => editing?.path !== r.path && selectRepo(r)}
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
              <div className="repo-name">{r.name}</div>
            )}
            <div className="repo-path">{r.path}</div>
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <button onClick={onAdd}>+ Repo</button>
        <button onClick={onSettings} title="Settings">
          Cfg
        </button>
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
            style={{
              left: Math.min(menu.x, window.innerWidth - 240),
              top: Math.min(menu.y, window.innerHeight - 320),
            }}
          >
            <div className="ctx-path">{menu.repo.name}</div>
            <button
              className="ctx-item"
              onClick={() => {
                setEditing({ path: menu.repo.path, value: menu.repo.name });
                setMenu(null);
              }}
            >
              Create alias
            </button>
            <button className="ctx-item" onClick={() => (copy(menu.repo.name, "repo name"), setMenu(null))}>
              Copy repo name
            </button>
            <button className="ctx-item" onClick={() => (copy(menu.repo.path, "repo path"), setMenu(null))}>
              Copy repo path
            </button>
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => (open("shell", menu.repo.path), setMenu(null))}>
              Open in shell
            </button>
            <button className="ctx-item" onClick={() => (open("explorer", menu.repo.path), setMenu(null))}>
              Show in Explorer
            </button>
            <button className="ctx-item" onClick={() => (open("editor", menu.repo.path), setMenu(null))}>
              Open in external editor
            </button>
            <div className="ctx-sep" />
            <button
              className="ctx-item"
              onClick={() => {
                removeRepo(menu.repo.path);
                setMenu(null);
              }}
            >
              Remove from list
            </button>
            <button
              className="ctx-item ctx-danger"
              onClick={() => {
                setConfirmDel(menu.repo);
                setMenu(null);
              }}
            >
              Delete repository…
            </button>
          </div>
        </>
      )}

      {confirmDel && (
        <div className="overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>Delete repository</span>
              <button onClick={() => setConfirmDel(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="hint">
                Delete <b>{confirmDel.name}</b>? This removes it from the app, deletes the local{" "}
                <b>.lore</b> folder, and attempts to delete it on the server. Your actual project
                files are <b>not</b> deleted.
              </div>
              <div className="modal-foot">
                <button onClick={() => setConfirmDel(null)}>Cancel</button>
                <button
                  onClick={() => {
                    const r = confirmDel;
                    setConfirmDel(null);
                    deleteRepo(r);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
