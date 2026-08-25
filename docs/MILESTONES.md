# PA Tuning Wizard — Development Milestones

## Rule for all milestones

Do not skip ahead. Each milestone must be demonstrably working before the next one begins. Do not build UI polish on top of guessed OSM behavior.

## Milestone 0 — Repository foundation

Goal: establish a clean independent project.

Tasks:

- initialize Tauri 2 + React + TypeScript + Vite
- add ESLint/formatting
- add Vitest
- create base folder structure from ARCHITECTURE.md
- add a minimal README run guide
- add a development diagnostics screen shell
- keep repository completely isolated from Arbor code and infrastructure

Exit criteria:

- app launches locally on Windows
- tests run
- no Arbor dependency, import, environment variable, package, project reference, or copied configuration exists

## Milestone 1 — Prove OSM connectivity

Goal: reliably connect to locally running Open Sound Meter and characterize the actual remote protocol.

Tasks:

- inspect official OSM source/API documentation before coding protocol assumptions
- identify actual connection transport, host/port behavior, message framing, and payload types
- implement `MeasurementProvider` abstraction
- implement `OsmMeasurementProvider`
- connect/disconnect cleanly
- discover OSM sources if supported
- subscribe to available live data
- log raw incoming message types in developer diagnostics
- parse only confirmed fields
- write protocol-parser tests using captured fixtures

UI:

- OSM Connected / Disconnected
- discovered sources
- raw/debug fields
- live update indicator

Do NOT implement acoustic recommendations.

Exit criteria:

- app can connect repeatedly without restart
- real OSM data is visible in the app
- parser behavior is tested
- undocumented fields are not invented

## Milestone 2 — Measurement data model and graphs

Goal: normalize OSM data into internal measurements and render it.

Tasks:

- map real OSM data to internal frequency/magnitude/phase/coherence/delay structures
- implement frequency-grid normalization/resampling as needed
- render Magnitude graph
- render Phase graph
- render Coherence graph
- display delay and SPL if supplied
- handle missing fields gracefully
- create fixture recording/replay capability for development without a live PA

Exit criteria:

- app graphs match OSM data closely for the same live measurement
- no recommendation logic yet

## Milestone 3 — Measurement quality engine

Goal: prevent decisions from bad data.

Tasks:

- clipping detection where source data permits
- coherence scoring by frequency region
- delay-history tracking
- delay stability classification
- source/reference-present checks
- configurable quality thresholds
- plain-language Wizard Mode status

Exit criteria:

- app blocks intentionally corrupted/poor synthetic fixtures
- app accepts known-good fixtures
- reasons are visible in diagnostics

## Milestone 4 — Main/Sub capture workflow

Goal: implement the first real wizard flow.

Tasks:

- system setup screen
- Main-only instruction state
- stable delay acquisition
- lock `ALIGNMENT_REFERENCE_DELAY`
- capture Main
- Sub-only instruction state
- force Sub capture to use same timing reference
- block phase comparison if timing references differ
- automatic labels and project storage

Exit criteria:

- user can complete Main/Sub capture without manually managing stored traces
- timing mismatch is impossible to pass accidentally in Wizard Mode

## Milestone 5 — Acoustic crossover detection

Goal: identify the useful Main/Sub overlap band automatically.

Tasks:

- reject low-coherence bins
- identify meaningful passband overlap
- detect opposing acoustic slopes
- return lower/upper crossover bounds
- estimate center frequency
- calculate explainable confidence
- add synthetic tests for common crossover topologies

Exit criteria:

- known synthetic 60/80/100/120 Hz systems are identified within a defined tolerance
- false intersections away from the true crossover are rejected

## Milestone 6 — Phase, polarity, and delay optimizer

Goal: recommend a physically meaningful alignment change.

Tasks:

- circular-safe phase utilities
- phase comparison across crossover band
- coherence/relevance weighting
- normal polarity candidate
- inverted polarity candidate
- bounded delay search
- choose delay target (Main or Sub)
- confidence/rationale output
- extensive synthetic unit tests

Exit criteria:

- optimizer recovers known synthetic delay offsets
- ±180° wrap edge cases pass tests
- polarity candidate logic is verified
- no single-frequency-only decision path exists

## Milestone 7 — Alignment verification

Goal: prove recommendations acoustically.

Tasks:

- capture post-change measurement
- compare phase error before/after
- guide user to restore prior setting if worse
- measure Main + Sub together
- quantify actual crossover summation
- classify Excellent / Good / Needs Improvement / Invalid
- loop back for another alignment attempt if necessary

Exit criteria:

- Wizard never marks alignment complete based solely on prediction
- combined measurement is required

## Milestone 8 — Multi-position measurement

Goal: characterize spatial consistency.

Tasks:

- guided positions: reference, front, rear, off-axis
- automatic delay acquisition per spatial-EQ position
- automatic labels
- per-position quality validation
- overlay/summary view
- spatial variance calculations

Exit criteria:

- complete set of valid position measurements can be captured without manual trace management

## Milestone 9 — Conservative EQ engine

Goal: recommend only repeatable, defensible global corrections.

Tasks:

- derive broad response trend per position
- identify repeatable peaks/excess
- calculate spatial consistency
- reject narrow deep nulls
- reject low-coherence regions
- reject highly variable regions
- prefer cuts
- bound gain and Q recommendations
- generate confidence/rationale
- require after-EQ remeasurement

Exit criteria:

- synthetic spatial null cases are correctly rejected
- repeatable broad peaks produce conservative candidate filters

## Milestone 10 — Project persistence and reporting

Goal: make the tool usable on real jobs.

Tasks:

- SQLite persistence
- migrations
- project creation/open/save
- measurement history
- change history
- before/after summary
- report data model
- initial printable/exportable report

Exit criteria:

- closing/reopening project retains all important measurements and results

## Milestone 11 — UX hardening

Goal: make Wizard Mode truly beginner-friendly.

Tasks:

- simplify all instructional copy
- large source-state instructions: MAIN ON / SUB OFF
- actionable errors
- Show Me Why technical drawer
- recovery from disconnected OSM
- recovery from invalid measurement
- session resumption
- accessibility pass
- Windows packaging

Exit criteria:

- a technically inexperienced tester can complete a simulated tune using only wizard instructions

## Milestone 12 — Field validation

Goal: prove the analysis on diverse real systems before treating thresholds as final.

Test systems should include:

- point-source main + sub
- passive/active line-array systems
- physically offset subs
- different crossover slopes
- polarity inversion cases
- reverberant rooms
- difficult coherence conditions

Record anonymized fixture data for regression tests.

Do not hard-code provisional thresholds as permanent until field data supports them.

## Future milestones — not v0.1

Potential later work:

- fill/delay speaker alignment
- multiple sub zones
- cardioid/end-fire sub workflows
- direct Tesira control
- direct Powersoft control
- Q-SYS/Lake integrations
- automatic DSP write with explicit user approval
- microphone calibration-file management
- more sophisticated spatial optimization
- AI explanation/report assistant
