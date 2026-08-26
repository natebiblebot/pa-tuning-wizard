import { describe, expect, it } from "vitest";
import { validateMeasurementFrame, type MeasurementFrame } from "./measurement";

const validFrame: MeasurementFrame = {
  sourceId: "measurement-1",
  timestamp: 1_777_777_777_000,
  frequencyHz: [20, 100, 1_000],
  magnitudeDb: [-12, -6, -3],
  phaseDeg: [15, 0, -30],
  coherence: [0.8, 0.95, 0.99],
  delayMs: 2.4,
  splDb: 94.5,
};

describe("validateMeasurementFrame", () => {
  it("accepts a complete normalized frame", () => {
    expect(validateMeasurementFrame(validFrame)).toEqual([]);
  });

  it("accepts absent optional delay and SPL", () => {
    expect(
      validateMeasurementFrame({
        ...validFrame,
        delayMs: undefined,
        splDb: undefined,
      }),
    ).toEqual([]);
  });

  it("rejects unequal required array lengths", () => {
    expect(
      validateMeasurementFrame({ ...validFrame, phaseDeg: [0] }),
    ).toContain(
      "frequency, magnitude, phase, and coherence arrays must have equal lengths",
    );
  });

  it("rejects empty, non-finite, and non-ascending measurement data", () => {
    expect(
      validateMeasurementFrame({
        ...validFrame,
        frequencyHz: [],
        magnitudeDb: [],
        phaseDeg: [],
        coherence: [],
      }),
    ).toContain("measurement arrays must not be empty");

    expect(
      validateMeasurementFrame({
        ...validFrame,
        magnitudeDb: [-12, Number.NaN, -3],
      }),
    ).toContain("measurement values must be finite numbers");

    expect(
      validateMeasurementFrame({
        ...validFrame,
        frequencyHz: [20, 1_000, 100],
      }),
    ).toContain("frequencies must be strictly ascending");
  });

  it("rejects non-finite scalar fields", () => {
    expect(
      validateMeasurementFrame({ ...validFrame, timestamp: Number.NaN }),
    ).toContain("timestamp must be a finite number");
    expect(
      validateMeasurementFrame({
        ...validFrame,
        delayMs: Number.POSITIVE_INFINITY,
      }),
    ).toContain("delay must be a finite number when provided");
    expect(
      validateMeasurementFrame({ ...validFrame, splDb: Number.NaN }),
    ).toContain("SPL must be a finite number when provided");
  });
});
