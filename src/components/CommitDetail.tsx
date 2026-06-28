import { GitCommitHorizontal, FileText } from "lucide-react";
import { useStore } from "../store";
import { DiffBody } from "./DiffView";

const splitPath = (p: string) => {
  const i = p.lastIndexOf("/");
  return i >= 0 ? { dir: p.slice(0, i + 1), name: p.slice(i + 1) } : { dir: "", name: p };
};

function actionBadge(a: string): { label: string; cls: string } {
  switch (a) {
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

function when(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function CommitDetail() {
  const { selectedRevision, commitFiles, commitFileSelected, selectCommitFile, diff, diffLoading, busy } =
    useStore();

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
        <div className="commit-summary-msg">{r.message ?? "(no message)"}</div>
        <div className="commit-summary-sub">
          <span className="rev-num">#{r.revisionNumber}</span>
          {r.creator ? <span>{r.creator}</span> : null}
          {r.timestamp ? <span>{when(r.timestamp)}</span> : null}
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
