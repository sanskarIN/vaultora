pub mod browser;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub mod browser_bridge;
pub mod browser_protocol;
mod commands;
pub mod crypto;
pub mod error;
pub mod generator;
pub mod model;
pub mod native_host;
pub mod storage;
mod state;

use state::AppState;
use tauri::{Manager, Runtime};

fn build_state<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<AppState, Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    let storage = storage::VaultStorage::new(app_data_dir.clone())?;
    Ok(AppState::new(storage, app_data_dir)?)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let state = build_state(&app.handle())?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault_exists,
            commands::create_vault,
            commands::unlock_vault,
            commands::lock_vault,
            commands::session_snapshot,
            commands::get_entry,
            commands::upsert_entry,
            commands::delete_entry,
            commands::update_settings,
            commands::generate_password,
            commands::generate_passphrase,
            commands::analyze_password,
            commands::export_vault,
            commands::export_vault_base64,
            commands::import_vault,
            commands::import_vault_base64,
            commands::change_master_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Vaultora");
}
