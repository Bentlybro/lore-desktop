import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { useStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { ChangesView } from "./components/ChangesView";
import { HistoryView } from "./components/HistoryView";
import { BranchesView } from "./components/BranchesView";
import { DiffView } from "./components/DiffView";
import { CommitDetail } from "./components/CommitDetail";
import { AddRepoModal } from "./components/AddRepoModal";
import { SettingsModal } from "./components/SettingsModal";
import { ProgressOverlay, Toast } from "./components/ProgressOverlay";
import { WindowControls } from "./components/WindowControls";

function App() {
  const {
    init,
    current,
    tab,
    setTab,
    revision,
    push,
    sync,
    refresh,
    busy,
    settings,
  } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  // Live change detection: the Rust watcher emits "repo-changed" with the
  // changed paths; the store marks them dirty and refreshes cheaply.
  useEffect(() => {
    const unlisten = listen<string[]>("repo-changed", (e) => {
      useStore.getState().onRepoChanged(e.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const ahead = revision?.isLocalAhead ? "AHEAD" : revision?.isRemoteAhead ? "BEHIND" : "IN SYNC";

  return (
    <div className="app iso-bg">
      <header className="topbar" data-tauri-drag-region="">
        <div className="wordmark" data-tauri-drag-region="">
          LORE<span className="v">DESKTOP</span>
        </div>
        {current && (
          <div className="repo-meta" data-tauri-drag-region="">
            <span>{current.name}</span>
            <span className="sep">/</span>
            <span className="branch">{revision?.branchName ?? "—"}</span>
            <span className="ahead">{ahead}</span>
          </div>
        )}
        <div className="spacer" data-tauri-drag-region="" />
        <div className="actions">
          {current && (
            <>
              <button onClick={() => refresh()} disabled={busy}>
                Refresh
              </button>
              <button onClick={sync} disabled={busy}>
                Sync ↓
              </button>
              <button onClick={push} disabled={busy}>
                Push ↑
              </button>
            </>
          )}
        </div>
        <WindowControls />
      </header>

      <div className="body">
        <Sidebar onAdd={() => setAddOpen(true)} onSettings={() => setSettingsOpen(true)} />

        {!current ? (
          <div className="empty-state iso-bg">
            <div className="mark">◇</div>
            <p>Select or add a repository</p>
            <button onClick={() => setAddOpen(true)}>+ Add repository</button>
          </div>
        ) : (
          <>
            <div className="panel">
              <div className="tabs">
                <button className={`tab ${tab === "changes" ? "active" : ""}`} onClick={() => setTab("changes")}>
                  Changes
                </button>
                <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
                  History
                </button>
                <button className={`tab ${tab === "branches" ? "active" : ""}`} onClick={() => setTab("branches")}>
                  Branches
                </button>
              </div>
              <div className="tabpanel">
                {tab === "changes" && <ChangesView />}
                {tab === "history" && <HistoryView />}
                {tab === "branches" && <BranchesView />}
              </div>
            </div>

            <div className="panel">
              {tab === "history" ? <CommitDetail /> : <DiffView />}
            </div>
          </>
        )}
      </div>

      <footer className="statusbar">
        {busy && <span className="spinner" style={{ width: 8, height: 8 }} />}
        <span>{busy ? "WORKING" : "READY"}</span>
        <span>· {settings?.serverUrl}</span>
        <span>· {settings?.identity}</span>
      </footer>

      {addOpen && <AddRepoModal onClose={() => setAddOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <ProgressOverlay />
      <Toast />
    </div>
  );
}

export default App;
