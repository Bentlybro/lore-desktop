import { invoke } from "@tauri-apps/api/core";
import type { Settings } from "../../types";

export const getSettings = (): Promise<Settings> => invoke<Settings>("get_settings");
export const saveSettings = (settings: Settings): Promise<void> =>
  invoke<void>("save_settings", { settings });
