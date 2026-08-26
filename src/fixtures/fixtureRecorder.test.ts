import { describe, expect, it } from "vitest";
import type { MeasurementFrame } from "../models/measurement";
import { createMeasurementStore } from "../stores/measurementStore";
import {
  FixtureRecorder,
  parseFixture,
  replayFixture,
  serializeFixture,
} from "./fixtureRecorder";

const frame = (timestamp: number, magnitudeDb: number): MeasurementFrame => ({
  sourceId: "source-1",
  timestamp,
  frequencyHz: [100],
  magnitudeDb: [magnitudeDb],
  phaseDeg: [0],
  coherence: [0.95],
});

const source = {
  id: "source-1",
  name: "Main PA",
  host: "127.0.0.1",
  objectName: "Measurement",
};

describe("FixtureRecorder", () => {
  it("records only after explicit start and stops cleanly", () => {
    const recorder = new FixtureRecorder();
    recorder.capture(frame(1, -6));

    recorder.start([source], 100);
    recorder.capture(frame(2, -5));
    recorder.capture(frame(3, -4));
    const fixture = recorder.stop();
    recorder.capture(frame(4, -3));

    expect(fixture).toEqual({
      version: 1,
      recordedAt: 100,
      sources: [source],
      frames: [frame(2, -5), frame(3, -4)],
    });
  });

  it("round-trips versioned JSON and rejects unsupported versions", () => {
    const recorder = new FixtureRecorder();
    recorder.start([source], 100);
    recorder.capture(frame(2, -5));
    const fixture = recorder.stop();

    expect(parseFixture(serializeFixture(fixture))).toEqual(fixture);
    expect(() => parseFixture('{"version":2}')).toThrow(
      "unsupported fixture version: 2",
    );
  });

  it("replays frames through the store's normal ingestion action", () => {
    const recorder = new FixtureRecorder();
    recorder.start([source], 100);
    recorder.capture(frame(2, -5));
    recorder.capture(frame(3, -4));
    const fixture = recorder.stop();
    const store = createMeasurementStore();

    replayFixture(fixture, store.getState().ingestFrame);

    expect(store.getState().latestFrames["source-1"]).toEqual(frame(3, -4));
  });
});
