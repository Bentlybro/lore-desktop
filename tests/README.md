# Tests

Integration tests for the `lore` CLI surface that Lore Desktop depends on. They
drive the real `lore` binary exactly the way the app's Rust adapter does
(`lore --json <args>` → newline-delimited JSON events → first `complete` wins)
and assert every feature works, plus the specific regressions fixed during
development.

## Run

From the project root:

```bash
pnpm test
# or
node --test tests/
```

## Requirements

- The `lore` CLI on your machine.
- A reachable Lore server.

## Configuration (env vars)

| Var | Default | Meaning |
| --- | --- | --- |
| `LORE_BIN` | `~/bin/lore[.exe]` | Path to the lore binary |
| `LORE_SERVER` | `lore://192.168.0.254:41337` | Server URL |
| `LORE_IDENTITY` | `github@bentlybro.com` | Commit identity |

## What's covered

- Repository create
- `status --scan` detecting new files as adds
- `stage .` + commit (revision 1)
- **Clean working tree after commit** (no phantom changes)
- **Second commit shows up in history** (the history-refresh regression)
- **Scoped scan clears a phantom dirty flag** (the watcher regression)
- File diff returns a unified patch
- Commit detail (`revision diff <parent> --target <rev>`) lists changed files
- Branch create / list / switch
- `.loreignore` excludes matching files
- Push succeeds
- **First-complete rule**: a command stays OK despite the trailing relay
  `complete` error on a no-auth server

## Caveat

Each run creates a uniquely-named repo on the server. Server-side repo deletion
is auth-gated, so test repos accumulate — point `LORE_SERVER` at a throwaway
server if that matters.
