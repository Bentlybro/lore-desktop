import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function WindowControls() {
  return (
    <div className="win-controls">
      <button className="win-btn" title="Minimize" onClick={() => appWindow.minimize()}>
        <svg viewBox="0 0 11 11" width="11" height="11">
          <line x1="1.5" y1="6" x2="9.5" y2="6" />
        </svg>
      </button>
      <button className="win-btn" title="Maximize" onClick={() => appWindow.toggleMaximize()}>
        <svg viewBox="0 0 11 11" width="11" height="11">
          <rect x="1.5" y="1.5" width="8" height="8" />
        </svg>
      </button>
      <button className="win-btn close" title="Close" onClick={() => appWindow.close()}>
        <svg viewBox="0 0 11 11" width="11" height="11">
          <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" />
          <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
        </svg>
      </button>
    </div>
  );
}
