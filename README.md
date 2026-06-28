<div align="center">

# Lore Desktop

**A GitHub-Desktop-style GUI for [Lore](https://github.com/EpicGames/lore)** — Epic's
open-source, content-addressed version control system built for large binary
projects.

Polished dark "precision instrument" UI · Tauri + React · talks to your self-hosted Lore server.

</div>

---

## What it is

Lore Desktop wraps the everyday Lore workflow in a fast native window so you
don't have to memorize CLI commands. It drives the `lore` CLI under the hood —
via a Rust adapter that parses its `--json` event stream — the same way GitHub
Desktop drives `git`. The goal is a tool you can actually live in day to day, not
just a commit-and-push front end.

## Features

**Working with changes**
- Per-file **staging** with a virtualized list that stays smooth on huge repos
  (tested on a 38k-file Unity project)
- **Commit**, **push**, **sync** with real progress bars (file & byte counts)
- **Amend** the last commit (toggle in the commit box, or from the History menu)
- **Discard** changes — per file or all at once (new files are removed)
- **Move / rename** a tracked file so history is preserved (not delete + add)
- **Line-numbered diff** with old/new gutter and color-coded add/remove

**History**
- Click any commit to see its changed files and per-file diffs
- Right-click a commit: **revert**, **cherry-pick**, **amend** (tip),
  **reset branch to here**, copy SHA

**Branches**
- Searchable branch dropdown — switch, create
- Right-click a branch: **merge into current**, **protect / unprotect**,
  **archive** (delete), copy name
- **Merge conflict resolution** — a banner with *use mine / use theirs / abort*
  and per-file resolve; conflict handling is operation-aware (merge, revert and
  cherry-pick each resolve correctly)

**File locking** (great for binary assets)
- See who holds locks, **lock / release** files from the right-click menu

**Repositories**
- Create, clone, or open existing working trees
- Searchable repo dropdown; right-click for alias / copy path / open in shell /
  Explorer / external editor / remove / delete
- **Maintenance** in Settings: repository info, integrity **verify**, **gc**

**Quality of life**
- **Live change detection** — a filesystem watcher reflects edits in ~0.6s
  without a full rescan
- **Warm mode** — starts Lore's background `service` per repo to keep state hot
- **Ignore** — right-click a file → add it / its extension / its folder to
  `.loreignore`; auto-seeds from an existing `.gitignore`
- Frameless themed window with a uniform custom title bar

## Stack

- **Shell:** [Tauri v2](https://tauri.app) (Rust backend, webview UI)
- **Frontend:** React 19 + TypeScript + Vite, [Zustand](https://github.com/pmndrs/zustand),
  [lucide](https://lucide.dev) icons, Geist / Geist Mono
- **Lore integration:** shell out to the `lore` CLI with `--json`, behind a
  single generic Rust adapter (`src-tauri/src/lore.rs`)

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

Two layers (see [`tests/`](tests/)):

```bash
pnpm test        # unit suite (Vitest) — fast, no server or lore binary needed
pnpm test:watch  # unit suite in watch mode
pnpm test:cli    # live integration test against a real lore server
```

- **Unit tests** (`tests/unit/`) cover the pure logic — formatters, path/badge
  helpers, the diff parser, the CLI event-stream helpers, every API command's
  argument-building and event parsing (CLI bridge mocked), and the store's
  behaviour. ~80 tests, run in ~1s.
- **Integration test** (`tests/lore-cli.test.mjs`) drives the real `lore` binary
  the way the adapter does. Configure via `LORE_BIN`, `LORE_SERVER`,
  `LORE_IDENTITY`.

## Configuration

Open **Settings** (the gear in the top bar): the default server URL, your commit
identity (auto-injected on create/clone so you never type `--identity`), and an
optional explicit path to the `lore` binary. Settings persist to the OS config
directory.

## Project layout

```
src-tauri/src/
  lore.rs        CLI adapter (run lore --json, parse NDJSON, lean status)
  watch.rs       filesystem watcher (emits repo-changed)
  settings.rs    persisted settings
  lib.rs         app builder; settings / ignore / open-external commands
src/
  lib/
    core.ts      runLore / runLoreStream bridge + event helpers
    lore.ts      barrel re-exporting core + every api/* module
    api/*.ts     one module per command group (staging, branch, revision, …)
    format.ts · paths.ts · badges.ts · diff-parse.ts   shared helpers
  store/
    types.ts     AppStore = intersection of slice interfaces
    slices/*.ts  ui · repos · changes · branches · history
    index.ts     composes the slices into the Zustand store
  components/     RepoMenu, BranchMenu, ChangesView, HistoryView, DiffView,
                 CommitDetail, FileHistoryModal, ConfirmModal, … 
tests/
  unit/*.test.ts       Vitest unit suite
  lore-cli.test.mjs    live CLI integration test
```

## Status

Functional and used daily. Lore itself is pre-1.0, so CLI/format changes may
require updates here — the test suite is the safety net.
