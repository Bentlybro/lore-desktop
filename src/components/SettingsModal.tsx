import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "../store";
import type { Settings } from "../types";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, saveSettings } = useStore();
  const [draft, setDraft] = useState<Settings>(
    settings ?? { serverUrl: "", identity: "", lorePath: "", repos: [] },
  );

  const field = (key: keyof Settings, value: string) => setDraft({ ...draft, [key]: value });

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
