//! Adapter over the `lore` CLI.
//!
//! Every Lore operation runs as `lore --json <args>`, which emits newline-delimited
//! JSON events on stdout, terminated by a `complete` event carrying a structured
//! error. The FIRST `complete` is the authoritative result; anything after it
//! (e.g. a background relay that fails to authenticate on a no-auth server) is
//! benign noise we drop.

use serde::Serialize;
use serde_json::Value;
use std::process::Stdio;
use tauri::ipc::Channel;
use tauri::State;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::Command;

use crate::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoreOutcome {
    pub events: Vec<Value>,
    pub ok: bool,
    pub error: Option<String>,
    pub error_code: Option<i64>,
}

/// Resolve which `lore` binary to run.
pub fn resolve_lore_path(explicit: Option<&str>) -> String {
    if let Some(p) = explicit {
        if !p.is_empty() {
            return p.to_string();
        }
    }
    if let Some(home) = dirs::home_dir() {
        let mut p = home.join("bin");
        #[cfg(windows)]
        p.push("lore.exe");
        #[cfg(not(windows))]
        p.push("lore");
        if p.exists() {
            return p.to_string_lossy().to_string();
        }
    }
    "lore".to_string()
}

/// Spawn `lore --json <args>` and invoke `on_value` for each event up to (and
/// excluding) the first `complete`. Returns the derived (ok, error, error_code).
async fn run_with<F: FnMut(Value)>(
    lore_path: &str,
    args: &[String],
    cwd: Option<&str>,
    mut on_value: F,
) -> Result<(bool, Option<String>, Option<i64>), String> {
    let mut cmd = Command::new(lore_path);
    cmd.arg("--json");
    cmd.args(args);
    if let Some(d) = cwd {
        cmd.current_dir(d);
    }
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd.kill_on_drop(true);
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to launch lore ({lore_path}): {e}"))?;

    let stderr = child.stderr.take();
    let stderr_task = tokio::spawn(async move {
        let mut buf = String::new();
        if let Some(mut se) = stderr {
            let _ = se.read_to_string(&mut buf).await;
        }
        buf
    });

    let stdout = child.stdout.take().ok_or("lore produced no stdout")?;
    let mut lines = BufReader::new(stdout).lines();
    let mut completed = false;
    let mut ok = true;
    let mut error: Option<String> = None;
    let mut error_code: Option<i64> = None;

    while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let Ok(v) = serde_json::from_str::<Value>(line) else {
            continue;
        };

        if v.get("tagName").and_then(Value::as_str) == Some("complete") {
            if !completed {
                completed = true;
                if let Some(data) = v.get("data") {
                    let st = data.get("status").and_then(Value::as_i64).unwrap_or(0);
                    let ec = data
                        .get("error")
                        .and_then(|e| e.get("errorCode"))
                        .and_then(Value::as_i64)
                        .unwrap_or(0);
                    let msg = data
                        .get("error")
                        .and_then(|e| e.get("message"))
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    if st != 0 || ec != 0 {
                        ok = false;
                        error_code = Some(ec);
                        if !msg.is_empty() {
                            error = Some(msg.to_string());
                        }
                    }
                }
            }
            continue;
        }

        if completed {
            continue;
        }
        on_value(v);
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    let err_text = stderr_task.await.unwrap_or_default();

    if !completed {
        ok = status.success();
    }
    if !ok && error.is_none() {
        let trimmed = err_text.trim();
        error = Some(if trimmed.is_empty() {
            format!("lore exited with {status}")
        } else {
            trimmed.to_string()
        });
    }

    Ok((ok, error, error_code))
}

fn lore_path(state: &State<'_, AppState>) -> String {
    state.settings.lock().unwrap().resolved_lore_path()
}

