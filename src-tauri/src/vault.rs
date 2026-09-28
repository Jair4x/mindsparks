//
// Everything related to knowing where the user's vault is.
//  Write/Read the pointer to that folder, and detect if it still exists.
//

use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_fs::FsExt;

use crate::config;

// What we send to frontend.
#[derive(Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum VaultState {
    NotSet,                     // first time the app is opened
    Missing { path: String },   // there WAS a vault folder set up, but it isn't where it's supposed to
    Ready { path: String },     // all good, folder exists.
}

#[tauri::command]
pub fn get_vault_state(app: AppHandle) -> Result<VaultState, String> {
    let Some(vault_path) = config::read_config(&app)?.vault_path else {
        return Ok(VaultState::NotSet);
    };

    if PathBuf::from(&vault_path).is_dir() {
        Ok(VaultState::Ready { path: vault_path })
    } else {
        Ok(VaultState::Missing { path: vault_path })
    }
}

#[tauri::command]
pub fn set_vault_path(app: AppHandle, path: String) -> Result<(), String> {
    let vault_path = PathBuf::from(&path);

    if !vault_path.is_dir() {
        return Err("The selected path is not a valid, existing folder.".into());
    }

    let mut config = config::read_config(&app)?;
    config.vault_path = Some(path);
    config::write_config(&app, &config)?;

    grant_vault_scope(&app, &vault_path)?;
    crate::db::open_connection(&app, &vault_path)?;

    Ok(())
}

pub fn get_vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    match get_vault_state(app.clone())? {
        VaultState::Ready { path } => Ok(PathBuf::from(path)),
        VaultState::NotSet => Err("No vault has been configured yet.".into()),
        VaultState::Missing { path } => {
            Err(format!("The configured vault folder is missing: {path}"))
        },
    }
}

// Allow the access for fs to the vault's folder.
// Called both when choosing the vault for the first time
// as well as when running the app if it's set up
pub fn grant_vault_scope(app: &AppHandle, vault_path: &Path) -> Result<(), String> {
    app.fs_scope()
        .allow_directory(vault_path, true)
        .map_err(|e| format!("Couldn't grant fs access to vault: {e}"))
}