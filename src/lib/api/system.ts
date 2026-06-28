import { invoke } from "@tauri-apps/api/core";

// Per-repo background service ("warm mode").
export const startService = (cwd: string) => invoke<void>("lore_service", { cwd, action: "start" });
export const stopService = (cwd: string) => invoke<void>("lore_service", { cwd, action: "stop" });

// Filesystem watcher (emits the "repo-changed" event with changed paths).
export const startWatch = (cwd: string) => invoke<void>("start_watch", { cwd });
export const stopWatch = () => invoke<void>("stop_watch");

// Open a path in the OS file manager / a terminal / an external editor.
export const openExternal = (action: "explorer" | "shell" | "editor", path: string) =>
  invoke<void>("open_external", { action, path });
