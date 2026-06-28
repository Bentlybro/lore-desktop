import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EyeOff, Copy, CheckCheck, FileCog, RotateCcw, FileClock, TriangleAlert, Check, PenLine, Lock, LockOpen } from "lucide-react";
import { useStore } from "../store";
import type { FileRow } from "../types";
import { actionBadge } from "../lib/badges";
import { splitPath, fileDir, fileExt } from "../lib/paths";

type Menu = { x: number; y: number; file: FileRow };

export function ChangesView() {
  const {
    files,
    selectedPath,
    selectFile,
    toggleStage,
    stageAll,
    discard,
    discardAll,
    commit,
    amend,
    history,
    ignore,
    makeLoreignore,
    askConfirm,
    openFileHistory,
    openRename,
    abortConflict,
    resolveConflict,
    resolveAllConflicts,
    conflictOp,
    amendMode,
    setAmendMode,
    locks,
    lockFile,
    unlockFile,
    busy,
  } = useStore();
  const [message, setMessage] = useState("");
  const [menu, setMenu] = useState<Menu | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 31,
    overscan: 16,
  });

  const stagedCount = files.reduce((n, f) => n + (f.s ? 1 : 0), 0);
  const conflictCount = files.reduce((n, f) => n + (f.c ? 1 : 0), 0);
  const canCommit = !amendMode && stagedCount > 0 && message.trim().length > 0 && !busy;
  const canAmend = amendMode && history.length > 0 && message.trim().length > 0 && !busy;
  const canSubmit = amendMode ? canAmend : canCommit;

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  // Prefill the message when amend mode turns on (incl. from the History menu).
  useEffect(() => {
    if (amendMode && !message.trim()) setMessage(history[0]?.message ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amendMode]);

  const ext = menu ? fileExt(menu.file.p) : "";
  const dir = menu ? fileDir(menu.file.p) : "";
  const isGitignore = menu ? menu.file.p.split("/").pop() === ".gitignore" : false;

  return (
    <div className="changes">
      {conflictCount > 0 && (
        <div className="conflict-banner">
          <span className="cb-text">
            <TriangleAlert size={14} />
            {conflictCount} {conflictOp ?? "merge"} conflict{conflictCount === 1 ? "" : "s"} — resolve, then commit
          </span>
          <span className="cb-actions">
            <button className="btn btn-sm" onClick={() => resolveAllConflicts("mine")} disabled={busy}>
              Use mine
            </button>
            <button className="btn btn-sm" onClick={() => resolveAllConflicts("theirs")} disabled={busy}>
              Use theirs
            </button>
            <button
              className="btn btn-sm btn-danger"
              disabled={busy}
              onClick={() =>
                askConfirm({
                  title: "Abort?",
                  message: "Discard the in-progress operation and restore the previous state.",
                  confirmLabel: "Abort",
                  danger: true,
                  onConfirm: abortConflict,
                })
              }
            >
              Abort
            </button>
          </span>
        </div>
      )}
      <div className="changes-toolbar">
        <span>
          {files.length.toLocaleString()} change{files.length === 1 ? "" : "s"} ·{" "}
          {stagedCount.toLocaleString()} staged
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          <button
            className="btn-ghost"
            title="Discard all changes"
            onClick={() =>
              askConfirm({
                title: "Discard all changes?",
                message:
                  "Every uncommitted change in the working tree will be reverted, and new files deleted. This cannot be undone.",
                confirmLabel: "Discard all",
                danger: true,
                onConfirm: discardAll,
              })
            }
            disabled={busy || files.length === 0}
          >
            <RotateCcw size={14} />
          </button>
          <button className="btn" onClick={stageAll} disabled={busy || files.length === 0}>
            <CheckCheck size={14} /> Stage all
          </button>
        </span>
      </div>

      <div className="list file-list" ref={parentRef}>
        {files.length === 0 ? (
          <div className="placeholder">{busy ? "Scanning…" : "No changes — working tree clean"}</div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const f = files[vi.index];
              const b = actionBadge(f.a, f.c);
              const sp = splitPath(f.p);
              return (
                <div
                  key={f.p}
                  className={`file-row ${selectedPath === f.p ? "selected" : ""}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: vi.size,
                    transform: `translateY(${vi.start}px)`,
                  }}
                  onClick={() => selectFile(f.p)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, file: f });
                  }}
                >
                  <input
                    type="checkbox"
                    checked={f.s}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleStage(f)}
                    title={f.s ? "Unstage" : "Stage"}
                  />
                  <span className={`badge ${b.cls}`}>{b.label}</span>
                  <span className="file-path">
                    <span className="fp-dir">{sp.dir}</span>
                    <span className="fp-name">{sp.name}</span>
                  </span>
                  {locks[f.p] && <Lock size={12} className="row-lock" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        className="commit-box"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          if (amendMode) amend(message.trim());
          else commit(message.trim());
          setMessage("");
          setAmendMode(false);
        }}
      >
        <textarea
          placeholder={amendMode ? "Amend commit message" : "Commit message"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="commit-actions">
          <label className="amend-toggle" title={history.length === 0 ? "No commit to amend" : "Rewrite the last commit"}>
            <input
              type="checkbox"
              checked={amendMode}
              disabled={history.length === 0}
              onChange={(e) => {
                const on = e.target.checked;
                setAmendMode(on);
                if (on && !message.trim()) setMessage(history[0]?.message ?? "");
              }}
            />
            Amend last commit
          </label>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            {amendMode ? "Amend" : `Commit${stagedCount > 0 ? ` · ${stagedCount.toLocaleString()}` : ""}`}
          </button>
        </div>
      </form>

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
              top: Math.min(menu.y, window.innerHeight - 280),
            }}
          >
            <div className="ctx-path">{menu.file.p}</div>
            {menu.file.c && (
              <>
                <button className="ctx-item" onClick={() => { resolveConflict(menu.file.p, "mine"); setMenu(null); }}>
                  <Check /> Resolve using mine
                </button>
                <button className="ctx-item" onClick={() => { resolveConflict(menu.file.p, "theirs"); setMenu(null); }}>
                  <Check /> Resolve using theirs
                </button>
                <div className="ctx-sep" />
              </>
            )}
            {isGitignore && (
              <>
                <button className="ctx-item" onClick={() => { makeLoreignore(menu.file.p); setMenu(null); }}>
                  <FileCog /> Make <span className="ctx-em">.loreignore</span>
                </button>
                <div className="ctx-sep" />
              </>
            )}
            <button className="ctx-item" onClick={() => { toggleStage(menu.file); setMenu(null); }}>
              <CheckCheck /> {menu.file.s ? "Unstage" : "Stage"}
            </button>
            <button
              className="ctx-item ctx-danger"
              onClick={() => {
                const f = menu.file;
                askConfirm({
                  title: `Discard changes to ${f.p.split("/").pop()}?`,
                  message:
                    f.a === "add"
                      ? "This new file will be deleted. This cannot be undone."
                      : "Your changes to this file will be lost. This cannot be undone.",
                  confirmLabel: "Discard",
                  danger: true,
                  onConfirm: () => discard(f),
                });
                setMenu(null);
              }}
            >
              <RotateCcw /> Discard changes
            </button>
            <div className="ctx-sep" />
            {locks[menu.file.p] ? (
              <button className="ctx-item" onClick={() => { unlockFile(menu.file.p); setMenu(null); }}>
                <LockOpen /> Release lock{locks[menu.file.p].owner ? ` (${locks[menu.file.p].owner})` : ""}
              </button>
            ) : (
              <button className="ctx-item" onClick={() => { lockFile(menu.file.p); setMenu(null); }}>
                <Lock /> Lock for editing
              </button>
            )}
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => { openRename(menu.file.p); setMenu(null); }}>
              <PenLine /> Move / rename…
            </button>
            <button className="ctx-item" onClick={() => { openFileHistory(menu.file.p); setMenu(null); }}>
              <FileClock /> View history
            </button>
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => { ignore(menu.file.p, "file"); setMenu(null); }}>
              <EyeOff /> Ignore this file
            </button>
            {ext && (
              <button className="ctx-item" onClick={() => { ignore(menu.file.p, "ext"); setMenu(null); }}>
                <EyeOff /> Ignore all <span className="ctx-em">*.{ext}</span>
              </button>
            )}
            {dir && (
              <button className="ctx-item" onClick={() => { ignore(menu.file.p, "folder"); setMenu(null); }}>
                <EyeOff /> Ignore folder <span className="ctx-em">{dir}/</span>
              </button>
            )}
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => { navigator.clipboard.writeText(menu.file.p); setMenu(null); }}>
              <Copy /> Copy path
            </button>
          </div>
        </>
      )}
    </div>
  );
}
