import {
  validateMeasurementFrame,
  type MeasurementFrame,
} from "../models/measurement";
import type { MeasurementSource } from "../osm/types";
import type { MeasurementFixture } from "./schema";

export class FixtureRecorder {
  private active = false;
  private frames: MeasurementFrame[] = [];
  private sources: MeasurementSource[] = [];
  private recordedAt = 0;

  start(sources: MeasurementSource[], recordedAt = Date.now()) {
    this.active = true;
    this.frames = [];
    this.sources = [...sources];
    this.recordedAt = recordedAt;
  }

  capture(frame: MeasurementFrame) {
    if (this.active) this.frames.push(frame);
  }

  stop(): MeasurementFixture {
    if (!this.active) throw new Error("fixture recording has not started");
    this.active = false;
    return {
      version: 1,
      recordedAt: this.recordedAt,
      sources: [...this.sources],
      frames: [...this.frames],
    };
  }
}

export function serializeFixture(fixture: MeasurementFixture): string {
  return JSON.stringify(fixture);
}

export function parseFixture(json: string): MeasurementFixture {
  const value: unknown = JSON.parse(json);
  if (!value || typeof value !== "object") {
    throw new Error("fixture must be a JSON object");
  }
  const candidate = value as Partial<MeasurementFixture> & {
    version?: unknown;
  };
  if (candidate.version !== 1) {
    throw new Error(
      `unsupported fixture version: ${String(candidate.version)}`,
    );
  }
  if (!Number.isFinite(candidate.recordedAt)) {
    throw new Error("fixture recordedAt must be a finite number");
  }
  if (!Array.isArray(candidate.sources) || !Array.isArray(candidate.frames)) {
    throw new Error("fixture sources and frames must be arrays");
  }
  for (const frame of candidate.frames) {
    if (
      !frame ||
      typeof frame !== "object" ||
      !Array.isArray((frame as MeasurementFrame).frequencyHz) ||
      !Array.isArray((frame as MeasurementFrame).magnitudeDb) ||
      !Array.isArray((frame as MeasurementFrame).phaseDeg) ||
      !Array.isArray((frame as MeasurementFrame).coherence) ||
      validateMeasurementFrame(frame as MeasurementFrame).length > 0
    ) {
      throw new Error("fixture contains an invalid measurement frame");
    }
  }
  return candidate as MeasurementFixture;
}

export function replayFixture(
  fixture: MeasurementFixture,
  ingestFrame: (frame: MeasurementFrame) => void,
) {
  fixture.frames.forEach(ingestFrame);
}
