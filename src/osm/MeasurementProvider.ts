import type {
  ConnectionState,
  MeasurementSource,
  ProtocolDiagnostics,
  StoredMeasurement,
} from "./types";
import type { MeasurementFrame } from "../models/measurement";
export interface MeasurementProvider {
  connect(host?: string, port?: number): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionState(): Promise<ConnectionState>;
  getSources(): Promise<MeasurementSource[]>;
  subscribeLive(callback: (data: MeasurementFrame) => void): Promise<() => void>;
  subscribeDiagnostics(
    callback: (data: ProtocolDiagnostics) => void,
  ): Promise<() => void>;
  getStoredMeasurements(): Promise<StoredMeasurement[]>;
}
