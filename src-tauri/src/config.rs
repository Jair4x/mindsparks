//
// The app-level config file.
//  Everything that has to be known BEFORE a vault exists (where the vault is, language of the app),
//  so it can't live inside the vault itself.
//

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const CONFIG_FILE_NAME: &str = "vault-config.json";

#[derive(Serialize, Deserialize, Default)]
pub struct AppConfigFile {
    pub vault_path: Option<String>,
    pub locale: Option<String>,
}

fn config_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Couldn't resolve app config directory: {e}"))?;

    fs::create_dir_all(&dir)
        .map_err(|e| format!("Couldn't create config directory: {e}"))?;

    Ok(dir.join(CONFIG_FILE_NAME))
}

pub fn read_config(app: &AppHandle) -> Result<AppConfigFile, String> {
    let config_path = config_file_path(app)?;
    
    if !config_path.exists() {
        return Ok(AppConfigFile::default());
    }

    let raw = fs::read_to_string(&config_path)
        .map_err(|e| format!("Couldn't read app config: {e}"))?;

    serde_json::from_str(&raw)
        .map_err(|e| format!("App config file is corrupted: {e}"))
}

pub fn write_config(app: &AppHandle, config: &AppConfigFile) -> Result<(), String> {
    let config_path = config_file_path(app)?;

    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Couldn't serialize app config: {e}"))?;

    fs::write(&config_path, json)
        .map_err(|e| format!("Couldn't write app config: {e}"))
}

#[tauri::command]
pub fn get_locale(app: AppHandle) -> Result<Option<String>, String> {
    Ok(read_config(&app)?.locale)
}

#[tauri::command]
pub fn set_locale(app: AppHandle, locale: String) -> Result<(), String> {
    let mut config = read_config(&app)?;
    config.locale = Some(locale);

    write_config(&app, &config)
}
