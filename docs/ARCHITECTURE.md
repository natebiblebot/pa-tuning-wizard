# PA Tuning Wizard — Architecture

## 1. Architectural principle

Open Sound Meter is the measurement engine. PA Tuning Wizard is the orchestration, analysis, safety, and user-experience layer.

OSM responsibilities:

- audio interface / ASIO
- generator
- reference and measurement channels
- FFT
- magnitude
- phase
- coherence
- delay estimation
- SPL if calibrated
- active/stored measurement data

PA Tuning Wizard responsibilities:

- connection to OSM Remote API
- source discovery
- measurement capture workflow
- common timing-reference enforcement
- quality validation
- crossover detection
- phase/polarity/delay analysis
- verification logic
- multi-position analysis
- EQ recommendations
- project/history
- reporting
- beginner-facing wizard

## 2. Technology stack

Recommended initial stack:

- Tauri 2 desktop shell
- React
- TypeScript
- Vite
- Zustand for app state
- SQLite for projects/history
- Vitest for unit tests
- Playwright or equivalent later for UI flows
- Rust only where Tauri requires it or where performance later proves necessary

Do not introduce Python in v0.1 unless a specific technical requirement justifies it.

## 3. Repository structure

```text
pa-tuning-wizard/
  README.md
  docs/
    PRODUCT_SPEC.md
    ARCHITECTURE.md
    MILESTONES.md
    CODEX_FIRST_TASK.md
    ISOLATION_GUARDRAILS.md

  src/
    app/
    components/
    screens/

    wizard/
      machine.ts
      guards.ts
      steps/

    osm/
      connection.ts
      protocol.ts
      sources.ts
      measurements.ts
      generator.ts
      types.ts

    analysis/
      measurementQuality.ts
      delayStability.ts
      crossoverDetection.ts
      phaseMath.ts
      delayOptimization.ts
      polarityOptimization.ts
      summationVerification.ts
      spatialAnalysis.ts
      eqCandidates.ts

    models/
      measurement.ts
      project.ts
      system.ts

    stores/
      projectStore.ts
      measurementStore.ts
      wizardStore.ts

    reports/

  src-tauri/

  tests/
    osm/
    crossover/
    phase/
    delay/
    summation/
    eq/
```

## 4. OSM abstraction

All OSM-specific behavior must live behind an internal provider abstraction so the app is not tightly coupled throughout the codebase.

Suggested interface:

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

The first implementation is `OsmMeasurementProvider`.

Do not invent OSM endpoints or message types. Inspect official OSM source/API documentation and log real protocol messages before defining the final parser.

## 5. Core data model

```ts
export type MeasurementRole =
  | 'main'
  | 'sub'
  | 'combined'
  | 'position';

export interface MeasurementQuality {
  clipping: boolean;
  delayStable: boolean;
  coherenceScore: number;
  valid: boolean;
  reasons: string[];
}

export interface Measurement {
  id: string;
  name: string;
  role: MeasurementRole;
  timestamp: number;
  timingReferenceMs: number;
  frequencyHz: number[];
  magnitudeDb: number[];
  phaseDeg: number[];
  coherence: number[];
  spl?: number;
  quality: MeasurementQuality;
}

export interface CrossoverResult {
  frequencyHz: number;
  lowerHz: number;
  upperHz: number;
  confidence: number;
}

export interface AlignmentResult {
  polarity: 'normal' | 'inverted';
  delayTarget: 'main' | 'sub' | 'none';
  recommendedDelayMs: number;
  phaseErrorBeforeDeg: number;
  phaseErrorAfterDeg?: number;
  averageSummationDb?: number;
  confidence: number;
}

export interface EqRecommendation {
  frequencyHz: number;
  gainDb: number;
  q: number;
  confidence: number;
  rationale: string;
}

export interface SystemProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  topology: {
    mains: 'single' | 'lr';
    subs: 'mono' | 'lr';
    dspPlatform?: string;
  };
  crossover?: CrossoverResult;
  alignment?: AlignmentResult;
  measurements: Measurement[];
  eqRecommendations: EqRecommendation[];
}
```

## 6. Wizard state machine

Use an explicit finite-state model. Do not implement the wizard as loose page navigation.

Suggested states:

```text
WELCOME
CONNECT_OSM
SYSTEM_SETUP
CHECK_LEVELS
MEASURE_MAIN
LOCK_TIMING_REFERENCE
MEASURE_SUB
DETECT_CROSSOVER
ANALYZE_PHASE
RECOMMEND_ALIGNMENT
WAIT_FOR_DSP_CHANGE
VERIFY_PHASE
MEASURE_COMBINED
VERIFY_SUMMATION
ALIGNMENT_COMPLETE
MULTI_POSITION
ANALYZE_EQ
APPLY_EQ
VERIFY_EQ
FINAL_MEASUREMENT
REPORT
```

