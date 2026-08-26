import type { ReactNode } from "react";
import {
  commonFrequencyGrid,
  resamplePhase,
  resampleSeries,
} from "../analysis/frequencyGrid";
import {
  MeasurementPlot,
  type PlotSeries,
} from "../components/MeasurementPlot";
import type { MeasurementFrame } from "../models/measurement";
import type { MeasurementSource } from "../osm/types";

interface MeasurementsScreenProps {
  sources: MeasurementSource[];
  frames: Record<string, MeasurementFrame>;
  primarySourceId?: string;
  overlaySourceIds: string[];
  recording: boolean;
  onPrimarySourceChange: (sourceId: string) => void;
  onToggleOverlay: (sourceId: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReplayFixture: (file: File) => void;
  diagnostics?: ReactNode;
}

const TRACE_COLORS = ["#f2ad3d", "#57c7d4", "#a78bfa", "#ef6f6c"];

function plotSeries(
  frames: MeasurementFrame[],
  sources: MeasurementSource[],
  field: "magnitudeDb" | "phaseDeg" | "coherence",
): PlotSeries[] {
  if (frames.length === 0) return [];
  const grid = commonFrequencyGrid(frames.map((frame) => frame.frequencyHz));
  return frames.flatMap((frame, index) => {
    try {
      const values =
        field === "phaseDeg"
          ? resamplePhase(frame.frequencyHz, frame.phaseDeg, grid)
          : resampleSeries(frame.frequencyHz, frame[field], grid);
      return [
        {
          id: frame.sourceId,
          label:
            sources.find((source) => source.id === frame.sourceId)?.name ??
            frame.sourceId,
          color: TRACE_COLORS[index % TRACE_COLORS.length],
          frequencyHz: grid,
          values,
        },
      ];
    } catch {
      return [];
    }
  });
}

export function MeasurementsScreen({
  sources,
  frames,
  primarySourceId,
  overlaySourceIds,
  recording,
  onPrimarySourceChange,
  onToggleOverlay,
  onStartRecording,
  onStopRecording,
  onReplayFixture,
  diagnostics,
}: MeasurementsScreenProps) {
  const selectedIds = [primarySourceId, ...overlaySourceIds].filter(
    (sourceId): sourceId is string => Boolean(sourceId),
  );
  const selectedFrames = selectedIds.flatMap((sourceId) =>
    frames[sourceId] ? [frames[sourceId]] : [],
  );
  const primaryFrame = primarySourceId ? frames[primarySourceId] : undefined;

  return (
    <main className="measurements-screen">
      <header className="console-header">
        <div>
          <p className="eyebrow">PA Tuning Wizard · Measurement console</p>
          <h1>Live transfer function</h1>
        </div>
        <div className="capture-controls">
          {recording ? (
            <button className="stop-button" onClick={onStopRecording}>
              <span className="recording-dot" /> Stop recording
            </button>
          ) : (
            <button onClick={onStartRecording}>Record fixture</button>
          )}
          <label className="file-control">
            Replay fixture
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onReplayFixture(file);
              }}
            />
          </label>
        </div>
      </header>

      <section className="source-console" aria-label="Measurement sources">
        <div className="source-list">
          {sources.length === 0 ? (
            <p className="source-empty">
              Connect OSM to discover measurement sources.
            </p>
          ) : (
            sources.map((source) => (
              <div className="source-row" key={source.id}>
                <span>{source.name}</span>
                <label>
                  <input
                    type="radio"
                    name="primary-source"
                    aria-label={`${source.name} primary`}
                    checked={source.id === primarySourceId}
                    onChange={() => onPrimarySourceChange(source.id)}
                  />
                  Primary
                </label>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`${source.name} overlay`}
                    checked={overlaySourceIds.includes(source.id)}
                    disabled={source.id === primarySourceId}
                    onChange={() => onToggleOverlay(source.id)}
                  />
                  Overlay
                </label>
              </div>
            ))
          )}
        </div>
        <div className="measurement-readouts">
          <span>
            Delay
            <strong>
              {primaryFrame?.delayMs === undefined
                ? "Delay unavailable"
                : `${primaryFrame.delayMs.toFixed(2)} ms`}
            </strong>
          </span>
          <span>
            SPL
            <strong>
              {primaryFrame?.splDb === undefined
                ? "SPL unavailable"
                : `${primaryFrame.splDb.toFixed(1)} dB`}
            </strong>
          </span>
        </div>
      </section>

      <MeasurementPlot
        title="Magnitude"
        unit="dB"
        dominant
        series={plotSeries(selectedFrames, sources, "magnitudeDb")}
      />
      <div className="secondary-plots">
        <MeasurementPlot
          title="Phase"
          unit="degrees"
          series={plotSeries(selectedFrames, sources, "phaseDeg")}
        />
        <MeasurementPlot
          title="Coherence"
          unit="0–1"
          series={plotSeries(selectedFrames, sources, "coherence")}
        />
      </div>
      {diagnostics}
    </main>
  );
}
