# Milestone 2 — Measurement Data and Graphs Design

## Scope

Milestone 2 normalizes real Open Sound Meter data into UI-independent measurement structures, renders live graphs, and adds manual fixture recording/replay. It does not make tuning recommendations or implement the guided tuning wizard.

## Approved experience

- Magnitude is the dominant graph.
- Phase and Coherence appear as smaller graphs below Magnitude.
- One selected source is shown by default.
- Users can enable additional sources as overlays for comparison.
- Fixture capture uses explicit Record and Stop controls; it is never automatic.
- Delay and SPL appear when supplied and degrade to a clear unavailable state when absent.
- Graphs update from live OSM data and replayed fixtures through the same normalized data path.

## Interaction model

The source toolbar lists discovered live and stored sources. Selecting a source makes it primary; toggling another source adds or removes its overlay. Trace identity remains stable across all three plots.

Record begins capturing normalized measurement frames with source metadata and timestamps. Stop finalizes a versioned JSON fixture that can be replayed without OSM. Recording must not silently begin when OSM connects.

## Data boundaries

Raw OSM payload interpretation remains inside the OSM provider/backend boundary. The UI receives normalized frames containing source ID, timestamp, frequency, magnitude, phase, coherence, and optional delay/SPL.

Measurements with different frequency grids are resampled onto a comparison grid. Magnitude and coherence use linear interpolation. Phase is unwrapped before interpolation and wrapped for display afterward. Missing or mismatched arrays produce diagnostics and omit only the invalid series rather than crashing the screen.

## Visual behavior

- Logarithmic frequency axis from the valid data range.
- Magnitude plot receives the most vertical space.
- Phase and Coherence stack side-by-side when space permits and vertically on narrow windows.
- Optional overlays appear consistently across all available plots.
- No acoustic quality labels, delay recommendations, polarity choices, or EQ guidance appear in this milestone.

## Verification

- Unit tests cover normalization, missing fields, mismatched arrays, phase-safe interpolation, and fixture round trips.
- Component tests cover source selection, overlays, record/stop, and missing delay/SPL.
- A live comparison against OSM confirms graph shape and values closely match the same measurement.

