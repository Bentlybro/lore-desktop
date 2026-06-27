import { useStore } from "../store";

export function Sidebar({ onAdd, onSettings }: { onAdd: () => void; onSettings: () => void }) {
  const { repos, current, selectRepo } = useStore();

  return (
    <div className="panel sidebar">
      <div className="repo-list">
        {repos.length === 0 && <div className="placeholder">No repositories</div>}
        {repos.map((r) => (
          <div
            key={r.path}
            className={`repo-item ${current?.path === r.path ? "active" : ""}`}
            onClick={() => selectRepo(r)}
          >
            <div className="repo-name">{r.name}</div>
            <div className="repo-path">{r.path}</div>
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <button onClick={onAdd}>+ Repo</button>
        <button onClick={onSettings} title="Settings">
          Cfg
        </button>
      </div>
    </div>
  );
}