Each transition must have guards.

Example:

```ts
function canDetectCrossover(main: Measurement, sub: Measurement): boolean {
  return (
    main.quality.valid &&
    sub.quality.valid &&
    Math.abs(main.timingReferenceMs - sub.timingReferenceMs) < 0.01
  );
}
```

Wizard Mode must prevent invalid transitions rather than merely warn after the fact.

## 7. Analysis engine boundaries

Analysis modules must be UI-independent pure functions where practical.

### measurementQuality.ts

Input:

- measurement/reference levels when available
- clipping indicators
- coherence
- delay history

Output:

- validity
- confidence
- reasons

### delayStability.ts

Analyze recent delay estimates and determine whether they are sufficiently stable.

Thresholds must be configurable and testable.

### crossoverDetection.ts

Inputs:

- Main magnitude/coherence
- Sub magnitude/coherence

Outputs:

- lower crossover bound
- upper crossover bound
- center estimate
- confidence

Must avoid using low-coherence bins.

### phaseMath.ts

Core utilities:

```ts
wrapTo180(angle)
unwrapPhase(...)
phaseShiftForDelay(frequencyHz, delayMs)
weightedCircularError(...)
```

Careful circular math is required; ordinary arithmetic means are not valid for wrapped phase.

### polarityOptimization.ts

Compare normal and +180° candidates across the crossover region.

### delayOptimization.ts

Search a bounded delay range and minimize weighted phase error across the crossover region.

Do not optimize one frequency only.

### summationVerification.ts

Compare Main, Sub, and Combined measurements to quantify actual constructive summation across crossover.

Measured result outranks prediction.

### spatialAnalysis.ts

Compare multiple positions and identify features that are spatially consistent versus highly variable.

### eqCandidates.ts

Generate conservative candidate filters from repeatable broad response trends. Prefer cuts. Reject deep narrow nulls and low-confidence regions.

## 8. Frequency-grid handling

Do not assume all measurements have exactly identical frequency-bin arrays.

Create a robust resampling/interpolation layer for comparison. Interpolate magnitude/coherence carefully. Phase interpolation should be performed after unwrapping or with circular-safe methods.

All algorithms must explicitly define valid frequency regions.

## 9. Confidence model

Every recommendation should include confidence derived from deterministic inputs, for example:

- coherence quality
- measurement stability
- width of usable crossover region
- consistency of result across frequency bins
- before/after verification strength
- spatial consistency for EQ

Avoid a fake single magic score unless it can be explained. Engineer Mode should expose the factors.

## 10. UI philosophy

Wizard Mode presents actions, not analysis jargon.

Bad:

> Phase offset is 64 degrees.

Good:

> Add 2.0 ms delay to MAIN, then measure again.

Provide `Show me why` for:

- graphs
- phase error
- timing reference
- crossover band
- confidence factors
- predicted versus measured result

## 11. Safety and reversibility

The app does not directly write DSP changes in v0.1.

For every user-applied change, store:

- previous value if the user enters it
- recommended delta
- timestamp
- verification result

The UI should tell the user when to restore a previous setting if verification fails.

## 12. Persistence

SQLite project persistence should store:

- project metadata
- system topology
- raw or normalized measurement arrays
- timing references
- analysis results
- user-applied changes
- verification history

Prefer schema migrations from the beginning.

## 13. Testing requirements

Acoustic-analysis code requires unit tests before it becomes Wizard Mode logic.

Minimum test categories:

- phase wrapping around ±180°
- delay-to-phase conversion
- polarity inversion
- common timing-reference guard
- crossover detection on synthetic traces
- low-coherence rejection
- delay optimizer finding known synthetic solution
- summation calculations
- spatial variance classification
- EQ rejection of narrow deep nulls

Use synthetic fixtures with known expected outcomes.

Later add recorded OSM fixture data from real systems.

## 14. Logging and diagnostics

Development builds should provide a diagnostics panel showing:

- OSM connection state
- raw incoming message type
- source IDs/names
- update rate
- parser errors
- latest delay
- array lengths
- timestamps

Production Wizard Mode hides most of this but retains exportable logs for troubleshooting.

## 15. No AI dependency in the core path

No LLM call may be required for:

- measurement validity
- crossover detection
- delay optimization
- polarity choice
- summation verification
- EQ candidate scoring

Future AI may explain results, summarize reports, or provide natural-language help, but the application must remain fully functional without it.
