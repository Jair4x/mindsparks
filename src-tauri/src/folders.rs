//
// Creates/renames/moves the real, on-disk folders for Spaces and Flames.
//
// Resolving an EXISTING folder's path is NOT this module's job anymore.
//  Check "feat(tauri): add canonical folder resolution for spaces and flames" if you want
// 
// Once created, the folder_name gets stored on the Space/Flame row itself (see
// store/spaces.ts, store/flames.ts), so reading a path back later is just a
// join() done from TS, no Rust call, no scanning. This only runs when
// the filesystem actually needs to change: creating a new folder, renaming
// one, or moving a Flame in/out of the archived subfolder.
//
// Convention:
//  [vault]/Spaces/{space-folder-name}/{flame-folder-name}/[Tool]/
//
//  Archived Flames move to .archived/ inside their Space:
//  [vault]/Spaces/{space-folder-name}/.archived/{flame-folder-name}/
//

use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use std::collections::HashSet;

use crate::vault;

const SLUG_MAX_LEN: usize = 40;
const SPACES_DIR: &str = "Spaces";
const ARCHIVED_DIR: &str = ".archived";

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

fn unique_folder_name(parent: &Path, base_slug: &str, exclude: Option<&str>) -> String {
    let taken: HashSet<String> = fs::read_dir(parent)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().is_dir())
                .map(|e| e.file_name().to_string_lossy().to_string())
                .filter(|name| Some(name.as_str()) != exclude)
                .collect()
        })
        .unwrap_or_default();

    if !taken.contains(base_slug) {
        return base_slug.to_string();
    }

    let mut n = 2;
    loop {
        let candidate = format!("{base_slug}-{n}");
        if !taken.contains(&candidate) {
            return candidate;
        }
        n += 1;
    }
}

fn spaces_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(vault::get_vault_path(app)?.join(SPACES_DIR))
}

// Your OS (Windows, in my case) sometimes might return "access denied" if an active watcher
// is reading the directory in that moment and you try to rename or do some other stuff to files.
// Retrying a few times with a short delay while trying to stop the watchers on the frontend
// through lib/tools/watcherRegistry.ts should probably fix it. If you find a problem, report it immediately
fn rename_with_retry(from: &Path, to: &Path) -> Result<(), String> {
    const MAX_ATTEMPTS: u32 = 5;
    const DELAY_MS: u64 = 100;

    let mut last_err = None;

    for attempt in 0..MAX_ATTEMPTS {
        match fs::rename(from, to) {
            Ok(()) => return Ok(()),
            Err(e) => {
                last_err = Some(e);
                if attempt + 1 < MAX_ATTEMPTS {
                    std::thread::sleep(std::time::Duration::from_millis(DELAY_MS));
                }
            }
        }
    }

    Err(format!(
        "Couldn't rename {} to {}, even after {MAX_ATTEMPTS} attempts: {}",
        from.display(),
        to.display(),
        last_err.unwrap()
    ))
}

#[tauri::command]
pub fn create_space_folder(app: AppHandle, space_name: String) -> Result<String, String> {
    let root = spaces_root(&app)?;
    fs::create_dir_all(&root).map_err(|e| format!("Couldn't create {}: {e}", root.display()))?;

    let slug = slugify(&space_name, SLUG_MAX_LEN);
    let folder_name  = unique_folder_name(&root, &slug, None);

    fs::create_dir_all(root.join(&folder_name))
        .map_err(|e| format!("Couldn't create Space folder: {e}"))?;

    Ok(folder_name)
}

#[tauri::command]
pub fn rename_space_folder(
    app: AppHandle,
    space_folder_name: String,
    new_name: String,
) -> Result<String, String> {
    let root = spaces_root(&app)?;
    let slug = slugify(&new_name, SLUG_MAX_LEN);
    let new_folder_name = unique_folder_name(&root, &slug, Some(&space_folder_name));

    if new_folder_name != space_folder_name {
        rename_with_retry(&root.join(&space_folder_name), &root.join(&new_folder_name))
            .map_err(|e| format!("Couldn't rename Space folder: {e}"))?;
    }

    Ok(new_folder_name)
}

#[tauri::command]
pub fn create_flame_folder(
    app: AppHandle,
    space_folder_name: String,
    flame_name: String,
) -> Result<String, String> {
    let parent = spaces_root(&app)?.join(&space_folder_name);
    fs::create_dir_all(&parent).map_err(|e| format!("Couldn't create {}: {e}", parent.display()))?;

    let slug = slugify(&flame_name, SLUG_MAX_LEN);
    let folder_name = unique_folder_name(&parent, &slug, None);

    fs::create_dir_all(parent.join(&folder_name))
        .map_err(|e| format!("Couldn't create Flame folder: {e}"))?;

    Ok(folder_name)
}

#[tauri::command]
pub fn rename_flame_folder(
    app: AppHandle,
    space_folder_name: String,
    flame_folder_name: String,
    new_name: String,
    is_archived: bool,
) -> Result<String, String> {
    let parent = if is_archived {
        spaces_root(&app)?.join(&space_folder_name).join(ARCHIVED_DIR)
    } else {
        spaces_root(&app)?.join(&space_folder_name)
    };

    let slug = slugify(&new_name, SLUG_MAX_LEN);
    let new_folder_name = unique_folder_name(&parent, &slug, Some(&flame_folder_name));

    if new_folder_name != flame_folder_name {
        rename_with_retry(&parent.join(&flame_folder_name), &parent.join(&new_folder_name))
            .map_err(|e| format!("Couldn't rename Flame folder: {e}"))?;
    }

    Ok(new_folder_name)
}

#[tauri::command]
pub fn set_flame_archived_folder(
    app: AppHandle,
    space_folder_name: String,
    flame_folder_name: String,
    flame_name: String,
    archived: bool,
) -> Result<String, String> {
    let space_folder = spaces_root(&app)?.join(&space_folder_name);

    let (from_parent, to_parent) = if archived {
        (space_folder.clone(), space_folder.join(ARCHIVED_DIR))
    } else {
        (space_folder.join(ARCHIVED_DIR), space_folder.clone())
    };

    let preferred_name = if archived {
        flame_folder_name.clone()
    } else {
        slugify(&flame_name, SLUG_MAX_LEN)
    };

    fs::create_dir_all(&to_parent)
        .map_err(|e| format!("Couldn't create {}: {e}", to_parent.display()))?;

    let destination_name = unique_folder_name(&to_parent, &preferred_name, None);

    rename_with_retry(
        &from_parent.join(&flame_folder_name), 
        &to_parent.join(&destination_name)
    )?;
    
    Ok(destination_name)
}
