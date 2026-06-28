import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function WindowControls() {
  return (
    <div className="win-controls">
      <button className="win-btn" title="Minimize" onClick={() => appWindow.minimize()}>
        <Minus size={15} />
      </button>
      <button className="win-btn" title="Maximize" onClick={() => appWindow.toggleMaximize()}>
        <Square size={13} />
      </button>
      <button className="win-btn close" title="Close" onClick={() => appWindow.close()}>
        <X size={16} />
      </button>
    </div>
  );
}
