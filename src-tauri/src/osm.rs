use serde::{Deserialize, Serialize};
use serde_json::Value;
use socket2::{Domain, Protocol, Socket, Type};
use std::{
    collections::HashMap,
    io::{Read, Write},
    net::{Ipv4Addr, SocketAddr, SocketAddrV4, TcpStream, UdpSocket},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};

pub const MULTICAST: Ipv4Addr = Ipv4Addr::new(239, 255, 42, 42);

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeasurementSource {
    pub id: String,
    pub name: String,
    pub host: String,
    pub object_name: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveMeasurement {
    pub source_id: String,
    pub message_type: String,
    pub timestamp: u128,
    pub fields: Vec<String>,
    pub frequency_bin_count: Option<usize>,
    pub time_sample_count: Option<usize>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeasurementFrame {
    pub source_id: String,
    pub timestamp: u128,
    pub frequency_hz: Vec<f64>,
    pub magnitude_db: Vec<f64>,
    pub phase_deg: Vec<f64>,
    pub coherence: Vec<f64>,
    pub delay_ms: Option<f64>,
    pub spl_db: Option<f64>,
}

pub struct OsmService {
    pub running: Arc<AtomicBool>,
    pub state: Arc<Mutex<String>>,
    pub sources: Arc<Mutex<HashMap<String, MeasurementSource>>>,
    endpoints: Arc<Mutex<HashMap<String, SourceEndpoint>>>,
}

#[derive(Clone, Debug)]
struct SourceEndpoint {
    address: SocketAddr,
    object_name: String,
}

impl Default for OsmService {
    fn default() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            state: Arc::new(Mutex::new("disconnected".into())),
            sources: Arc::new(Mutex::new(HashMap::new())),
            endpoints: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

pub fn parse_datagram(bytes: &[u8]) -> Result<Value, String> {
    let value: Value = serde_json::from_slice(bytes).map_err(|e| format!("malformed JSON: {e}"))?;
    if value.get("api").and_then(Value::as_str) != Some("Open Sound Meter") {
        return Err("not an Open Sound Meter message".into());
    }
    value
        .get("message")
        .and_then(Value::as_str)
        .ok_or_else(|| "missing message type".to_string())?;
    Ok(value)
}

pub fn frame_request(json: &[u8]) -> Vec<u8> {
    let mut framed = (json.len() as u32).to_le_bytes().to_vec();
    framed.extend_from_slice(json);
    framed
}

pub fn decode_qcompress(bytes: &[u8]) -> Result<Vec<u8>, String> {
    if bytes.len() < 4 {
        return Err("compressed response missing Qt size prefix".into());
    }
    let mut decoder = flate2::read::ZlibDecoder::new(&bytes[4..]);
    let mut output = Vec::new();
    decoder
        .read_to_end(&mut output)
        .map_err(|e| format!("invalid qCompress response: {e}"))?;
    Ok(output)
}

fn parse_source_payload(bytes: &[u8]) -> Result<(LiveMeasurement, MeasurementFrame), String> {
    let value: Value =
        serde_json::from_slice(bytes).map_err(|e| format!("malformed source data: {e}"))?;
    if value.get("message").and_then(Value::as_str) != Some("sourceData") {
        return Err("unexpected TCP response message".into());
    }
    let frequency = value
        .get("ftdata")
        .and_then(Value::as_array)
        .ok_or_else(|| "sourceData missing ftdata".to_string())?;
    if frequency
        .iter()
        .any(|row| row.as_array().is_none_or(|cells| cells.len() < 5))
    {
        return Err("sourceData contains an invalid frequency row".into());
    }
    let time = value
        .get("timeData")
        .and_then(Value::as_array)
        .ok_or_else(|| "sourceData missing timeData".to_string())?;
    if time
        .iter()
        .any(|row| row.as_array().is_none_or(|cells| cells.len() < 2))
    {
        return Err("sourceData contains an invalid time row".into());
    }

    let source_id = value["uuid"]
        .as_str()
        .filter(|id| !id.is_empty())
        .ok_or_else(|| "sourceData missing source uuid".to_string())?
        .to_string();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let mut frequency_hz = Vec::with_capacity(frequency.len());
    let mut magnitude_db = Vec::with_capacity(frequency.len());
    let mut phase_deg = Vec::with_capacity(frequency.len());
    let mut coherence = Vec::with_capacity(frequency.len());

    for row in frequency {
        let cells = row
            .as_array()
            .ok_or_else(|| "sourceData contains an invalid frequency row".to_string())?;
        let values = [0_usize, 1, 3, 4]
            .map(|index| cells[index].as_f64())
            .into_iter()
            .collect::<Option<Vec<_>>>()
            .ok_or_else(|| "sourceData frequency fields must be numbers".to_string())?;
        if values.iter().any(|value| !value.is_finite()) {
            return Err("sourceData frequency fields must be finite".into());
        }
        if frequency_hz
            .last()
            .is_some_and(|previous| values[0] <= *previous)
        {
            return Err("sourceData frequencies must be strictly ascending".into());
        }
        frequency_hz.push(values[0]);
        magnitude_db.push(values[1]);
        phase_deg.push(values[2].to_degrees());
        coherence.push(values[3]);
    }
    if frequency_hz.is_empty() {
        return Err("sourceData frequency data must not be empty".into());
    }

    let diagnostics = LiveMeasurement {
        source_id: source_id.clone(),
        message_type: "sourceData".into(),
        timestamp,
        fields: value
            .as_object()
            .map(|object| object.keys().cloned().collect())
            .unwrap_or_default(),
        frequency_bin_count: Some(frequency.len()),
        time_sample_count: Some(time.len()),
    };
    let frame = MeasurementFrame {
        source_id,
        timestamp,
        frequency_hz,
        magnitude_db,
        phase_deg,
        coherence,
        delay_ms: None,
        spl_db: None,
    };
    Ok((diagnostics, frame))
}

fn bind_udp_listener(address: Ipv4Addr, port: u16) -> std::io::Result<UdpSocket> {
    let socket = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))?;
    socket.set_reuse_address(true)?;
    socket.bind(&SocketAddrV4::new(address, port).into())?;
    Ok(socket.into())
}

#[cfg(test)]
pub fn parse_source_data(bytes: &[u8]) -> Result<LiveMeasurement, String> {
    parse_source_payload(bytes).map(|(diagnostics, _)| diagnostics)
}

#[cfg(test)]
pub fn parse_measurement_frame(bytes: &[u8]) -> Result<MeasurementFrame, String> {
    parse_source_payload(bytes).map(|(_, frame)| frame)
}

fn request_source_data(
    endpoint: &SourceEndpoint,
    source_id: &str,
) -> Result<(LiveMeasurement, MeasurementFrame), String> {
    let request = serde_json::json!({
        "name": "PA Tuning Wizard",
        "version": env!("CARGO_PKG_VERSION"),
        "message": "requestData",
        "uuid": source_id,
        "objectName": endpoint.object_name,
        "data": {}
    });
    let mut stream = TcpStream::connect_timeout(&endpoint.address, Duration::from_secs(2))
        .map_err(|e| format!("OSM TCP connection failed: {e}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(3)))
        .map_err(|e| format!("failed to set OSM read timeout: {e}"))?;
    stream
        .write_all(&frame_request(request.to_string().as_bytes()))
        .map_err(|e| format!("failed to send OSM request: {e}"))?;

    let mut header = [0_u8; 4];
    stream
        .read_exact(&mut header)
        .map_err(|e| format!("failed to read OSM response header: {e}"))?;
    let size = u32::from_le_bytes(header) as usize;
    if size == 0 || size > 64 * 1024 * 1024 {
        return Err("OSM response length is invalid".into());
    }
    let mut compressed = vec![0_u8; size];
    stream
        .read_exact(&mut compressed)
        .map_err(|e| format!("failed to read OSM response body: {e}"))?;
    parse_source_payload(&decode_qcompress(&compressed)?)
}

impl OsmService {
    pub fn connect(
        &self,
        app: AppHandle,
        direct_host: Option<String>,
        port: u16,
    ) -> Result<(), String> {
        self.disconnect();
        *self.state.lock().map_err(|_| "state lock failed")? = "connecting".into();
        let _ = app.emit("osm-state", "connecting");

        if let Some(host) = direct_host {
            let address = format!("{host}:{port}")
                .parse()
                .map_err(|_| "host must be an IPv4 address")?;
            TcpStream::connect_timeout(&address, Duration::from_secs(2))
                .map_err(|e| format!("OSM TCP connection failed: {e}"))?;
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let state = self.state.clone();
        let sources = self.sources.clone();
        let endpoints = self.endpoints.clone();

        std::thread::spawn(move || {
            let socket = match bind_udp_listener(Ipv4Addr::UNSPECIFIED, port) {
                Ok(socket) => socket,
                Err(error) => {
                    if let Ok(mut current) = state.lock() {
                        *current = "error".into();
                    }
                    let _ = app.emit("osm-state", "error");
                    let _ = app.emit("osm-error", error.to_string());
                    return;
                }
            };

            if let Err(error) = socket.join_multicast_v4(&MULTICAST, &Ipv4Addr::UNSPECIFIED) {
                let _ = app.emit("osm-error", error.to_string());
            }
            let _ = socket.set_read_timeout(Some(Duration::from_millis(500)));
            if let Ok(mut current) = state.lock() {
                *current = "connected".into();
            }
            let _ = app.emit("osm-state", "connected");

            let mut buffer = [0_u8; 65_507];
            while running.load(Ordering::SeqCst) {
                let Ok((size, peer)) = socket.recv_from(&mut buffer) else {
                    continue;
                };
                match parse_datagram(&buffer[..size]) {
                    Ok(message) => {
                        let message_type = message["message"].as_str().unwrap_or("unknown");
                        let host = message["host"]
                            .as_str()
                            .map(str::to_string)
                            .unwrap_or_else(|| peer.ip().to_string());

                        let server_port = message["port"].as_u64().unwrap_or(port as u64) as u16;
                        if message_type == "hello" {
                            if let (Some(items), Ok(mut known_sources)) =
                                (message["sources"].as_array(), sources.lock())
                            {
                                for item in items {
                                    let id = item["uuid"].as_str().unwrap_or_default().to_string();
                                    let object_name = item["objectName"]
                                        .as_str()
                                        .unwrap_or("Unknown")
                                        .to_string();
                                    known_sources.insert(
                                        id.clone(),
                                        MeasurementSource {
                                            id,
                                            name: object_name.clone(),
                                            host: host.clone(),
                                            object_name,
                                        },
                                    );
                                    if let Ok(mut known_endpoints) = endpoints.lock() {
                                        known_endpoints.insert(
                                            item["uuid"].as_str().unwrap_or_default().to_string(),
                                            SourceEndpoint {
                                                address: SocketAddr::new(peer.ip(), server_port),
                                                object_name: item["objectName"]
                                                    .as_str()
                                                    .unwrap_or("Unknown")
                                                    .to_string(),
                                            },
                                        );
                                    }
                                }
                            }
                        }

                        let fields = message
                            .as_object()
                            .map(|object| object.keys().cloned().collect())
                            .unwrap_or_default();
                        let event = LiveMeasurement {
                            source_id: message["source"].as_str().unwrap_or_default().into(),
                            message_type: message_type.into(),
                            timestamp: SystemTime::now()
                                .duration_since(UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis(),
                            fields,
                            frequency_bin_count: None,
                            time_sample_count: None,
                        };
                        let _ = app.emit("osm-live", event);

                        let requested_source = if message_type == "readyRead" {
                            message["source"].as_str().map(str::to_string)
                        } else {
                            None
                        };
                        if let Some(source_id) = requested_source {
                            let endpoint = endpoints
                                .lock()
                                .ok()
                                .and_then(|known| known.get(&source_id).cloned());
                            if let Some(endpoint) = endpoint {
                                match request_source_data(&endpoint, &source_id) {
                                    Ok((diagnostics, frame)) => {
                                        let _ = app.emit("osm-live", diagnostics);
                                        let _ = app.emit("osm-frame", frame);
                                    }
                                    Err(error) => {
                                        let _ = app.emit("osm-parser-error", error);
                                    }
                                }
                            }
                        }
                    }
                    Err(error) => {
                        let _ = app.emit("osm-parser-error", error);
                    }
                }
            }
            if let Ok(mut current) = state.lock() {
                *current = "disconnected".into();
            }
            let _ = app.emit("osm-state", "disconnected");
        });
        Ok(())
    }

    pub fn disconnect(&self) {
        self.running.store(false, Ordering::SeqCst);
        if let Ok(mut current) = self.state.lock() {
            *current = "disconnected".into();
        }
        if let Ok(mut sources) = self.sources.lock() {
            sources.clear();
        }
        if let Ok(mut endpoints) = self.endpoints.lock() {
            endpoints.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_confirmed_hello() {
        let value = parse_datagram(br#"{"api":"Open Sound Meter","message":"hello","sources":[]}"#)
            .unwrap();
        assert_eq!(value["message"], "hello");
    }

    #[test]
    fn rejects_malformed_and_foreign_messages() {
        assert!(parse_datagram(b"{").is_err());
        assert!(parse_datagram(br#"{"api":"other","message":"hello"}"#).is_err());
    }

    #[test]
    fn frames_tcp_with_little_endian_size() {
        assert_eq!(frame_request(b"{}")[..4], [2, 0, 0, 0]);
    }

    #[test]
    fn udp_listener_can_share_the_osm_port() {
        let first = bind_udp_listener(Ipv4Addr::LOCALHOST, 0).unwrap();
        let address = first.local_addr().unwrap();
        let second = bind_udp_listener(Ipv4Addr::LOCALHOST, address.port());

        assert!(
            second.is_ok(),
            "a second UDP listener should be able to share {address}: {second:?}"
        );
    }

    #[test]
    fn parses_confirmed_source_data_rows() {
        let measurement = parse_source_data(
            br#"{"message":"sourceData","uuid":"source-1","ftdata":[[100,1,-3,0.5,0.98]],"timeData":[[0,0.25]]}"#,
        )
        .unwrap();
        assert_eq!(measurement.source_id, "source-1");
        assert_eq!(measurement.frequency_bin_count, Some(1));
        assert_eq!(measurement.time_sample_count, Some(1));
        assert!(measurement.fields.contains(&"ftdata".to_string()));
    }

    #[test]
    fn rejects_source_data_with_invalid_rows() {
        assert!(parse_source_data(
            br#"{"message":"sourceData","uuid":"source-1","ftdata":[[100,1]],"timeData":[]}"#,
        )
        .is_err());
    }

    #[test]
    fn normalizes_confirmed_frequency_rows_into_a_measurement_frame() {
        let frame = parse_measurement_frame(
            br#"{"message":"sourceData","uuid":"source-1","ftdata":[[100,-6,0.5,0,0.9],[200,-3,0.7,3.141592653589793,0.98]],"timeData":[[0,0.25]]}"#,
        )
        .unwrap();

        assert_eq!(frame.source_id, "source-1");
        assert_eq!(frame.frequency_hz, vec![100.0, 200.0]);
        assert_eq!(frame.magnitude_db, vec![-6.0, -3.0]);
        assert!((frame.phase_deg[1] - 180.0).abs() < 1e-9);
        assert_eq!(frame.coherence, vec![0.9, 0.98]);
        assert_eq!(frame.delay_ms, None);
        assert_eq!(frame.spl_db, None);
    }

    #[test]
    fn rejects_measurement_frames_with_missing_or_invalid_frequency_fields() {
        assert!(parse_measurement_frame(
            br#"{"message":"sourceData","uuid":"source-1","timeData":[]}"#,
        )
        .is_err());
        assert!(parse_measurement_frame(
            br#"{"message":"sourceData","uuid":"source-1","ftdata":[[100,-6,0.5,0]],"timeData":[]}"#,
        )
        .is_err());
        assert!(parse_measurement_frame(
            br#"{"message":"sourceData","uuid":"source-1","ftdata":[[200,-6,0.5,0,0.9],[100,-3,0.7,0,0.98]],"timeData":[]}"#,
        )
        .is_err());
    }
}
