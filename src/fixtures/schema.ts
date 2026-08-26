import type { MeasurementFrame } from "../models/measurement";
import type { MeasurementSource } from "../osm/types";

export interface MeasurementFixture {
  version: 1;
  recordedAt: number;
  sources: MeasurementSource[];
  frames: MeasurementFrame[];
}
