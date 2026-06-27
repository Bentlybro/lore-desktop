<div align="center">

# Lore Desktop

**A GitHub-Desktop-style GUI for [Lore](https://github.com/EpicGames/lore)** — Epic's
open-source, content-addressed version control system built for large binary
projects.

Black-on-white blueprint UI · Tauri + React · talks to your self-hosted Lore server.

</div>

---

## What it is

Lore Desktop wraps the everyday Lore workflow in a fast native window so you
don't have to memorize CLI commands. It drives the `lore` CLI under the hood
(via a Rust adapter that parses its `--json` event stream), the same way GitHub
Desktop drives `git`.

## Features

- **Repositories** — create, clone, or open existing working trees; right-click
  for alias / copy path / open in shell / Explorer / external editor / remove
- **Changes** — per-file staging with a virtualized list that stays smooth on
  huge repos (tested on a 38k-file Unity project)
- **Commit / Push / Sync** — with real progress bars (file & byte counts)
- **History** — click any commit to see its changed files and per-file diffs
- **Branches** — list, create, switch
- **Live change detection** — a filesystem watcher reflects edits within ~0.6s
  without a full rescan
- **Warm mode** — starts Lore's background `service` per repo to keep state hot
- **Ignore** — right-click a file → add it / its extension / its folder to
  `.loreignore`
- **Frameless themed window** — custom title bar and controls

## Stack

- **Shell:** [Tauri v2](https://tauri.app) (Rust backend, webview UI)
- **Frontend:** React 19 + TypeScript + Vite, [Zustand](https://github.com/pmndrs/zustand)
- **Lore integration:** shell out to the `lore` CLI with `--json`, behind a
  single Rust adapter (`src-tauri/src/lore.rs`)

## Prerequisites

- The [`lore` CLI](https://github.com/EpicGames/lore) on your PATH (or set its
  path in Settings)
- A reachable Lore server
- For development: Rust, Node 18+, pnpm

## Develop

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

## Test

Integration tests drive the real `lore` CLI and assert the full feature matrix
plus regressions (see [`tests/`](tests/)):

```bash
pnpm test
```

Configure via env vars: `LORE_BIN`, `LORE_SERVER`, `LORE_IDENTITY`.

## Configuration

Defaults live in Settings (the **Cfg** button): the server URL, your commit
identity (auto-injected on create/clone so you never type `--identity`), and an
optional explicit path to the `lore` binary. Settings persist to the OS config
directory.

## Project layout

```
src-tauri/src/
  lore.rs      CLI adapter (run lore --json, parse NDJSON, lean status)
  watch.rs     filesystem watcher (emits repo-changed)
  settings.rs  persisted settings
  lib.rs       app builder, settings/ignore/open-external commands
src/
  lib/lore.ts  typed wrappers over the adapter
  store.ts     Zustand store
  components/   Sidebar, Changes, History, Branches, Diff, CommitDetail, …
tests/         node:test integration suite
```

## Status

Early but functional. Lore itself is pre-1.0, so CLI/format changes may require
updates here — the test suite is the safety net.
