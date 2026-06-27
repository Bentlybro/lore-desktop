import { useState } from "react";
import { useStore } from "../store";

type Mode = "open" | "clone" | "create";

export function AddRepoModal({ onClose }: { onClose: () => void }) {
  const { addRepo, clone, createRepo, settings, busy } = useStore();
  const [mode, setMode] = useState<Mode>("open");
  const [path, setPath] = useState("");
  const [repo, setRepo] = useState("");
  const [dest, setDest] = useState("");

  async function submit() {
    if (mode === "open" && path.trim()) await addRepo(path.trim());
    else if (mode === "clone" && repo.trim() && dest.trim()) await clone(repo.trim(), dest.trim());
    else if (mode === "create" && repo.trim() && dest.trim()) await createRepo(repo.trim(), dest.trim());
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Add repository</span>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="modal-tabs">
            <button className={mode === "open" ? "on" : ""} onClick={() => setMode("open")}>
              Open
            </button>
            <button className={mode === "clone" ? "on" : ""} onClick={() => setMode("clone")}>
              Clone
            </button>
            <button className={mode === "create" ? "on" : ""} onClick={() => setMode("create")}>
              Create
            </button>
          </div>

          {mode === "open" && (
            <div className="field">
              <span className="label">Working tree path</span>
              <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="C:\path\to\repo" />
              <span className="hint">Point at an existing Lore working tree (a folder with a .lore directory).</span>
            </div>
          )}

          {(mode === "clone" || mode === "create") && (
            <>
              <div className="field">
                <span className="label">Repository name</span>
                <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="my-project" />
                <span className="hint">{settings?.serverUrl}/{repo || "<name>"}</span>
              </div>
              <div className="field">
                <span className="label">{mode === "clone" ? "Destination folder" : "New folder"}</span>
                <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="C:\path\to\folder" />
              </div>
              <span className="hint">Identity: {settings?.identity}</span>
            </>
          )}

          <div className="modal-foot">
            <button onClick={onClose}>Cancel</button>
            <button onClick={submit} disabled={busy}>
              {mode}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
