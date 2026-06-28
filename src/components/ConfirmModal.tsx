import { AlertTriangle } from "lucide-react";
import { useStore } from "../store";

/** Generic confirm dialog driven by store.confirm (set via askConfirm). */
export function ConfirmModal() {
  const { confirm, closeConfirm } = useStore();
  if (!confirm) return null;
  const run = () => {
    confirm.onConfirm();
    closeConfirm();
  };
  return (
    <div className="overlay" onClick={closeConfirm}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <div className={`confirm-icon ${confirm.danger ? "danger" : ""}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="confirm-title">{confirm.title}</div>
            {confirm.message && <div className="confirm-msg">{confirm.message}</div>}
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={closeConfirm}>
              Cancel
            </button>
            <button className={`btn ${confirm.danger ? "btn-danger" : "btn-primary"}`} onClick={run} autoFocus>
              {confirm.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
