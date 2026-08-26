export interface MeasurementFrame {
  sourceId: string;
  timestamp: number;
  frequencyHz: number[];
  magnitudeDb: number[];
  phaseDeg: number[];
  coherence: number[];
  delayMs?: number;
  splDb?: number;
}

export function validateMeasurementFrame(frame: MeasurementFrame): string[] {
  const errors: string[] = [];
  const arrays = [
    frame.frequencyHz,
    frame.magnitudeDb,
    frame.phaseDeg,
    frame.coherence,
  ];

  if (!Number.isFinite(frame.timestamp)) {
    errors.push("timestamp must be a finite number");
  }
  if (frame.delayMs !== undefined && !Number.isFinite(frame.delayMs)) {
    errors.push("delay must be a finite number when provided");
  }
  if (frame.splDb !== undefined && !Number.isFinite(frame.splDb)) {
    errors.push("SPL must be a finite number when provided");
  }
  if (arrays.some((values) => values.length === 0)) {
    errors.push("measurement arrays must not be empty");
  }
  if (arrays.some((values) => values.length !== frame.frequencyHz.length)) {
    errors.push(
      "frequency, magnitude, phase, and coherence arrays must have equal lengths",
    );
  }
  if (
    arrays.some((values) => values.some((value) => !Number.isFinite(value)))
  ) {
    errors.push("measurement values must be finite numbers");
  }
  if (
    frame.frequencyHz.some(
      (frequency, index) =>
        index > 0 && frequency <= frame.frequencyHz[index - 1],
    )
  ) {
    errors.push("frequencies must be strictly ascending");
  }

  return errors;
}
