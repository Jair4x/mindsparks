mod folders;
mod vault;

use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

const QUICK_CAPTURE_SHORTCUT: &str = "ctrl+shift+space";

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
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(([QUICK_CAPTURE_SHORTCUT]))?
                        .with_handler(|app, _shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                toggle_quick_capture(app);
                            }
                        })
                        .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            vault::get_vault_state,
            vault::set_vault_path,
            folders::resolve_flame_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
