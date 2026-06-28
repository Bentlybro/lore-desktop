import { invoke } from "@tauri-apps/api/core";
import type { LoreEvent } from "../../types";
import { runLore, runLoreStream, ensureOk, dataOf, firstData } from "../core";

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

// ---- Maintenance / info ----

export interface RepositoryInfo {
  name: string;
  id: string;
  description: string;
  remoteUrl: string;
  defaultBranchName: string;
  defaultBranch: string;
  creator: string;
  created: number;
}

export async function repositoryInfo(cwd: string): Promise<RepositoryInfo | undefined> {
  const o = ensureOk(await runLore(["repository", "info"], cwd));
  const d = firstData(o, "repositoryData");
  return d
    ? {
        name: d.name,
        id: d.id,
        description: d.description ?? "",
        remoteUrl: d.remoteUrl ?? "",
        defaultBranchName: d.defaultBranchName ?? "",
        defaultBranch: d.defaultBranch ?? "",
        creator: d.creator ?? "",
        created: d.created ?? 0,
      }
    : undefined;
}

/** Verify repository state integrity (heals staged state if needed). */
export async function verifyState(cwd: string): Promise<{ healthy: boolean }> {
  const o = ensureOk(await runLore(["repository", "verify", "state"], cwd));
  const d = firstData(o, "repositoryVerifyStateEnd");
  const healed = d?.healedStagedState;
  return { healthy: !healed || /^0+$/.test(String(healed)) };
}

/** Garbage-collect the repository (reclaim space from unreferenced data). */
export const repositoryGc = (cwd: string) => runLore(["repository", "gc"], cwd).then(ensureOk);
