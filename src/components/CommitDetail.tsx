import { useStore } from "../store";
import { DiffBody } from "./DiffView";

function badge(action: string): string {
  switch (action) {
    case "add":
      return "A";
    case "delete":
      return "D";
    case "move":
      return "R";
    default:
      return "M";
  }
}

export function CommitDetail() {
  const { selectedRevision, commitFiles, commitFileSelected, selectCommitFile, diff, diffLoading, busy } =
    useStore();

  if (!selectedRevision) {
    return <div className="diff empty">Select a commit</div>;
  }

  const r = selectedRevision;

  return (
    <div className="commit-detail">
      <div className="diff-header">
        <span className="rev-num">#{r.revisionNumber}</span> {r.message ?? "(no message)"}{" "}
        <span className="mono"> · {r.revision.slice(0, 12)}</span>
      </div>

      <div className="commit-files list">
        {commitFiles.length === 0 ? (
          <div className="placeholder">{busy ? "Loading changed files…" : "No file changes"}</div>
        ) : (
          commitFiles.map((f) => (
            <div
              key={f.path}
              className={`file-row ${commitFileSelected === f.path ? "selected" : ""}`}
              onClick={() => selectCommitFile(f.path)}
            >
              <span className="badge">{badge(f.action)}</span>
              <span className="file-path">{f.path}</span>
            </div>
          ))
        )}
      </div>

      {commitFileSelected ? (
        <div className="diff">
          <DiffBody text={diff} loading={diffLoading} />
        </div>
      ) : (
        <div className="diff empty">
          {commitFiles.length > 0 ? "Select a file" : diff || ""}
        </div>
      )}
    </div>
  );
}
