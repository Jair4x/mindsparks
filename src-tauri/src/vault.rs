//
// Everything related to knowing where the user's vault is.
//  Write/Read the pointer to that folder, and detect if it still exists.
//

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const CONFIG_FILE_NAME: &str = "vault-config.json";

// JSON File format in storage.
// Only has the path to the vault for now, I'll add more stuff later on.
#[derive(Serialize, Deserialize)]
struct VaultConfigFile {
    vault_path: String,
}

// What we send to frontend.
#[derive(Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum VaultState {
    NotSet,                     // first time the app is opened
    Missing { path: String },   // there WAS a vault folder set up, but it isn't where it's supposed to
    Ready { path: String },     // all good, folder exists.
}

fn config_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Could not resolve app config directory: {e}"))?;

    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create config directory: {e}"))?;

    Ok(dir.join(CONFIG_FILE_NAME))
}

#[tauri::command]
pub fn get_vault_state(app: AppHandle) -> Result<VaultState, String> {
    let config_path = config_file_path(&app)?;

    if !config_path.exists() {
        return Ok(VaultState::NotSet);
    }

    let raw = fs::read_to_string(&config_path)
        .map_err(|e| format!("Could not read vault config: {e}"))?;

    let parsed: VaultConfigFile = serde_json::from_str(&raw)
        .map_err(|e| format!("Vault config file is corrupted: {e}"))?;

    let vault_path = PathBuf::from(&parsed.vault_path);

    if vault_path.is_dir() {
        Ok(VaultState::Ready { path: parsed.vault_path })
    } else {
        Ok(VaultState::Missing { path: parsed.vault_path })
    }
}

#[tauri::command]
pub fn set_vault_path(app: AppHandle, path: String) -> Result<(), String> {
    let vault_path = PathBuf::from(&path);

    if !vault_path.is_dir() {
        return Err("The selected path is not a valid, existing folder.".into());
    }

    let config_path = config_file_path(&app)?;

    let contents = VaultConfigFile { vault_path: path };
    let json = serde_json::to_string_pretty(&contents)
        .map_err(|e| format!("Could not serialize vault config: {e}"))?;

    fs::write(&config_path, json)
        .map_err(|e| format!("Could not write vault config: {e}"))?;

    Ok(())
}