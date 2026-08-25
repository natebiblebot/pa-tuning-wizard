# Codex First Task — Milestone 0 + Milestone 1 Only

Read all files in `/docs` before making changes.

## Critical scope rule

Implement only the repository foundation and OSM connectivity proof. Do not implement crossover detection, phase alignment, EQ recommendations, DSP control, AI recommendations, or later milestones.

## Critical isolation rule

This repository is completely independent from all Arbor projects. Do not inspect, import, reference, clone, copy, depend on, or share configuration with any Arbor repository. Do not use Arbor environment variables, Supabase projects, Netlify projects, credentials, packages, domains, or code.

## Goal

Create a Tauri 2 + React + TypeScript Windows desktop application named **PA Tuning Wizard** and prove reliable communication with a locally running Open Sound Meter instance using OSM's actual Remote API/protocol.

Do not guess the OSM API.

Before implementing the client:

1. Research the official/current Open Sound Meter source code and official API/manual documentation.
2. Identify the real remote transport and protocol.
3. Confirm connection behavior, framing, source discovery, and available message fields.
4. Record findings in `docs/OSM_PROTOCOL_NOTES.md` with source links/references.
5. Only then implement the client.

## Foundation requirements

Initialize:

- Tauri 2
- React
- TypeScript
- Vite
- Vitest
- simple lint/format configuration

Create the folder structure described in `docs/ARCHITECTURE.md`, but files/modules may remain stubs if they belong to later milestones.

The app must launch locally on Windows.

## OSM provider abstraction

Create a provider interface similar to:

```ts
export interface MeasurementProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionState(): ConnectionState;
  getSources(): Promise<MeasurementSource[]>;
  subscribeLive(callback: (data: LiveMeasurement) => void): () => void;
  getStoredMeasurements(): Promise<StoredMeasurement[]>;
  generatorOn?(): Promise<void>;
  generatorOff?(): Promise<void>;
}
```

Do not force methods that OSM does not actually support. If the verified protocol differs, adapt the interface and document why.

Implement `OsmMeasurementProvider` behind that interface.

## Diagnostics UI

Build a developer-focused first screen that shows:

- OSM connection state
- Connect / Disconnect controls
- host/port if required by actual OSM protocol
- discovered source names/IDs if supported
- last message timestamp
- incoming update rate
- raw confirmed message type
- parsed fields available from the live measurement
- parser errors
- connection errors

Do not build polished tuning wizard screens yet.

## Protocol logging

Development mode should support logging/capturing representative incoming OSM messages so they can become fixtures.

Do not log secrets or unrelated machine information.

## Tests

Write automated tests for:

- protocol/message parsing
- malformed/unknown messages
- connection-state transitions where practical
- cleanup/unsubscribe behavior

Use captured or hand-crafted fixtures that reflect the real verified protocol.

## Error handling

The app must handle:

- OSM not running
- wrong host/port
- dropped connection
- reconnect attempt
- unknown message type
- malformed payload
- no measurement sources

It must not crash on these conditions.

## Deliverables for this task

1. Working Tauri/React app foundation.
2. `docs/OSM_PROTOCOL_NOTES.md` documenting verified OSM remote behavior.
3. `MeasurementProvider` abstraction.
4. `OsmMeasurementProvider` implementation based only on verified behavior.
5. Diagnostics UI showing real OSM data.
6. Protocol-parser tests.
7. Updated README with exact run instructions.
8. A short `docs/MILESTONE_1_RESULT.md` containing:
   - what works
   - what OSM exposes
   - what OSM does not expose
   - protocol uncertainties
   - how to test with a locally running OSM instance

## Stop condition

When Milestone 1 is complete, STOP.

Do not begin Milestone 2 automatically.

The next step will be decided after real OSM data has been tested on the user's laptop.
