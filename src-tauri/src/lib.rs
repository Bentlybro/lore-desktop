mod lore;
mod settings;
mod watch;

use settings::Settings;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub settings: Mutex<Settings>,
    pub config_path: std::path::PathBuf,
    pub watcher: Mutex<Option<watch::RepoWatcher>>,
}

#[tauri::command]
fn get_settings(state: tauri::State<AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn save_settings(state: tauri::State<AppState>, settings: Settings) -> Result<(), String> {
    settings.save(&state.config_path)?;
    *state.settings.lock().unwrap() = settings;
    Ok(())
}

/// If the repo has a `.gitignore` but no `.loreignore`, seed `.loreignore` from
/// it (same syntax). Returns true if a file was created. Never overwrites an
/// existing `.loreignore`.
#[tauri::command]
fn seed_loreignore(cwd: String) -> Result<bool, String> {
    let dir = std::path::Path::new(&cwd);
    let lore_ignore = dir.join(".loreignore");
    let git_ignore = dir.join(".gitignore");
    if lore_ignore.exists() || !git_ignore.exists() {
        return Ok(false);
    }
    let git = std::fs::read_to_string(&git_ignore).map_err(|e| e.to_string())?;
    let content = format!("# Seeded from .gitignore by Lore Desktop\n\n{git}");
    std::fs::write(&lore_ignore, content).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Append a pattern to the repo's `.loreignore` (created if missing, deduped).
#[tauri::command]
fn ignore_add(cwd: String, pattern: String) -> Result<(), String> {
    let pattern = pattern.trim().to_string();
    if pattern.is_empty() {
        return Err("empty ignore pattern".into());
    }
    let path = std::path::Path::new(&cwd).join(".loreignore");
    let existing = std::fs::read_to_string(&path).unwrap_or_default();
    if existing.lines().any(|l| l.trim() == pattern) {
        return Ok(()); // already ignored
    }
    let mut content = existing;
    if !content.is_empty() && !content.ends_with('\n') {
        content.push('\n');
    }
    content.push_str(&pattern);
    content.push('\n');
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

/// Open a path in the OS file manager / a terminal / an external editor.
/// `action`: "explorer" | "shell" | "editor".
#[tauri::command]
fn open_external(action: String, path: String) -> Result<(), String> {
    use std::process::Command;

    #[cfg(windows)]
    let mut cmd = {
        use std::os::windows::process::CommandExt;
        let mut c = match action.as_str() {
            "explorer" => {
                let mut c = Command::new("explorer");
                c.arg(&path);
                c
            }
            "shell" => {
                // New terminal window rooted at the repo.
                let mut c = Command::new("cmd");
                c.current_dir(&path).args(["/C", "start", "cmd"]);
                c
            }
            "editor" => {
                // VS Code if on PATH.
                let mut c = Command::new("cmd");
                c.args(["/C", "code", &path]);
                c
            }
            other => return Err(format!("unknown action: {other}")),
        };
        c.creation_flags(0x0800_0000); // CREATE_NO_WINDOW (the spawned terminal still shows)
        c
    };

    #[cfg(target_os = "macos")]
    let mut cmd = match action.as_str() {
        "explorer" => {
            let mut c = Command::new("open");
            c.arg(&path);
            c
        }
        "shell" => {
            let mut c = Command::new("open");
            c.args(["-a", "Terminal", &path]);
            c
        }
        "editor" => {
            let mut c = Command::new("code");
            c.arg(&path);
            c
        }
        other => return Err(format!("unknown action: {other}")),
    };

    #[cfg(target_os = "linux")]
    let mut cmd = match action.as_str() {
        "explorer" => {
            let mut c = Command::new("xdg-open");
            c.arg(&path);
            c
        }
        "shell" => {
            let mut c = Command::new("x-terminal-emulator");
            c.current_dir(&path);
            c
        }
        "editor" => {
            let mut c = Command::new("code");
            c.arg(&path);
            c
        }
        other => return Err(format!("unknown action: {other}")),
    };

    cmd.spawn().map_err(|e| format!("failed to open ({action}): {e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_config_dir()?;
            std::fs::create_dir_all(&dir).ok();
            let config_path = dir.join("settings.json");
            let settings = Settings::load(&config_path);
            app.manage(AppState {
                settings: Mutex::new(settings),
                config_path,
                watcher: Mutex::new(None),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            ignore_add,
            seed_loreignore,
            open_external,
            lore::run_lore,
            lore::run_lore_stream,
            lore::lore_status,
            lore::lore_service,
            watch::start_watch,
            watch::stop_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