/// Generic: run a Lore command and return the full event stream.
#[tauri::command]
pub async fn run_lore(
    state: State<'_, AppState>,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<LoreOutcome, String> {
    let path = lore_path(&state);
    let mut events: Vec<Value> = Vec::new();
    let (ok, error, error_code) =
        run_with(&path, &args, cwd.as_deref(), |v| events.push(v)).await?;
    Ok(LoreOutcome {
        events,
        ok,
        error,
        error_code,
    })
}

/// Generic streamed variant: each event is also pushed to `on_event` live.
#[tauri::command]
pub async fn run_lore_stream(
    state: State<'_, AppState>,
    args: Vec<String>,
    cwd: Option<String>,
    on_event: Channel<Value>,
) -> Result<LoreOutcome, String> {
    let path = lore_path(&state);
    let mut events: Vec<Value> = Vec::new();
    let (ok, error, error_code) = run_with(&path, &args, cwd.as_deref(), |v| {
        let _ = on_event.send(v.clone());
        events.push(v);
    })
    .await?;
    Ok(LoreOutcome {
        events,
        ok,
        error,
        error_code,
    })
}

/// Start/stop the per-repo background service ("warm mode"), which keeps the
/// repo's tree + dirty state hot so repeated scans/commits skip the cold load.
/// `service start` daemonizes and returns immediately; we don't pipe its stdout
/// (the daemon would hold the pipe open), just launch and let it detach.
#[tauri::command]
pub async fn lore_service(
    state: State<'_, AppState>,
    cwd: String,
    action: String,
) -> Result<(), String> {
    let path = lore_path(&state);
    let action = match action.as_str() {
        "start" | "stop" => action,
        _ => return Err(format!("unknown service action: {action}")),
    };
    let mut cmd = Command::new(&path);
    cmd.arg("service").arg(&action);
    cmd.current_dir(&cwd);
    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::null());
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to launch lore service ({path}): {e}"))?;
    let _ = child.wait().await; // the launcher exits fast; the daemon detaches
    Ok(())
}

// ---- Dedicated status command ----
//
// `status --scan` on a large repo emits tens of thousands of fat file events
// (28 MB for 38k files). Parsing that into generic `Value`s, shipping it over
// IPC, and re-parsing in JS is the real bottleneck. Instead we parse the stream
// once in Rust and return a lean projection (5 short fields per file).

#[derive(Debug, Serialize)]
struct LeanFile {
    p: String,  // path
    a: String,  // action: keep|add|delete|move
    s: bool,    // staged
    d: bool,    // dirty
    c: bool,    // conflict
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusPayload {
    ok: bool,
    error: Option<String>,
    revision: Option<Value>,
    files: Vec<LeanFile>,
    total: usize,
}

#[tauri::command]
pub async fn lore_status(
    state: State<'_, AppState>,
    cwd: String,
    scan: bool,
) -> Result<StatusPayload, String> {
    let path = lore_path(&state);
    let args: Vec<String> = if scan {
        vec!["status".into(), "--scan".into()]
    } else {
        vec!["status".into()]
    };

    let mut files: Vec<LeanFile> = Vec::new();
    let mut revision: Option<Value> = None;

    let (ok, error, _ec) = run_with(&path, &args, Some(&cwd), |v| {
        match v.get("tagName").and_then(Value::as_str) {
            Some("repositoryStatusFile") => {
                if let Some(dat) = v.get("data") {
                    files.push(LeanFile {
                        p: dat.get("path").and_then(Value::as_str).unwrap_or("").to_string(),
                        a: dat.get("action").and_then(Value::as_str).unwrap_or("").to_string(),
                        s: dat.get("flagStaged").and_then(Value::as_bool).unwrap_or(false),
                        d: dat.get("flagDirty").and_then(Value::as_bool).unwrap_or(false),
                        c: dat.get("flagConflict").and_then(Value::as_bool).unwrap_or(false),
                    });
                }
            }
            Some("repositoryStatusRevision") => {
                revision = v.get("data").cloned();
            }
            _ => {}
        }
    })
    .await?;

    let total = files.len();
    Ok(StatusPayload {
        ok,
        error,
        revision,
        files,
        total,
    })
}
