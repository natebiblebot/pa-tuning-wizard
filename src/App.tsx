import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { OsmMeasurementProvider } from "./osm/OsmMeasurementProvider";
import { connectionControls } from "./osm/connectionControls";
import { mergeLiveDiagnostics } from "./osm/liveDiagnostics";
import type {
  ConnectionState,
  LiveMeasurement,
  MeasurementSource,
} from "./osm/types";
import "./App.css";

function App() {
  const provider = useMemo(() => new OsmMeasurementProvider(), []);
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(49007);
  const [sources, setSources] = useState<MeasurementSource[]>([]);
  const [live, setLive] = useState<LiveMeasurement>();
  const [error, setError] = useState<string>();
  const [parserErrors, setParserErrors] = useState<string[]>([]);
  const controls = connectionControls(state);
  useEffect(() => {
    const cleanup: Array<() => void> = [];
    provider
      .subscribeLive((measurement) => {
        setLive((current) => mergeLiveDiagnostics(current, measurement));
        if (measurement.messageType === "hello") {
          void provider.getSources().then(setSources);
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
      setSources(await provider.getSources());
    } catch (e) {
      setError(String(e));
      setState("error");
    }
  }
  async function disconnect() {
    await provider.disconnect();
    setState("disconnected");
    setSources([]);
  }
  return (
    <main className="diagnostics">
      <header>
        <p className="eyebrow">Milestone 1 · protocol diagnostics</p>
        <h1>PA Tuning Wizard</h1>
        <p>Open Sound Meter connectivity proof. No acoustic recommendations.</p>
      </header>
      <section>
        <h2>
          <span className={`dot ${state}`} />
          OSM {state}
        </h2>
        <div className="controls">
          <label>
            Host (optional)
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="Multicast discovery"
            />
          </label>
          <label>
            Port
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </label>
          <button onClick={connect} disabled={controls.connectDisabled}>
            {state === "connecting" ? "Connecting…" : "Connect"}
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
      </section>
      <div className="grid">
        <section>
          <h2>Sources</h2>
          {sources.length ? (
            <ul>
              {sources.map((s) => (
                <li key={s.id}>
                  <strong>{s.name}</strong>
                  <code>{s.id}</code>
                  <small>
                    {s.objectName} @{s.host}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No measurement sources discovered.</p>
          )}
        </section>
        <section>
          <h2>Live protocol</h2>
          <dl>
            <dt>Last message</dt>
            <dd>
              {live ? new Date(live.timestamp).toLocaleTimeString() : "—"}
            </dd>
            <dt>Message type</dt>
            <dd>{live?.messageType ?? "—"}</dd>
            <dt>Parsed fields</dt>
            <dd>{live?.fields.join(", ") || "—"}</dd>
            <dt>Frequency bins</dt>
            <dd>{live?.frequencyBinCount ?? "—"}</dd>
            <dt>Time samples</dt>
            <dd>{live?.timeSampleCount ?? "—"}</dd>
          </dl>
        </section>
      </div>
      <section>
        <h2>Parser errors</h2>
        {parserErrors.length ? (
          <pre>{parserErrors.join("\n")}</pre>
        ) : (
          <p className="muted">No parser errors.</p>
        )}
      </section>
    </main>
  );
}
export default App;
