import { describe, expect, it } from "vitest";
import {
  commonFrequencyGrid,
  resamplePhase,
  resampleSeries,
  unwrapPhase,
  wrapPhase,
} from "./frequencyGrid";

describe("frequency-grid normalization", () => {
  it("passes values through on an exact grid", () => {
    expect(resampleSeries([100, 200], [2, 8], [100, 200])).toEqual([2, 8]);
  });

  it("linearly interpolates magnitude and coherence series", () => {
    expect(resampleSeries([100, 200], [0, 10], [150])).toEqual([5]);
    expect(resampleSeries([100, 200], [0.8, 1], [125])[0]).toBeCloseTo(0.85);
  });

  it("builds a sorted comparison grid from only the shared range", () => {
    expect(
      commonFrequencyGrid([
        [20, 100, 1_000],
        [50, 100, 500],
      ]),
    ).toEqual([50, 100, 500]);
  });

  it("does not extrapolate outside the source range", () => {
    expect(() => resampleSeries([100, 200], [0, 10], [50])).toThrow(
      "target frequency is outside the source range",
    );
  });

  it("unwraps phase before interpolation across the wrap boundary", () => {
    expect(unwrapPhase([170, -170])).toEqual([170, 190]);
    expect(resamplePhase([100, 200], [170, -170], [150])[0]).toBeCloseTo(180);
    expect(wrapPhase(190)).toBe(-170);
  });
});
