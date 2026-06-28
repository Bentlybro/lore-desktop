import { useEffect, useState } from "react";
import { Pencil, RotateCcw, GitBranchPlus, Copy } from "lucide-react";
import { useStore } from "../store";
import { formatDate } from "../lib/format";
import type { Revision } from "../types";

type Menu = { x: number; y: number; rev: Revision };

export function HistoryView() {
  const {
    history,
    selectedRevision,
    selectRevision,
    revertRevision,
    cherryPickRevision,
    setAmendMode,
    setTab,
    askConfirm,
    setToast,
  } = useStore();
  const [menu, setMenu] = useState<Menu | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  if (!history.length) return <div className="placeholder">No history yet</div>;
  const isLatest = (r: Revision) => history[0]?.revision === r.revision;

  return (
    <>
      <div className="list">
        {history.map((r) => (
          <div
            key={r.revision}
            className={`history-row ${selectedRevision?.revision === r.revision ? "selected" : ""}`}
            onClick={() => selectRevision(r)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, rev: r });
            }}
          >
            <div className="history-top">
              <span className="rev-num">#{r.revisionNumber}</span>
              <span className="history-msg">{r.message ?? "(no message)"}</span>
            </div>
            <div className="history-sub">
              <span className="hash">{r.revision.slice(0, 10)}</span>
              {r.creator ? <span>· {r.creator}</span> : null}
              {r.timestamp ? <span>· {formatDate(r.timestamp)}</span> : null}
            </div>
          </div>
        ))}
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
              left: Math.min(menu.x, window.innerWidth - 250),
              top: Math.min(menu.y, window.innerHeight - 240),
            }}
          >
            <div className="ctx-path">
              #{menu.rev.revisionNumber} · {menu.rev.revision.slice(0, 10)}
            </div>
            {isLatest(menu.rev) && (
              <button
                className="ctx-item"
                onClick={() => {
                  setTab("changes");
                  setAmendMode(true);
                  setMenu(null);
                }}
              >
                <Pencil /> Amend commit…
              </button>
            )}
            <button
              className="ctx-item"
              onClick={() => {
                const rev = menu.rev;
                askConfirm({
                  title: `Revert #${rev.revisionNumber}?`,
                  message: `Create a new commit that undoes the changes in "${rev.message ?? rev.revision.slice(0, 10)}".`,
                  confirmLabel: "Revert",
                  danger: true,
                  onConfirm: () => revertRevision(rev),
                });
                setMenu(null);
              }}
            >
              <RotateCcw /> Revert changes in commit
            </button>
            <button
              className="ctx-item"
              onClick={() => {
                const rev = menu.rev;
                askConfirm({
                  title: `Cherry-pick #${rev.revisionNumber}?`,
                  message: `Apply the changes from "${rev.message ?? rev.revision.slice(0, 10)}" onto the current branch.`,
                  confirmLabel: "Cherry-pick",
                  onConfirm: () => cherryPickRevision(rev),
                });
                setMenu(null);
              }}
            >
              <GitBranchPlus /> Cherry-pick commit…
            </button>
            <div className="ctx-sep" />
            <button
              className="ctx-item"
              onClick={() => {
                navigator.clipboard.writeText(menu.rev.revision).then(() => setToast("Copied SHA"));
                setMenu(null);
              }}
            >
              <Copy /> Copy SHA
            </button>
          </div>
        </>
      )}
    </>
  );
}
