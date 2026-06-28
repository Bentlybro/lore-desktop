import { useState } from "react";
import { X, ShieldCheck, Trash2, Info } from "lucide-react";
import { useStore } from "../store";
import * as lore from "../lib/lore";
import type { RepositoryInfo } from "../lib/lore";
import { formatDate } from "../lib/format";
import type { Settings } from "../types";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, saveSettings, current, setToast, setError } = useStore();
  const [draft, setDraft] = useState<Settings>(
    settings ?? { serverUrl: "", identity: "", lorePath: "", repos: [] },
  );
  const [running, setRunning] = useState<"info" | "verify" | "gc" | null>(null);
  const [info, setInfo] = useState<RepositoryInfo | null>(null);

  const field = (key: keyof Settings, value: string) => setDraft({ ...draft, [key]: value });

  const runInfo = async () => {
    if (!current) return;
    setRunning("info");
    try {
      const i = await lore.repositoryInfo(current.path);
      setInfo(i ?? null);
      if (!i) setToast("No repository info");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRunning(null);
    }
  };
  const runVerify = async () => {
    if (!current) return;
    setRunning("verify");
    try {
      const r = await lore.verifyState(current.path);
      setToast(r.healthy ? "Integrity verified" : "Repaired staged state");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRunning(null);
    }
  };
  const runGc = async () => {
    if (!current) return;
    setRunning("gc");
    try {
      await lore.repositoryGc(current.path);
      setToast("Garbage collection complete");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Settings</span>
          <button className="btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <span className="label">Default server</span>
            <input value={draft.serverUrl} onChange={(e) => field("serverUrl", e.target.value)} />
          </div>
          <div className="field">
            <span className="label">Commit identity</span>
            <input value={draft.identity} onChange={(e) => field("identity", e.target.value)} />
          </div>
          <div className="field">
            <span className="label">lore binary path</span>
            <input
              value={draft.lorePath}
              onChange={(e) => field("lorePath", e.target.value)}
              placeholder="(auto-detect)"
            />
            <span className="hint">Leave empty to auto-resolve (~/bin/lore or PATH).</span>
          </div>

          {current && (
            <div className="field">
              <span className="label">Repository maintenance</span>
              <div className="maint-row">
                <button className="btn" disabled={!!running} onClick={runInfo}>
                  <Info size={14} /> {running === "info" ? "Loading…" : "Info"}
                </button>
                <button className="btn" disabled={!!running} onClick={runVerify}>
                  <ShieldCheck size={14} /> {running === "verify" ? "Verifying…" : "Verify"}
                </button>
                <button className="btn" disabled={!!running} onClick={runGc}>
                  <Trash2 size={14} /> {running === "gc" ? "Collecting…" : "GC"}
                </button>
              </div>
              {info && (
                <div className="maint-info mono">
                  <div>
                    {info.name} · {info.id.slice(0, 12)}
                  </div>
                  {info.defaultBranchName && <div>default branch: {info.defaultBranchName}</div>}
                  {info.creator && <div>creator: {info.creator}</div>}
                  {info.created ? <div>created: {formatDate(info.created)}</div> : null}
                  {info.remoteUrl && <div>remote: {info.remoteUrl}</div>}
                </div>
              )}
              <span className="hint">Runs on the current repository ({current.name}).</span>
            </div>
          )}

          <div className="modal-foot">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await saveSettings(draft);
                onClose();
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
