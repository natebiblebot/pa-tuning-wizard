import { describe, expect, it } from "vitest";
import type { MeasurementFrame } from "../models/measurement";
import { createMeasurementStore } from "./measurementStore";

const frame: MeasurementFrame = {
  sourceId: "main",
  timestamp: 1,
  frequencyHz: [100],
  magnitudeDb: [-6],
  phaseDeg: [0],
  coherence: [0.95],
};

describe("measurement store", () => {
  it("tracks a primary source and optional overlays", () => {
    const store = createMeasurementStore();
    store.getState().setPrimarySource("main");
    store.getState().toggleOverlay("sub");
    store.getState().toggleOverlay("fill");
    store.getState().toggleOverlay("sub");

    expect(store.getState().primarySourceId).toBe("main");
    expect(store.getState().overlaySourceIds).toEqual(["fill"]);
  });

  it("stores the latest valid frame for each source", () => {
    const store = createMeasurementStore();
    store.getState().ingestFrame(frame);
    store.getState().ingestFrame({ ...frame, timestamp: 2, magnitudeDb: [-5] });

    expect(store.getState().latestFrames.main.timestamp).toBe(2);
  });

  it("rejects malformed frames without replacing valid data", () => {
    const store = createMeasurementStore();
    store.getState().ingestFrame(frame);

    expect(() =>
      store.getState().ingestFrame({ ...frame, magnitudeDb: [] }),
    ).toThrow("invalid measurement frame");
    expect(store.getState().latestFrames.main).toEqual(frame);
  });
});
