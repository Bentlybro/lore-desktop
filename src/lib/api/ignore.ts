import { invoke } from "@tauri-apps/api/core";

// Append a pattern to .loreignore.
export const ignoreAdd = (cwd: string, pattern: string) =>
  invoke<void>("ignore_add", { cwd, pattern });

// Seed .loreignore from an existing .gitignore (if present and no .loreignore).
// Returns true if it created one.
export const seedLoreignore = (cwd: string) => invoke<boolean>("seed_loreignore", { cwd });

// Create a .loreignore from a specific .gitignore (by repo-relative path).
// Returns false if a .loreignore already exists alongside it.
export const makeLoreignore = (cwd: string, gitignore: string) =>
  invoke<boolean>("make_loreignore", { cwd, gitignore });
