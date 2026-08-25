import type {
  ConnectionState,
  LiveMeasurement,
  MeasurementSource,
  StoredMeasurement,
} from "./types";
export interface MeasurementProvider {
  connect(host?: string, port?: number): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionState(): Promise<ConnectionState>;
  getSources(): Promise<MeasurementSource[]>;
  subscribeLive(callback: (data: LiveMeasurement) => void): Promise<() => void>;
  getStoredMeasurements(): Promise<StoredMeasurement[]>;
}
