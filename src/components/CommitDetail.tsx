import { GitCommitHorizontal, FileText, RotateCcw } from "lucide-react";
import { useStore } from "../store";
import { DiffBody } from "./DiffView";
import { splitPath } from "../lib/paths";
import { actionBadge } from "../lib/badges";
import { formatDate } from "../lib/format";

export function CommitDetail() {
  const {
    selectedRevision,
    commitFiles,
    commitFileSelected,
    selectCommitFile,
    diff,
    diffLoading,
    busy,
    revertRevision,
    askConfirm,
  } = useStore();

  if (!selectedRevision) {
    return (
      <div className="diff empty">
        <GitCommitHorizontal />
        <span>Select a commit to see its changes</span>
      </div>
    );
  }

  const r = selectedRevision;

  return (
    <div className="commit-detail">
      <div className="commit-summary">
        <div className="commit-summary-row">
          <div className="commit-summary-msg">{r.message ?? "(no message)"}</div>
          <button
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              askConfirm({
                title: `Revert #${r.revisionNumber}?`,
                message: `A new commit will be created that undoes the changes in "${r.message ?? r.revision.slice(0, 10)}".`,
                confirmLabel: "Revert",
                danger: true,
                onConfirm: () => revertRevision(r),
              })
            }
          >
            <RotateCcw size={13} /> Revert
          </button>
        </div>
        <div className="commit-summary-sub">
          <span className="rev-num">#{r.revisionNumber}</span>
          {r.creator ? <span>{r.creator}</span> : null}
          {r.timestamp ? <span>{formatDate(r.timestamp)}</span> : null}
          <span className="hash mono" style={{ marginLeft: "auto" }}>
            {r.revision.slice(0, 10)}
          </span>
        </div>
      </div>

      <div className="commit-split">
        <div className="commit-files-col">
          {commitFiles.length === 0 ? (
            <div className="placeholder">{busy ? "Loading…" : "No file changes"}</div>
          ) : (
            commitFiles.map((f) => {
              const b = actionBadge(f.action);
              const sp = splitPath(f.path);
              return (
                <div
                  key={f.path}
                  className={`file-row ${commitFileSelected === f.path ? "selected" : ""}`}
                  onClick={() => selectCommitFile(f.path)}
                >
                  <span className={`badge ${b.cls}`}>{b.label}</span>
                  <span className="file-path">
                    <span className="fp-dir">{sp.dir}</span>
                    <span className="fp-name">{sp.name}</span>
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="commit-diff">
          {commitFileSelected ? (
            <>
              <div className="diff-header">
                <FileText />
                {commitFileSelected}
              </div>
              <DiffBody text={diff} loading={diffLoading} />
            </>
          ) : (
            <div className="diff empty">
              <FileText />
              <span>Select a file to view its diff</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
