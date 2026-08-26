import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useStore } from "zustand";
import {
  FixtureRecorder,
  parseFixture,
  replayFixture,
  serializeFixture,
} from "./fixtures/fixtureRecorder";
import { OsmMeasurementProvider } from "./osm/OsmMeasurementProvider";
import { connectionControls } from "./osm/connectionControls";
import { mergeLiveDiagnostics } from "./osm/liveDiagnostics";
import type {
  ConnectionState,
  LiveMeasurement,
  MeasurementSource,
} from "./osm/types";
import { MeasurementsScreen } from "./screens/MeasurementsScreen";
import { createMeasurementStore } from "./stores/measurementStore";
import "./App.css";

const measurementStore = createMeasurementStore();

function App() {
  const provider = useMemo(() => new OsmMeasurementProvider(), []);
  const recorder = useRef(new FixtureRecorder());
  const measurement = useStore(measurementStore);
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(49007);
  const [sources, setSources] = useState<MeasurementSource[]>([]);
  const [live, setLive] = useState<LiveMeasurement>();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string>();
  const [parserErrors, setParserErrors] = useState<string[]>([]);
  const controls = connectionControls(state);

  function applySources(nextSources: MeasurementSource[]) {
    setSources(nextSources);
    if (!measurementStore.getState().primarySourceId && nextSources[0]) {
      measurementStore.getState().setPrimarySource(nextSources[0].id);
    }
  }

  useEffect(() => {
    const cleanup: Array<() => void> = [];
    provider
      .subscribeLive((frame) => {
        try {
          measurementStore.getState().ingestFrame(frame);
          recorder.current.capture(frame);
        } catch (frameError) {
          setParserErrors((current) => [
            ...current.slice(-49),
            String(frameError),
          ]);
        }
      })
      .then((fn) => cleanup.push(fn));
    provider
      .subscribeDiagnostics((diagnostics) => {
        setLive((current) => mergeLiveDiagnostics(current, diagnostics));
        if (diagnostics.messageType === "hello") {
          void provider.getSources().then(applySources);
        }
      })
      .then((fn) => cleanup.push(fn));
    listen<string>("osm-parser-error", ({ payload }) =>
      setParserErrors((current) => [...current.slice(-49), payload]),
    ).then((fn) => cleanup.push(fn));
    listen<string>("osm-error", ({ payload }) => setError(payload)).then((fn) =>
      cleanup.push(fn),
    );
    listen<ConnectionState>("osm-state", ({ payload }) =>
      setState(payload),
    ).then((fn) => cleanup.push(fn));
    return () => {
      cleanup.forEach((fn) => fn());
      void provider.disconnect();
    };
  }, [provider]);

  async function connect() {
    setState("connecting");
    setError(undefined);
    try {
      await provider.connect(host, port);
      setState(await provider.getConnectionState());
      applySources(await provider.getSources());
    } catch (connectError) {
      setError(String(connectError));
      setState("error");
    }
  }

  async function disconnect() {
    await provider.disconnect();
    setState("disconnected");
    setSources([]);
  }

  function startRecording() {
    recorder.current.start(sources);
    setRecording(true);
  }

  function stopRecording() {
    const fixture = recorder.current.stop();
    setRecording(false);
    const url = URL.createObjectURL(
      new Blob([serializeFixture(fixture)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pa-tuning-fixture-${fixture.recordedAt}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function loadFixture(file: File) {
    try {
      const fixture = parseFixture(await file.text());
      replayFixture(fixture, measurementStore.getState().ingestFrame);
      applySources(fixture.sources);
      setError(undefined);
    } catch (fixtureError) {
      setError(String(fixtureError));
    }
  }

  const diagnostics = (
    <details className="protocol-diagnostics">
      <summary>
        <span className={`dot ${state}`} /> OSM protocol diagnostics · {state}
      </summary>
      <div className="diagnostics-body">
        <div className="connection-controls">
          <label>
            Host (optional)
            <input
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="Multicast discovery"
            />
          </label>
          <label>
            Port
            <input
              type="number"
              value={port}
              onChange={(event) => setPort(Number(event.target.value))}
            />
          </label>
          <button onClick={connect} disabled={controls.connectDisabled}>
            {state === "connecting" ? "Connecting…" : "Connect OSM"}
          </button>
          <button
            className="secondary"
            onClick={disconnect}
            disabled={controls.disconnectDisabled}
          >
            Disconnect
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <dl>
          <dt>Last message</dt>
          <dd>{live ? new Date(live.timestamp).toLocaleTimeString() : "—"}</dd>
          <dt>Message type</dt>
          <dd>{live?.messageType ?? "—"}</dd>
          <dt>Parsed fields</dt>
          <dd>{live?.fields.join(", ") || "—"}</dd>
          <dt>Frequency bins</dt>
          <dd>{live?.frequencyBinCount ?? "—"}</dd>
          <dt>Time samples</dt>
          <dd>{live?.timeSampleCount ?? "—"}</dd>
        </dl>
        {parserErrors.length > 0 && <pre>{parserErrors.join("\n")}</pre>}
      </div>
    </details>
  );

  return (
    <MeasurementsScreen
      sources={sources}
      frames={measurement.latestFrames}
      primarySourceId={measurement.primarySourceId}
      overlaySourceIds={measurement.overlaySourceIds}
      recording={recording}
      onPrimarySourceChange={measurement.setPrimarySource}
      onToggleOverlay={measurement.toggleOverlay}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onReplayFixture={(file) => void loadFixture(file)}
      diagnostics={diagnostics}
    />
  );
}

export default App;
