# Tests

Two layers:

1. **Unit tests** (`tests/unit/**.test.ts`, [Vitest](https://vitest.dev)) — fast,
   no server or `lore` binary needed. They cover the pure logic the app relies on:
   formatters, path/badge helpers, the unified-diff parser, the CLI
   event-stream helpers, every `api/*` command's argument-building and event
   parsing (with the CLI bridge mocked), and the store's trickier behaviour
   (discard purge rules, operation-aware conflict resolution, optimistic
   staging, amend, locks).
2. **CLI integration test** (`tests/lore-cli.test.mjs`, Node's test runner) —
   drives the real `lore` binary the way the app's Rust adapter does
   (`lore --json <args>` → newline-delimited JSON events → first `complete`
   wins) against a live server.

## Run

From the project root:

```bash
pnpm test          # unit suite (Vitest) — no server needed
pnpm test:watch    # unit suite in watch mode
pnpm test:cli      # live CLI integration test (needs lore + a server)
```

## Unit coverage (`tests/unit/`)

| File | Covers |
| --- | --- |
| `format.test.ts` | `fmtBytes`, `formatDate`, `baseName` |
| `paths.test.ts` | `splitPath`, `fileDir`, `fileExt` |
| `badges.test.ts` | `actionBadge` (A/M/D/R + conflict) |
| `diff-parse.test.ts` | unified-diff parsing + line-number gutter, `looksLikeDiff` |
| `core.test.ts` | `ensureOk` / `LoreError`, `dataOf`, `firstData` |
| `progress.test.ts` | commit/push progress fraction (lagging-dimension) mapping |
| `guard.test.ts` | busy/error wrapping around async actions |
| `api.test.ts` | arg-building + parsing for staging, reset, revision (amend/revert/cherry-pick/restore), branch (incl. merge/archive/protect/reset + list dedupe), history + file history, diff, lock, repository (list/create/clone/info/verify/gc), commit/push/sync |
| `store.test.ts` | discard purge rules, conflict-op dispatch (merge/revert/cherry-pick resolve + abort), optimistic staging, amend, locks |

The unit tests mock the `lore` CLI bridge (`src/lib/core`) / barrel
(`src/lib/lore`), so they assert the **exact CLI commands** the app issues and
how it parses the responses — without touching the filesystem, network, or the
`lore` binary.

## CLI integration test (`pnpm test:cli`)

Requirements: the `lore` CLI and a reachable Lore server.

| Var | Default | Meaning |
| --- | --- | --- |
| `LORE_BIN` | `~/bin/lore[.exe]` | Path to the lore binary |
| `LORE_SERVER` | `lore://192.168.0.254:41337` | Server URL |
| `LORE_IDENTITY` | `github@bentlybro.com` | Commit identity |

Covers: repository create; `status --scan` detecting adds; `stage .` + commit;
clean working tree after commit; second commit appears in history; scoped scan
clears a phantom dirty flag; file diff; commit-detail file list; branch
create/list/switch; `.loreignore` exclusion; push; and the first-complete rule
(stays OK despite the trailing relay `complete` error on a no-auth server).

**Caveat:** each integration run creates a uniquely-named repo on the server.
Server-side deletion is auth-gated, so test repos accumulate — point
`LORE_SERVER` at a throwaway server if that matters.
