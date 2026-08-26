export interface PlotSeries {
  id: string;
  label: string;
  color: string;
  frequencyHz: number[];
  values: number[];
}

interface MeasurementPlotProps {
  title: string;
  unit: string;
  series: PlotSeries[];
  dominant?: boolean;
}

const WIDTH = 1_000;
const LEFT = 72;
const RIGHT = 24;
const TOP = 36;
const BOTTOM = 42;

function formatFrequency(frequency: number) {
  if (frequency >= 1_000) return `${frequency / 1_000} kHz`;
  return `${frequency} Hz`;
}

export function MeasurementPlot({
  title,
  unit,
  series,
  dominant = false,
}: MeasurementPlotProps) {
  const height = dominant ? 420 : 270;
  const validSeries = series.filter(
    (trace) =>
      trace.frequencyHz.length > 0 &&
      trace.frequencyHz.length === trace.values.length &&
      trace.frequencyHz.every(
        (frequency) => Number.isFinite(frequency) && frequency > 0,
      ) &&
      trace.values.every(Number.isFinite),
  );
  const frequencies = validSeries.flatMap((trace) => trace.frequencyHz);
  const values = validSeries.flatMap((trace) => trace.values);

  if (validSeries.length === 0) {
    return (
      <section
        className={`plot-shell ${dominant ? "plot-shell--dominant" : ""}`}
      >
        <header className="plot-heading">
          <h2>{title}</h2>
          <span>{unit}</span>
        </header>
        <div className="plot-empty">Waiting for measurement data</div>
      </section>
    );
  }

  const minFrequency = Math.min(...frequencies);
  const maxFrequency = Math.max(...frequencies);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valuePadding = Math.max((maxValue - minValue) * 0.08, 1);
  const yMin = minValue - valuePadding;
  const yMax = maxValue + valuePadding;
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = height - TOP - BOTTOM;
  const logMin = Math.log10(minFrequency);
  const logRange = Math.max(Math.log10(maxFrequency) - logMin, 1e-9);
  const valueRange = Math.max(yMax - yMin, 1e-9);
  const x = (frequency: number) =>
    LEFT + ((Math.log10(frequency) - logMin) / logRange) * plotWidth;
  const y = (value: number) =>
    TOP + (1 - (value - yMin) / valueRange) * plotHeight;

  return (
    <section className={`plot-shell ${dominant ? "plot-shell--dominant" : ""}`}>
      <header className="plot-heading">
        <h2>{title}</h2>
        <span>{unit}</span>
      </header>
      <svg
        className={dominant ? "measurement-plot--dominant" : "measurement-plot"}
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={`${title} plot`}
      >
        <g className="plot-grid" aria-hidden="true">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={LEFT}
              x2={WIDTH - RIGHT}
              y1={TOP + ratio * plotHeight}
              y2={TOP + ratio * plotHeight}
            />
          ))}
        </g>
        <text x={LEFT} y={height - 12} className="axis-label">
          {formatFrequency(minFrequency)}
        </text>
        <text
          x={WIDTH - RIGHT}
          y={height - 12}
          textAnchor="end"
          className="axis-label"
        >
          {formatFrequency(maxFrequency)}
        </text>
        <text x={LEFT - 10} y={TOP + 4} textAnchor="end" className="axis-label">
          {maxValue.toFixed(1)}
        </text>
        <text
          x={LEFT - 10}
          y={height - BOTTOM}
          textAnchor="end"
          className="axis-label"
        >
          {minValue.toFixed(1)}
        </text>
        {validSeries.map((trace) => (
          <polyline
            key={trace.id}
            data-testid={`trace-${trace.id}`}
            aria-label={trace.label}
            points={trace.frequencyHz
              .map(
                (frequency, index) =>
                  `${x(frequency)},${y(trace.values[index])}`,
              )
              .join(" ")}
            fill="none"
            stroke={trace.color}
            strokeWidth={dominant ? 3.5 : 3}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </section>
  );
}
