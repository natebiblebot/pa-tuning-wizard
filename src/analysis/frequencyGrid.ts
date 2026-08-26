function assertSeries(frequencyHz: number[], values: number[]) {
  if (frequencyHz.length === 0 || frequencyHz.length !== values.length) {
    throw new Error(
      "source frequencies and values must have equal nonzero lengths",
    );
  }
  if (
    frequencyHz.some(
      (frequency, index) =>
        !Number.isFinite(frequency) ||
        (index > 0 && frequency <= frequencyHz[index - 1]),
    ) ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(
      "source series must contain finite values on an ascending grid",
    );
  }
}

export function commonFrequencyGrid(grids: number[][]): number[] {
  if (grids.length === 0 || grids.some((grid) => grid.length === 0)) {
    return [];
  }
  const overlapStart = Math.max(...grids.map((grid) => grid[0]));
  const overlapEnd = Math.min(...grids.map((grid) => grid[grid.length - 1]));
  if (overlapStart > overlapEnd) return [];

  return [
    ...new Set(
      grids.flatMap((grid) =>
        grid.filter(
          (frequency) => frequency >= overlapStart && frequency <= overlapEnd,
        ),
      ),
    ),
  ].sort((left, right) => left - right);
}

export function resampleSeries(
  sourceFrequencyHz: number[],
  sourceValues: number[],
  targetFrequencyHz: number[],
): number[] {
  assertSeries(sourceFrequencyHz, sourceValues);
  let right = 0;

  return targetFrequencyHz.map((target) => {
    if (
      !Number.isFinite(target) ||
      target < sourceFrequencyHz[0] ||
      target > sourceFrequencyHz[sourceFrequencyHz.length - 1]
    ) {
      throw new RangeError("target frequency is outside the source range");
    }
    while (
      right < sourceFrequencyHz.length - 1 &&
      sourceFrequencyHz[right] < target
    ) {
      right += 1;
    }
    if (sourceFrequencyHz[right] === target) return sourceValues[right];

    const left = right - 1;
    const ratio =
      (target - sourceFrequencyHz[left]) /
      (sourceFrequencyHz[right] - sourceFrequencyHz[left]);
    return (
      sourceValues[left] + ratio * (sourceValues[right] - sourceValues[left])
    );
  });
}

export function unwrapPhase(phaseDeg: number[]): number[] {
  if (phaseDeg.length === 0) return [];
  const unwrapped = [phaseDeg[0]];
  for (let index = 1; index < phaseDeg.length; index += 1) {
    let next = phaseDeg[index];
    const previous = unwrapped[index - 1];
    while (next - previous > 180) next -= 360;
    while (next - previous < -180) next += 360;
    unwrapped.push(next);
  }
  return unwrapped;
}

export function wrapPhase(phaseDeg: number): number {
  const wrapped = ((((phaseDeg + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

export function resamplePhase(
  sourceFrequencyHz: number[],
  sourcePhaseDeg: number[],
  targetFrequencyHz: number[],
): number[] {
  return resampleSeries(
    sourceFrequencyHz,
    unwrapPhase(sourcePhaseDeg),
    targetFrequencyHz,
  ).map(wrapPhase);
}
