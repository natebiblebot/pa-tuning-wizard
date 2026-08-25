import type { LiveMeasurement } from "./types";

export function mergeLiveDiagnostics(
  previous: LiveMeasurement | undefined,
  incoming: LiveMeasurement,
): LiveMeasurement {
  const sameSource = previous?.sourceId === incoming.sourceId;
  return {
    ...incoming,
    frequencyBinCount:
      incoming.frequencyBinCount ??
      (sameSource ? previous?.frequencyBinCount : undefined),
    timeSampleCount:
      incoming.timeSampleCount ??
      (sameSource ? previous?.timeSampleCount : undefined),
  };
}
