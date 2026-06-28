import { useEffect, useState } from "react";
import { Search, GitBranch, Check } from "lucide-react";
import { useStore } from "../store";

export function BranchMenu({ onClose }: { onClose: () => void }) {
  const { branches, switchBranch, createBranch, busy } = useStore();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

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
            >
              <span className="branch-name">
                <GitBranch size={14} />
                {b.name}
              </span>
              {b.isCurrent && <Check size={15} style={{ color: "var(--accent)" }} />}
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
    </>
  );
}
