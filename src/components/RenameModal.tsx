import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "../store";

/** Move / rename a tracked file (records a rename so history is preserved). */
export function RenameModal() {
  const { renamePath, closeRename, moveFile, busy } = useStore();
  const [to, setTo] = useState("");

  useEffect(() => {
    setTo(renamePath ?? "");
  }, [renamePath]);

  if (!renamePath) return null;

  const valid = to.trim().length > 0 && to.trim() !== renamePath;
  const submit = () => {
    if (valid) moveFile(renamePath, to.trim());
    closeRename();
  };

  return (
    <div className="overlay" onClick={closeRename}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Move / rename</span>
          <button className="btn-ghost" onClick={closeRename}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <span className="label">New path (repo-relative)</span>
            <input
              autoFocus
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              spellCheck={false}
            />
            <span className="hint">Records a rename so the file's history is preserved (instead of delete + add).</span>
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={closeRename}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={busy || !valid}>
              Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
