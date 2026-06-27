use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A local working tree the user has added or cloned.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoEntry {
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub server_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    /// Default Lore server, e.g. "lore://192.168.0.254:41337".
    pub server_url: String,
    /// Commit identity, auto-injected on create/clone.
    pub identity: String,
    /// Explicit path to the `lore` binary; empty = auto-resolve.
    pub lore_path: String,
    /// Tracked working trees shown in the sidebar.
    pub repos: Vec<RepoEntry>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            server_url: "lore://192.168.0.254:41337".into(),
            identity: "github@bentlybro.com".into(),
            lore_path: String::new(),
            repos: Vec::new(),
        }
    }
}

impl Settings {
    pub fn resolved_lore_path(&self) -> String {
        let explicit = if self.lore_path.is_empty() {
            None
        } else {
            Some(self.lore_path.as_str())
        };
        crate::lore::resolve_lore_path(explicit)
    }

    pub fn load(path: &PathBuf) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, path: &PathBuf) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(path, json).map_err(|e| e.to_string())
    }
}
