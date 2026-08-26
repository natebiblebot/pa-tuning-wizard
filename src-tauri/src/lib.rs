mod osm;
use osm::{MeasurementSource, OsmService};
use tauri::State;
#[tauri::command]
fn osm_connect(
    app: tauri::AppHandle,
    service: State<OsmService>,
    host: Option<String>,
    port: u16,
) -> Result<(), String> {
    service.connect(app, host, port)
}
#[tauri::command]
fn osm_disconnect(service: State<OsmService>) {
    service.disconnect()
}
#[tauri::command]
fn osm_connection_state(service: State<OsmService>) -> String {
    service
        .state
        .lock()
        .map(|s| s.clone())
        .unwrap_or_else(|_| "error".into())
}
#[tauri::command]
fn osm_sources(service: State<OsmService>) -> Vec<MeasurementSource> {
    service
        .sources
        .lock()
        .map(|s| s.values().cloned().collect())
        .unwrap_or_default()
}
#[tauri::command]
fn osm_stored_measurements() -> Vec<MeasurementSource> {
    Vec::new()
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(OsmService::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            osm_connect,
            osm_disconnect,
            osm_connection_state,
            osm_sources,
            osm_stored_measurements
        ])
        .run(tauri::generate_context!())
        .expect("error while running PA Tuning Wizard")
}
