import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  RefreshCw,
  ArrowDownToLine,
  ArrowUpToLine,
  GitBranch,
  History,
  GitCompare,
  Folder,
  ChevronDown,
  Settings,
} from "lucide-react";
import "./App.css";
import { useStore } from "./store";
import { ChangesView } from "./components/ChangesView";
import { HistoryView } from "./components/HistoryView";
import { DiffView } from "./components/DiffView";
import { CommitDetail } from "./components/CommitDetail";
import { RepoMenu } from "./components/RepoMenu";
import { BranchMenu } from "./components/BranchMenu";
import { AddRepoModal } from "./components/AddRepoModal";
import { SettingsModal } from "./components/SettingsModal";
import { ProgressOverlay, Toast } from "./components/ProgressOverlay";
import { WindowControls } from "./components/WindowControls";

function App() {
  const { init, current, tab, setTab, revision, push, sync, refresh, busy, settings, files } = useStore();
  const [repoMenu, setRepoMenu] = useState(false);
  const [branchMenu, setBranchMenu] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const unlisten = listen<string[]>("repo-changed", (e) => {
      useStore.getState().onRepoChanged(e.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const syncCls = revision?.isLocalAhead ? "ahead" : revision?.isRemoteAhead ? "behind" : "";
  const syncText = revision?.isLocalAhead ? "Ahead" : revision?.isRemoteAhead ? "Behind" : "In sync";
  const aheadN = revision?.isLocalAhead
    ? Math.max(0, (revision.revisionLocalNumber ?? 0) - (revision.revisionRemoteNumber ?? 0))
    : 0;
  const behindN = revision?.isRemoteAhead
    ? Math.max(0, (revision.revisionRemoteNumber ?? 0) - (revision.revisionLocalNumber ?? 0))
    : 0;

  return (
    <div className="app">
      <header className="topbar" data-tauri-drag-region="">
        <span className="logo" data-tauri-drag-region="">
          ◇
        </span>

        <div className="dd">
          <button
            className="dd-trigger"
            onClick={() => {
              setRepoMenu((o) => !o);
              setBranchMenu(false);
            }}
          >
            <Folder />
            <span className="dd-label">{current?.name ?? "Select a repository"}</span>
            <ChevronDown className="chev" />
          </button>
          {repoMenu && (
            <RepoMenu
              onClose={() => setRepoMenu(false)}
              onAdd={() => setAddOpen(true)}
              onSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>

        {current && (
          <div className="dd">
            <button
              className="dd-trigger"
              onClick={() => {
                const next = !branchMenu;
                setBranchMenu(next);
                setRepoMenu(false);
                if (next) useStore.getState().switchBranchRefresh();
              }}
            >
              <GitBranch />
              <span className="dd-label">{revision?.branchName ?? "—"}</span>
              <ChevronDown className="chev" />
            </button>
            {branchMenu && <BranchMenu onClose={() => setBranchMenu(false)} />}
          </div>
        )}

        {current && <span className={`sync-state ${syncCls}`}>{syncText}</span>}

        <div className="spacer" data-tauri-drag-region="" />

        <div className="actions">
          {current && (
            <>
              <button className="btn-ghost" title="Refresh" onClick={() => refresh()} disabled={busy}>
                <RefreshCw className="btn-icon-svg" />
              </button>
              <button className="btn" onClick={sync} disabled={busy}>
                <ArrowDownToLine className="btn-icon-svg" /> Sync
              </button>
              <button className="btn btn-primary" onClick={push} disabled={busy}>
                <ArrowUpToLine className="btn-icon-svg" /> Push
              </button>
            </>
          )}
          <button className="btn-ghost" title="Settings" onClick={() => setSettingsOpen(true)}>
            <Settings className="btn-icon-svg" />
          </button>
        </div>
        <WindowControls />
      </header>

      <div className="body">
        {!current ? (
          <div className="empty-state">
            <div className="mark">◇</div>
            <h2>No repository selected</h2>
            <p>Open the repository menu to pick one, or add a working tree to get started.</p>
            <button className="btn btn-primary" onClick={() => setRepoMenu(true)}>
              <Folder className="btn-icon-svg" /> Open repositories
            </button>
          </div>
        ) : (
          <>
            <div className="panel">
              <div className="tabs">
                <button className={`tab ${tab === "changes" ? "active" : ""}`} onClick={() => setTab("changes")}>
                  <GitCompare className="btn-icon-svg" /> Changes
                </button>
                <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
                  <History className="btn-icon-svg" /> History
                </button>
              </div>
              <div className="tabpanel">
                {tab === "changes" && <ChangesView />}
                {tab === "history" && <HistoryView />}
              </div>
            </div>

            <div className="panel">{tab === "history" ? <CommitDetail /> : <DiffView />}</div>
          </>
        )}
      </div>

      <footer className="statusbar">
        <span className="st">
          {busy && <span className="spinner" style={{ width: 10, height: 10 }} />}
          {busy ? "Working…" : "Ready"}
        </span>
        {current && (
          <span className="st mono">
            {files.length} change{files.length === 1 ? "" : "s"}
          </span>
        )}
        {current && aheadN > 0 && <span className="st mono">↑{aheadN}</span>}
        {current && behindN > 0 && <span className="st mono">↓{behindN}</span>}
        <span style={{ flex: 1 }} />
        <span className="st mono">{settings?.serverUrl}</span>
        <span className="st mono">{settings?.identity}</span>
      </footer>

      {addOpen && <AddRepoModal onClose={() => setAddOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <ProgressOverlay />
      <Toast />
    </div>
  );
}

export default App;
