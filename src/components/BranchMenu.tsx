import { useEffect, useState } from "react";
import { Search, GitBranch, Check, GitMerge, GitCompare, Copy, Shield, ShieldOff, Archive } from "lucide-react";
import { useStore } from "../store";
import type { Branch } from "../types";

type Menu = { x: number; y: number; branch: Branch };

export function BranchMenu({ onClose }: { onClose: () => void }) {
  const {
    branches,
    switchBranch,
    createBranch,
    mergeBranch,
    archiveBranch,
    protectBranch,
    openCompare,
    askConfirm,
    setToast,
    busy,
  } = useStore();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [menu, setMenu] = useState<Menu | null>(null);
  const currentBranch = branches.find((b) => b.isCurrent);
  const currentName = currentBranch?.name ?? "current";

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") (menu ? setMenu(null) : onClose());
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [menu, onClose]);

  const filtered = branches.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div className="menu-backdrop" onClick={onClose} />
      <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="menu-search">
          <Search />
          <input
            autoFocus
            placeholder="Filter branches…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="menu-list">
          {filtered.length === 0 && <div className="menu-empty">No branches</div>}
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`branch-row ${b.isCurrent ? "current" : ""}`}
              onClick={() => {
                if (!b.isCurrent) {
                  switchBranch(b.name);
                  onClose();
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, branch: b });
              }}
            >
              <span className="branch-name">
                <GitBranch size={14} />
                {b.name}
              </span>
              {b.isCurrent ? (
                <Check size={15} style={{ color: "var(--accent)" }} />
              ) : (
                <button
                  className="branch-merge"
                  title={`Merge ${b.name} into ${currentName}`}
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    askConfirm({
                      title: `Merge "${b.name}" into "${currentName}"?`,
                      message: `Changes from ${b.name} will be merged into your current branch. If there are conflicts you'll resolve them before committing.`,
                      confirmLabel: "Merge",
                      onConfirm: () => mergeBranch(b.name),
                    });
                    onClose();
                  }}
                >
                  <GitMerge size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <form
          className="menu-foot"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              createBranch(name.trim());
              setName("");
              onClose();
            }
          }}
        >
          <input
            style={{ flex: 1 }}
            placeholder="new-branch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" style={{ flex: "none" }} disabled={busy || !name.trim()}>
            Create
          </button>
        </form>
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
              top: Math.min(menu.y, window.innerHeight - 280),
            }}
          >
            <div className="ctx-path">{menu.branch.name}</div>
            {!menu.branch.isCurrent && (
              <>
                <button className="ctx-item" onClick={() => { switchBranch(menu.branch.name); setMenu(null); onClose(); }}>
                  <GitBranch /> Switch to branch
                </button>
                <button
                  className="ctx-item"
                  onClick={() => {
                    const b = menu.branch;
                    askConfirm({
                      title: `Merge "${b.name}" into "${currentName}"?`,
                      message: `Changes from ${b.name} will be merged into your current branch.`,
                      confirmLabel: "Merge",
                      onConfirm: () => mergeBranch(b.name),
                    });
                    setMenu(null);
                    onClose();
                  }}
                >
                  <GitMerge /> Merge into {currentName}
                </button>
                {currentBranch && (
                  <button
                    className="ctx-item"
                    onClick={() => {
                      openCompare({
                        baseRev: menu.branch.latest,
                        baseLabel: menu.branch.name,
                        targetRev: currentBranch.latest,
                        targetLabel: currentBranch.name,
                      });
                      setMenu(null);
                      onClose();
                    }}
                  >
                    <GitCompare /> Compare with {currentName}
                  </button>
                )}
                <div className="ctx-sep" />
              </>
            )}
            <button className="ctx-item" onClick={() => { protectBranch(menu.branch.name, true); setMenu(null); }}>
              <Shield /> Protect
            </button>
            <button className="ctx-item" onClick={() => { protectBranch(menu.branch.name, false); setMenu(null); }}>
              <ShieldOff /> Unprotect
            </button>
            <div className="ctx-sep" />
            <button className="ctx-item" onClick={() => { navigator.clipboard.writeText(menu.branch.name).then(() => setToast("Copied branch name")); setMenu(null); }}>
              <Copy /> Copy name
            </button>
            {!menu.branch.isCurrent && (
              <button
                className="ctx-item ctx-danger"
                onClick={() => {
                  const b = menu.branch;
                  askConfirm({
                    title: `Archive "${b.name}"?`,
                    message: "The branch will be archived (Lore's equivalent of deleting a branch). Its commits remain in history.",
                    confirmLabel: "Archive",
                    danger: true,
                    onConfirm: () => archiveBranch(b.name),
                  });
                  setMenu(null);
                }}
              >
                <Archive /> Archive branch…
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
