use crate::crypto::{default_kdf_descriptor, decrypt_data, derive_key, encrypt_data, new_salt};
use crate::error::{CommandError, CommandResult, VaultError};
use crate::generator::{self, PassphraseOptions, PasswordOptions};
use crate::model::{EntryInput, EntrySummary, PasswordStrength, SessionSnapshot, VaultEntry, VaultSettings};
use crate::state::{AppState, VaultSession};
use chrono::Utc;
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;
use zeroize::Zeroize;

fn command<T>(result: crate::error::Result<T>) -> CommandResult<T> {
    result.map_err(CommandError::from)
}

fn validate_master_password(password: &str) -> crate::error::Result<()> {
    let length = password.chars().count();
    if !(12..=1024).contains(&length) {
        return Err(VaultError::Validation("master password must contain 12 to 1024 characters".into()));
    }
    Ok(())
}

fn snapshot(session: &VaultSession) -> SessionSnapshot {
    let mut entries: Vec<EntrySummary> = session.data.entries.iter().map(EntrySummary::from).collect();
    entries.sort_by(|a, b| b.favorite.cmp(&a.favorite).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    SessionSnapshot { entries, settings: session.data.settings.clone() }
}

fn persist(state: &AppState, session: &VaultSession) -> crate::error::Result<()> {
    let envelope = encrypt_data(&session.data, &session.key, session.kdf.clone())?;
    state.storage.write(&envelope)
}

#[tauri::command]
pub fn vault_exists(state: State<'_, AppState>) -> bool {
    state.storage.exists()
}

#[tauri::command]
pub fn create_vault(state: State<'_, AppState>, mut master_password: String) -> CommandResult<SessionSnapshot> {
    let result = (|| {
        if state.storage.exists() { return Err(VaultError::AlreadyExists); }
        validate_master_password(&master_password)?;
        let salt = new_salt();
        let kdf = default_kdf_descriptor(&salt);
        let key = derive_key(&master_password, &kdf)?;
        let session = VaultSession { data: crate::model::VaultData::new(), key, kdf };
        persist(&state, &session)?;
        let response = snapshot(&session);
        *state.session.lock().map_err(|_| VaultError::Storage("session lock poisoned".into()))? = Some(session);
        Ok(response)
    })();
    master_password.zeroize();
    command(result)
}

#[tauri::command]
pub fn unlock_vault(state: State<'_, AppState>, mut master_password: String) -> CommandResult<SessionSnapshot> {
    let result = (|| {
        let envelope = state.storage.read()?;
        let kdf = envelope.kdf.clone();
        let (data, key) = decrypt_data(&envelope, &master_password)?;
        let session = VaultSession { data, key, kdf };
        let response = snapshot(&session);
        *state.session.lock().map_err(|_| VaultError::Storage("session lock poisoned".into()))? = Some(session);
        Ok(response)
    })();
    master_password.zeroize();
    command(result)
}

#[tauri::command]
pub fn lock_vault(state: State<'_, AppState>) -> CommandResult<()> {
    let mut guard = state.session.lock().map_err(|_| CommandError::from(VaultError::Storage("session lock poisoned".into())))?;
    *guard = None;
    Ok(())
}

#[tauri::command]
pub fn session_snapshot(state: State<'_, AppState>) -> CommandResult<SessionSnapshot> {
    let guard = state.session.lock().map_err(|_| CommandError::from(VaultError::Storage("session lock poisoned".into())))?;
    guard.as_ref().map(snapshot).ok_or_else(|| CommandError::from(VaultError::Locked))
}

#[tauri::command]
pub fn get_entry(state: State<'_, AppState>, id: Uuid) -> CommandResult<VaultEntry> {
    let guard = state.session.lock().map_err(|_| CommandError::from(VaultError::Storage("session lock poisoned".into())))?;
    let session = guard.as_ref().ok_or_else(|| CommandError::from(VaultError::Locked))?;
    session.data.entries.iter().find(|entry| entry.id == id).cloned().ok_or_else(|| CommandError::from(VaultError::Validation("entry was not found".into())))
}

#[tauri::command]
pub fn upsert_entry(state: State<'_, AppState>, input: EntryInput) -> CommandResult<SessionSnapshot> {
    command((|| {
        let input = input.validate_and_normalize()?;
        let mut guard = state.session.lock().map_err(|_| VaultError::Storage("session lock poisoned".into()))?;
        let session = guard.as_mut().ok_or(VaultError::Locked)?;
        let now = Utc::now();
        match input.id.and_then(|id| session.data.entries.iter().position(|entry| entry.id == id)) {
            Some(index) => {
                let created_at = session.data.entries[index].created_at;
                session.data.entries[index] = VaultEntry {
                    id: session.data.entries[index].id,
                    kind: input.kind,
                    name: input.name,
                    username: input.username,
                    url: input.url,
                    secret: input.secret,
                    notes: input.notes,
                    fields: input.fields,
                    tags: input.tags,
                    favorite: input.favorite,
                    created_at,
                    updated_at: now,
                };
            }
            None => session.data.entries.push(VaultEntry {
                id: input.id.unwrap_or_else(Uuid::new_v4),
                kind: input.kind,
                name: input.name,
                username: input.username,
                url: input.url,
                secret: input.secret,
                notes: input.notes,
                fields: input.fields,
                tags: input.tags,
                favorite: input.favorite,
                created_at: now,
                updated_at: now,
            }),
        }
        session.data.updated_at = now;
        persist(&state, session)?;
        Ok(snapshot(session))
    })())
}

#[tauri::command]
pub fn delete_entry(state: State<'_, AppState>, id: Uuid) -> CommandResult<SessionSnapshot> {
    command((|| {
        let mut guard = state.session.lock().map_err(|_| VaultError::Storage("session lock poisoned".into()))?;
        let session = guard.as_mut().ok_or(VaultError::Locked)?;
        let before = session.data.entries.len();
        session.data.entries.retain(|entry| entry.id != id);
        if before == session.data.entries.len() { return Err(VaultError::Validation("entry was not found".into())); }
        session.data.updated_at = Utc::now();
        persist(&state, session)?;
        Ok(snapshot(session))
    })())
}

#[tauri::command]
pub fn update_settings(state: State<'_, AppState>, settings: VaultSettings) -> CommandResult<SessionSnapshot> {
    command((|| {
        settings.validate()?;
        let mut guard = state.session.lock().map_err(|_| VaultError::Storage("session lock poisoned".into()))?;
        let session = guard.as_mut().ok_or(VaultError::Locked)?;
        session.data.settings = settings;
        session.data.updated_at = Utc::now();
        persist(&state, session)?;
        Ok(snapshot(session))
    })())
}

#[tauri::command]
pub fn generate_password(options: PasswordOptions) -> CommandResult<String> {
    command(generator::generate_password(options))
}

#[tauri::command]
pub fn generate_passphrase(options: PassphraseOptions) -> CommandResult<String> {
    command(generator::generate_passphrase(options))
}

#[tauri::command]
pub fn analyze_password(mut secret: String) -> PasswordStrength {
    let analysis = generator::analyze_password(&secret);
    secret.zeroize();
    analysis
}

#[tauri::command]
pub fn export_vault(state: State<'_, AppState>, destination: String) -> CommandResult<()> {
    command((|| {
        let _guard = state.session.lock().map_err(|_| VaultError::Storage("session lock poisoned".into()))?;
        if _guard.is_none() { return Err(VaultError::Locked); }
        let path = PathBuf::from(destination);
        if path.extension().and_then(|value| value.to_str()) != Some("vaultora") {
            return Err(VaultError::Validation("export filename must use the .vaultora extension".into()));
        }
        state.storage.export_to(&path)
    })())
}

#[tauri::command]
pub fn import_vault(state: State<'_, AppState>, source: String, mut master_password: String) -> CommandResult<SessionSnapshot> {
    let result = (|| {
        let envelope = state.storage.import_from(&PathBuf::from(source))?;
        let kdf = envelope.kdf.clone();
        let (data, key) = decrypt_data(&envelope, &master_password)?;
        state.storage.write(&envelope)?;
        let session = VaultSession { data, key, kdf };
        let response = snapshot(&session);
        *state.session.lock().map_err(|_| VaultError::Storage("session lock poisoned".into()))? = Some(session);
        Ok(response)
    })();
    master_password.zeroize();
    command(result)
}

#[tauri::command]
pub fn change_master_password(state: State<'_, AppState>, mut current_password: String, mut new_password: String) -> CommandResult<()> {
    let result = (|| {
        validate_master_password(&new_password)?;
        let existing = state.storage.read()?;
        let (data, _) = decrypt_data(&existing, &current_password)?;
        let salt = new_salt();
        let kdf = default_kdf_descriptor(&salt);
        let key = derive_key(&new_password, &kdf)?;
        let replacement = VaultSession { data, key, kdf };
        persist(&state, &replacement)?;
        *state.session.lock().map_err(|_| VaultError::Storage("session lock poisoned".into()))? = Some(replacement);
        Ok(())
    })();
    current_password.zeroize();
    new_password.zeroize();
    command(result)
}
