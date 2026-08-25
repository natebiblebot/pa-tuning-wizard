import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { MeasurementProvider } from "./MeasurementProvider";
import type {
  ConnectionState,
  LiveMeasurement,
  MeasurementSource,
  StoredMeasurement,
} from "./types";
export class OsmMeasurementProvider implements MeasurementProvider {
  async connect(host?: string, port = 49007) {
    await invoke("osm_connect", { host: host?.trim() || null, port });
  }
  async disconnect() {
    await invoke("osm_disconnect");
  }
  async getConnectionState(): Promise<ConnectionState> {
    return invoke("osm_connection_state");
  }
  async getSources(): Promise<MeasurementSource[]> {
    return invoke("osm_sources");
  }
  async getStoredMeasurements(): Promise<StoredMeasurement[]> {
    return invoke("osm_stored_measurements");
  }
  async subscribeLive(callback: (data: LiveMeasurement) => void) {
    return listen<LiveMeasurement>("osm-live", ({ payload }) =>
      callback(payload),
    );
  }
}
