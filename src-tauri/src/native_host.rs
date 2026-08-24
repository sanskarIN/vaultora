use crate::browser_bridge::{BrowserBridgeMetadata, BRIDGE_METADATA_FILE};
use crate::browser_protocol::{
    BrowserRequest, BrowserResponse, BROWSER_PROTOCOL_VERSION, MAX_NATIVE_MESSAGE_BYTES,
    MAX_NATIVE_RESPONSE_BYTES,
};
use serde::Serialize;
use std::env;
use std::fs;
use std::io::{self, Read, Write};
use std::net::{Ipv4Addr, Shutdown, SocketAddr, SocketAddrV4, TcpStream};
use std::path::PathBuf;
use std::time::Duration;

#[derive(Serialize)]
struct BridgeFrame<'a> {
    token: &'a str,
    request: &'a BrowserRequest,
}

pub fn run() -> io::Result<()> {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut reader = stdin.lock();
    let mut writer = stdout.lock();

    while let Some(bytes) = read_native_message(&mut reader)? {
        let response = match serde_json::from_slice::<BrowserRequest>(&bytes) {
            Ok(request) => forward_or_error(request),
            Err(_) => BrowserResponse::Error {
                version: BROWSER_PROTOCOL_VERSION,
                request_id: String::new(),
                code: "invalid_json".into(),
                message: "Native message is not a valid Vaultora request.".into(),
            },
        };
        write_native_message(&mut writer, &response)?;
    }
    Ok(())
}

fn forward_or_error(request: BrowserRequest) -> BrowserResponse {
    let request_id = request.request_id.clone();
    match forward_to_desktop(&request) {
        Ok(response) => response,
        Err(_) => BrowserResponse::Error {
            version: BROWSER_PROTOCOL_VERSION,
            request_id,
            code: "bridge_offline".into(),
            message: "Vaultora desktop bridge is unavailable.".into(),
        },
    }
}

fn forward_to_desktop(request: &BrowserRequest) -> io::Result<BrowserResponse> {
    let metadata = read_bridge_metadata()?;
    if metadata.version != BROWSER_PROTOCOL_VERSION {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "browser bridge protocol mismatch",
        ));
    }

    let address = SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::LOCALHOST, metadata.port));
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(750))?;
    stream.set_read_timeout(Some(Duration::from_secs(2)))?;
    stream.set_write_timeout(Some(Duration::from_secs(2)))?;

    let frame = serde_json::to_vec(&BridgeFrame {
        token: &metadata.token,
        request,
    })
    .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if frame.len() > MAX_NATIVE_MESSAGE_BYTES + 4096 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "browser bridge frame is too large",
        ));
    }

    stream.write_all(&frame)?;
    stream.flush()?;
    stream.shutdown(Shutdown::Write)?;

    let mut response_bytes = Vec::new();
    stream
        .take((MAX_NATIVE_RESPONSE_BYTES + 1) as u64)
        .read_to_end(&mut response_bytes)?;
    if response_bytes.len() > MAX_NATIVE_RESPONSE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "browser bridge response is too large",
        ));
    }

    serde_json::from_slice(&response_bytes)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

fn read_bridge_metadata() -> io::Result<BrowserBridgeMetadata> {
    let path = app_data_dir()?.join(BRIDGE_METADATA_FILE);
    let bytes = fs::read(path)?;
    if bytes.len() > 4096 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "browser bridge metadata is too large",
        ));
    }
    serde_json::from_slice(&bytes).map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

fn app_data_dir() -> io::Result<PathBuf> {
    if let Some(value) = env::var_os("VAULTORA_APP_DATA_DIR") {
        return Ok(PathBuf::from(value));
    }

    #[cfg(target_os = "windows")]
    let base = env::var_os("APPDATA").map(PathBuf::from);

    #[cfg(target_os = "macos")]
    let base = env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| home.join("Library").join("Application Support"));

    #[cfg(all(unix, not(target_os = "macos"), not(target_os = "android"), not(target_os = "ios")))]
    let base = env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("HOME").map(PathBuf::from).map(|home| home.join(".local/share")));

    #[cfg(any(target_os = "android", target_os = "ios"))]
    let base: Option<PathBuf> = None;

    base.map(|path| path.join("in.sanskar.vaultora")).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "could not resolve Vaultora application data directory",
        )
    })
}

fn read_native_message<R: Read>(reader: &mut R) -> io::Result<Option<Vec<u8>>> {
    let mut length = [0u8; 4];
    let count = reader.read(&mut length[..1])?;
    if count == 0 {
        return Ok(None);
    }
    reader.read_exact(&mut length[1..])?;
    let length = u32::from_ne_bytes(length) as usize;
    if length == 0 || length > MAX_NATIVE_MESSAGE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "native message length is invalid",
        ));
    }
    let mut payload = vec![0u8; length];
    reader.read_exact(&mut payload)?;
    Ok(Some(payload))
}

fn write_native_message<W: Write, T: Serialize>(writer: &mut W, value: &T) -> io::Result<()> {
    let payload = serde_json::to_vec(value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if payload.len() > MAX_NATIVE_RESPONSE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "native response is too large",
        ));
    }
    let length = u32::try_from(payload.len())
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "native response is too large"))?;
    writer.write_all(&length.to_ne_bytes())?;
    writer.write_all(&payload)?;
    writer.flush()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn native_framing_round_trips_payload() {
        let payload = br#"{"version":2,"type":"get-status","request_id":"test"}"#;
        let mut input = Vec::new();
        input.extend_from_slice(&(payload.len() as u32).to_ne_bytes());
        input.extend_from_slice(payload);
        let mut cursor = Cursor::new(input);
        assert_eq!(read_native_message(&mut cursor).unwrap().unwrap(), payload);
        assert!(read_native_message(&mut cursor).unwrap().is_none());
    }

    #[test]
    fn rejects_oversized_native_frames() {
        let mut input = Cursor::new(((MAX_NATIVE_MESSAGE_BYTES as u32) + 1).to_ne_bytes());
        assert!(read_native_message(&mut input).is_err());
    }
}
