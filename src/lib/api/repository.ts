import { invoke } from "@tauri-apps/api/core";
import type { LoreEvent } from "../../types";
import { runLore, runLoreStream, ensureOk, dataOf } from "../core";

export const repositoryList = async (serverUrl: string): Promise<{ id: string; name: string }[]> => {
  const o = ensureOk(await runLore(["repository", "list", serverUrl]));
  return dataOf(o, "repositoryListEntry");
};

export const cloneRepo = (
  serverUrl: string,
  repo: string,
  dest: string,
  identity: string,
  onEvent: (e: LoreEvent) => void,
) =>
  runLoreStream(
    ["clone", `${serverUrl}/${repo}`, dest, "--identity", identity],
    undefined,
    onEvent,
  ).then(ensureOk);

export const createRepo = (serverUrl: string, repo: string, cwd: string, identity: string) =>
  runLore(["repository", "create", `${serverUrl}/${repo}`, "--identity", identity], cwd).then(ensureOk);

// The repo's remote URL (from .lore/config.toml), or "" if absent.
export const repoRemoteUrl = (cwd: string) => invoke<string>("repo_remote_url", { cwd });

// Delete the local .lore folder (un-Lore the working tree; user files untouched).
export const removeLoreDir = (cwd: string) => invoke<void>("remove_lore_dir", { cwd });
