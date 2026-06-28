import type { Branch } from "../../types";
import { runLore, ensureOk, dataOf } from "../core";

export async function branchList(cwd: string): Promise<Branch[]> {
  const o = ensureOk(await runLore(["branch", "list"], cwd));
  // Prefer local entries; dedupe by id keeping the current/local flavour.
  const entries = dataOf(o, "branchListEntry") as Branch[];
  const byId = new Map<string, Branch>();
  for (const b of entries) {
    const prev = byId.get(b.id);
    if (!prev || b.isCurrent) byId.set(b.id, b);
  }
  return [...byId.values()];
}

export const branchSwitch = (cwd: string, name: string) =>
  runLore(["branch", "switch", name], cwd).then(ensureOk);

export const branchCreate = (cwd: string, name: string) =>
  runLore(["branch", "create", name], cwd).then(ensureOk);
