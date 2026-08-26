export type ConnectionState =
  "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
export const DEFAULT_OSM_PORT = 49007;
export const OSM_MULTICAST_ADDRESS = "239.255.42.42";
export interface MeasurementSource {
  id: string;
  name: string;
  host: string;
  objectName: string;
}
export interface ProtocolDiagnostics {
  sourceId: string;
  messageType: string;
  timestamp: number;
  fields: string[];
  frequencyBinCount?: number;
  timeSampleCount?: number;
}
export type LiveMeasurement = ProtocolDiagnostics;
export type StoredMeasurement = MeasurementSource;
