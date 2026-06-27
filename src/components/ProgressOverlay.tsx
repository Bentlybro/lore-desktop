import { useStore } from "../store";

export function ProgressOverlay() {
  const { progress } = useStore();
  if (!progress.active) return null;
  const determinate = progress.frac >= 0;
  const pct = determinate ? Math.round(progress.frac * 100) : 0;

  return (
    <div className="overlay">
      <div className="progress-box">
        <div className="progress-title">
          <span className="spinner" /> {progress.title}
          {determinate ? <span className="progress-pct">{pct}%</span> : null}
        </div>
        <div className="progress-body">
          <div className="bar">
            <div
              className={`bar-fill ${determinate ? "" : "indeterminate"}`}
              style={{ width: determinate ? `${pct}%` : "100%" }}
            />
          </div>
          <div className="progress-detail">{progress.detail || "working…"}</div>
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  const { toast, error, setToast, setError } = useStore();
  if (!toast && !error) return null;
  return (
    <div
      className={`toast ${error ? "toast-error" : ""}`}
      onClick={() => (error ? setError(null) : setToast(null))}
    >
      {error ?? toast}
      <span className="toast-x">×</span>
    </div>
  );
}
