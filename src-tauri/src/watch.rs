//! Lightweight filesystem watcher for the active working tree.
//!
//! GitHub-Desktop style: a debounced native watcher reports which paths changed,
//! and the frontend marks just those dirty (`lore dirty`) + runs a fast no-scan
//! status — no full filesystem walk per edit.

use std::path::{Path, PathBuf};
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use tauri::{AppHandle, Emitter, State};

use crate::AppState;

pub type RepoWatcher = Debouncer<RecommendedWatcher>;

fn to_relative(base: &Path, p: &Path) -> Option<String> {
    p.strip_prefix(base)
        .ok()
        .map(|r| r.to_string_lossy().replace('\\', "/"))
        .filter(|s| !s.is_empty())
}

/// Start (or replace) the watcher for `cwd`. Emits `repo-changed` with a list of
/// changed paths (relative, forward-slashed) on each debounced batch.
#[tauri::command]
pub fn start_watch(app: AppHandle, state: State<'_, AppState>, cwd: String) -> Result<(), String> {
    let base = PathBuf::from(&cwd);
    let lore_dir = base.join(".lore");
    let base_cb = base.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(600),
        move |res: DebounceEventResult| {
            let Ok(events) = res else { return };
            let mut paths: Vec<String> = Vec::new();
            for e in events {
                if e.path.starts_with(&lore_dir) {
                    continue; // ignore Lore's own internal state writes
                }
                if let Some(rel) = to_relative(&base_cb, &e.path) {
                    if !paths.contains(&rel) {
                        paths.push(rel);
                    }
                }
            }
            if !paths.is_empty() {
                let _ = app.emit("repo-changed", paths);
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watcher()
        .watch(&base, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Replacing the previous debouncer drops it, which stops the old watch.
    *state.watcher.lock().unwrap() = Some(debouncer);
    Ok(())
}

#[tauri::command]
pub fn stop_watch(state: State<'_, AppState>) -> Result<(), String> {
    *state.watcher.lock().unwrap() = None;
    Ok(())
}
