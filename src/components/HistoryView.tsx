import { useStore } from "../store";

function when(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function HistoryView() {
  const { history, selectedRevision, selectRevision } = useStore();
  if (!history.length) return <div className="placeholder">No history yet</div>;
  return (
    <div className="list">
      {history.map((r) => (
        <div
          key={r.revision}
          className={`history-row ${selectedRevision?.revision === r.revision ? "selected" : ""}`}
          onClick={() => selectRevision(r)}
        >
          <div className="history-top">
            <span className="rev-num">#{r.revisionNumber}</span>
            <span className="history-msg">{r.message ?? "(no message)"}</span>
          </div>
          <div className="history-sub">
            <span className="hash">{r.revision.slice(0, 10)}</span>
            {r.creator ? <span>· {r.creator}</span> : null}
            {r.timestamp ? <span>· {when(r.timestamp)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
