import { Check, TriangleAlert } from "lucide-react";
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
          {determinate && <span className="progress-pct">{pct}%</span>}
        </div>
        <div className="progress-body">
          <div className="bar">
            <div
              className={`bar-fill ${determinate ? "" : "indeterminate"}`}
              style={{ width: determinate ? `${pct}%` : "35%" }}
            />
          </div>
          <div className="progress-detail">{progress.detail || "Working…"}</div>
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
      {error ? <TriangleAlert size={16} /> : <Check size={16} />}
      <span className="toast-msg">{error ?? toast}</span>
    </div>
  );
}
