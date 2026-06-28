import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EyeOff, Copy, CheckCheck, FileCog } from "lucide-react";
import { useStore } from "../store";
import type { FileRow } from "../types";

function badge(f: FileRow): { label: string; cls: string } {
  if (f.c) return { label: "C", cls: "b-con" };
  switch (f.a) {
    case "add":
      return { label: "A", cls: "b-add" };
    case "delete":
      return { label: "D", cls: "b-del" };
    case "move":
      return { label: "R", cls: "b-ren" };
    default:
      return { label: "M", cls: "b-mod" };
  }
}

const fileExt = (p: string) => {
  const base = p.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1) : "";
};
const fileDir = (p: string) => {
  const slash = p.lastIndexOf("/");
  return slash >= 0 ? p.slice(0, slash) : "";
};
const splitPath = (p: string) => {
  const i = p.lastIndexOf("/");
  return i >= 0 ? { dir: p.slice(0, i + 1), name: p.slice(i + 1) } : { dir: "", name: p };
};

type Menu = { x: number; y: number; file: FileRow };

export function ChangesView() {
  const { files, selectedPath, selectFile, toggleStage, stageAll, commit, ignore, makeLoreignore, busy } =
    useStore();
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
  const canCommit = stagedCount > 0 && message.trim().length > 0 && !busy;

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const ext = menu ? fileExt(menu.file.p) : "";
  const dir = menu ? fileDir(menu.file.p) : "";
  const isGitignore = menu ? menu.file.p.split("/").pop() === ".gitignore" : false;

  return (
    <div className="changes">
      <div className="changes-toolbar">
        <span>
          {files.length.toLocaleString()} change{files.length === 1 ? "" : "s"} ·{" "}
          {stagedCount.toLocaleString()} staged
        </span>
        <button className="btn" onClick={stageAll} disabled={busy || files.length === 0}>
          <CheckCheck size={14} /> Stage all
        </button>
      </div>

      <div className="list file-list" ref={parentRef}>
        {files.length === 0 ? (
          <div className="placeholder">{busy ? "Scanning…" : "No changes — working tree clean"}</div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const f = files[vi.index];
              const b = badge(f);
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
          if (canCommit) {
            commit(message.trim());
            setMessage("");
          }
        }}
      >
        <textarea
          placeholder="Commit message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!canCommit}>
          Commit{stagedCount > 0 ? ` · ${stagedCount.toLocaleString()}` : ""}
        </button>
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
