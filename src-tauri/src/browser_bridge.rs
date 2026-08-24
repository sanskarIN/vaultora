use crate::browser_protocol::{
    handle_browser_request, BrowserRequest, BrowserResponse, BROWSER_PROTOCOL_VERSION,
    MAX_NATIVE_MESSAGE_BYTES, MAX_NATIVE_RESPONSE_BYTES,
};
use crate::error::{Result, VaultError};
use crate::state::VaultSession;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread::{self, JoinHandle};
use std::time::Duration;

pub const BRIDGE_METADATA_FILE: &str = "browser-bridge.json";
const MAX_TRANSPORT_FRAME_BYTES: usize = MAX_NATIVE_MESSAGE_BYTES + 4096;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BrowserBridgeMetadata {
    pub version: u32,
    pub port: u16,
    pub token: String,
}

#[derive(Debug, Deserialize)]
struct BridgeFrame {
    token: String,
    request: BrowserRequest,
}

pub struct BrowserBridge {
    shutdown: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
    metadata_path: PathBuf,
}

impl BrowserBridge {
    pub fn start(app_data_dir: PathBuf, session: Arc<Mutex<Option<VaultSession>>>) -> Result<Self> {
        fs::create_dir_all(&app_data_dir)?;
        let listener = TcpListener::bind(("127.0.0.1", 0))?;
        listener.set_nonblocking(true)?;
        let port = listener.local_addr()?.port();
        let token = generate_token();
        let metadata_path = app_data_dir.join(BRIDGE_METADATA_FILE);
        write_metadata(
            &metadata_path,
            &BrowserBridgeMetadata {
                version: BROWSER_PROTOCOL_VERSION,
                port,
                token: token.clone(),
            },
        )?;

        let shutdown = Arc::new(AtomicBool::new(false));
        let thread_shutdown = Arc::clone(&shutdown);
        let thread = thread::Builder::new()
            .name("vaultora-browser-bridge".into())
            .spawn(move || {
                while !thread_shutdown.load(Ordering::Relaxed) {
                    match listener.accept() {
                        Ok((stream, _)) => {
                            let _ = handle_connection(stream, &token, &session);
                        }
                        Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                            thread::sleep(Duration::from_millis(25));
                        }
                        Err(_) => thread::sleep(Duration::from_millis(50)),
                    }
                }
            })
            .map_err(|error| VaultError::Storage(error.to_string()))?;

        Ok(Self {
            shutdown,
            thread: Some(thread),
            metadata_path,
        })
    }
}

impl Drop for BrowserBridge {
    fn drop(&mut self) {
        self.shutdown.store(true, Ordering::Relaxed);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
        let _ = fs::remove_file(&self.metadata_path);
    }
}

fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn write_metadata(path: &Path, metadata: &BrowserBridgeMetadata) -> Result<()> {
    let bytes = serde_json::to_vec(metadata)?;
    let temp = path.with_extension("json.tmp");
    {
        let mut file = fs::File::create(&temp)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
    }
    restrict_permissions(&temp)?;
    fs::rename(&temp, path)?;
    restrict_permissions(path)?;
    Ok(())
}

fn handle_connection(
    mut stream: TcpStream,
    expected_token: &str,
    session: &Arc<Mutex<Option<VaultSession>>>,
) -> Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(2)))?;
    stream.set_write_timeout(Some(Duration::from_secs(2)))?;

    let mut bytes = Vec::new();
    {
        let mut limited = (&mut stream).take((MAX_TRANSPORT_FRAME_BYTES + 1) as u64);
        limited.read_to_end(&mut bytes)?;
    }
    if bytes.len() > MAX_TRANSPORT_FRAME_BYTES {
        return Err(VaultError::Validation("browser bridge request is too large".into()));
    }

    let frame: BridgeFrame = serde_json::from_slice(&bytes)?;
    let request_id = frame.request.request_id.clone();
    let response = if !constant_time_eq(frame.token.as_bytes(), expected_token.as_bytes()) {
        BrowserResponse::Error {
            version: BROWSER_PROTOCOL_VERSION,
            request_id,
            code: "unauthorized".into(),
            message: "Browser bridge authentication failed.".into(),
        }
    } else {
        match session.lock() {
            Ok(guard) => handle_browser_request(frame.request, guard.as_ref()),
            Err(_) => BrowserResponse::Error {
                version: BROWSER_PROTOCOL_VERSION,
                request_id,
                code: "internal".into(),
                message: "Vault session state is unavailable.".into(),
            },
        }
    };

    let response_bytes = serde_json::to_vec(&response)?;
    if response_bytes.len() > MAX_NATIVE_RESPONSE_BYTES {
        return Err(VaultError::Validation("browser bridge response is too large".into()));
    }
    stream.write_all(&response_bytes)?;
    stream.flush()?;
    let _ = stream.shutdown(Shutdown::Write);
    Ok(())
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    let mut difference = 0u8;
    for (a, b) in left.iter().zip(right) {
        difference |= a ^ b;
    }
    difference == 0
}

#[cfg(unix)]
fn restrict_permissions(path: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    Ok(())
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) -> Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_comparison_rejects_wrong_values() {
        assert!(constant_time_eq(b"same-token", b"same-token"));
        assert!(!constant_time_eq(b"same-token", b"other-token"));
        assert!(!constant_time_eq(b"short", b"longer"));
    }

    #[test]
    fn metadata_round_trips() {
        let metadata = BrowserBridgeMetadata {
            version: BROWSER_PROTOCOL_VERSION,
            port: 41873,
            token: "synthetic-token".into(),
        };
        let bytes = serde_json::to_vec(&metadata).unwrap();
        let parsed: BrowserBridgeMetadata = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(parsed, metadata);
    }
}
