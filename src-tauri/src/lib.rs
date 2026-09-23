mod folders;
mod vault;
mod db;

use tauri::{Manager, Emitter};
use tauri_plugin_global_shortcut::ShortcutState;

const QUICK_CAPTURE_SHORTCUT: &str = "ctrl+shift+space";
const QUICK_CAPTURE_OPEN_EVENT: &str = "quick-capture:open";

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn toggle_quick_capture(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("quick-capture") else {
        return;
    };

    let is_visible = window.is_visible().unwrap_or(false);

    if is_visible {
        let _ = window.hide();
    } else {
        let _ = app.emit_to(
            "quick_capture",
            QUICK_CAPTURE_OPEN_EVENT,
            serde_json::json!({ "mode": "global" }),
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(db::DbState::default())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcut(QUICK_CAPTURE_SHORTCUT)? 
                        .with_handler(|app, _shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                toggle_quick_capture(app);
                            }
                        })
                        .build(),
                )?;
            }

            if let Ok(vault::VaultState::Ready { path }) = vault::get_vault_state(app.handle().clone()) {
                let _ = vault::grant_vault_scope(app.handle(), &std::path::PathBuf::from(path));
            }

            // Okay, so, sometimes Windows screws things up and window transparency is nonexistent.
            // By resizing the window to the same size it already was by default, it gets fixed, at least on my machine.
            #[cfg(target_os = "windows")]
            if let Some(qc) = app.get_webview_window("quick-capture") {
                if let Ok(size) = qc.inner_size() {
                    let _ = qc.set_size(size);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    if let Some(quick_capture) = window.app_handle().get_webview_window("quick-capture")
                    {
                        let _ = quick_capture.close();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            vault::get_vault_state,
            vault::set_vault_path,
            folders::resolve_flame_folder,
            db::db_select,
            db::db_execute,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
