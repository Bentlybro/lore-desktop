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
