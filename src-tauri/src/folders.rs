//
// Resolves the canonic routes of Spaces and Flames inside the vault, creating them if
//  it's the first time they're requested. Not called anywhere yet, but MarkdownTool will be the first
//  consumer of this.
//
// Folder convention:
//  [vault]/space.{slug}-{shortened-id}/flame.{slug}-{shortened-id}/[Tool]/
//
// For the sake of convenience, the folder name becomes fixed the moment it gets created. If the Space
//  or Flame is renamed afterwards in the app, the folder IS NOT renamed, it'll be searched under the
//  "-{shortened-id}" suffix, not the slug.
//

use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::vault;

const SLUG_MAX_LEN: usize = 40;

// Converts the visible name into a slug
// Using a Vector of Chars instead of indexing the String by bytes
//  because truncating a &str by byte index can explode in the middle of
//  a multi-byte character (like ñ, tildes, etcetera).
fn slugify(input: &str, max_len: usize) -> String {
    let mut chars: Vec<char> = Vec::new();
    let mut last_was_dash = true; // prevents a dash in the beginning of the slug

    for ch in input.to_lowercase().chars() {
        if ch.is_alphanumeric() {
            chars.push(ch);
            last_was_dash = false;
        } else if !last_was_dash {
            chars.push('-');
            last_was_dash = true;
        }
    }

    while chars.last() == Some(&'-') {
        chars.pop();
    }

    if chars.is_empty() {
        return "untitled".to_string();
    }

    if chars.len() <= max_len {
        return chars.into_iter().collect();
    }

    chars.truncate(max_len);

    if let Some(pos) = chars.iter().rposition(|&c| c == '-') {
        if pos > 0 {
            chars.truncate(pos);
        }
    }

    chars.into_iter().collect()
}

// First 8 characters of the UUID.
fn short_id(id: &str) -> String {
    id.chars().take(8).collect()
}

// Searches inside "parent" a folder that starts with "prefix"
//  (i.e. "space." or "flame.") and finishes with "-{short_id}".
// If found, returns it, else creates a new one using the current name slug.
fn resolve_prefixed_folder(
    parent: &Path,
    prefix: &str,
    name: &str,
    id: &str,
) -> Result<PathBuf, String> {
    fs::create_dir_all(parent)
        .map_err(|e| format!("Could not create {}: {e}", parent.display()))?;

    let suffix = format!("-{}", short_id(id));

    let existing = fs::read_dir(parent)
        .map_err(|e| format!("Could not read {}: {e}", parent.display()))?
        .filter_map(|entry| entry.ok())
        .find(|entry| {
            let file_name = entry.file_name();
            let name_str = file_name.to_string_lossy();

            entry.path().is_dir()
                && name_str.starts_with(prefix)
                && name_str.ends_with(&suffix)
        });

    if let Some(entry) = existing {
        return Ok(entry.path());
    }

    let slug = slugify(name, SLUG_MAX_LEN);
    let folder_path = parent.join(format!("{prefix}{slug}{suffix}"));

    fs::create_dir_all(&folder_path)
        .map_err(|e| format!("Could not create {}: {e}", folder_path.display()))?;

    Ok(folder_path)
}

fn resolve_space_folder(app: &AppHandle, space_id: &str, space_name: &str) -> Result<PathBuf, String> {
    let vault_path = vault::get_vault_path(app)?;
    resolve_prefixed_folder(&vault_path, "space.", space_name, space_id)
}

#[tauri::command]
pub fn resolve_flame_folder(
    app: AppHandle,
    space_id: String,
    space_name: String,
    flame_id: String,
    flame_name: String,
) -> Result<String, String> {
    let space_folder = resolve_space_folder(&app, &space_id, &space_name)?;
    let flame_folder = resolve_prefixed_folder(&space_folder, "flame.", &flame_name, &flame_id)?;

    Ok(flame_folder.to_string_lossy().to_string())
}