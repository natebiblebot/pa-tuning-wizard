# Milestone 2 Result

## What works

- Confirmed OSM `sourceData` rows are normalized into source ID, timestamp, frequency Hz, magnitude dB, phase degrees, and coherence arrays.
- Invalid, empty, non-finite, mismatched, and nonascending measurement data is rejected without replacing the latest valid frame.
- Measurements with different frequency grids use their shared frequency range. Magnitude and coherence interpolate linearly; phase unwraps before interpolation and wraps for display.
- The measurement console renders a dominant Magnitude plot with synchronized Phase and Coherence plots, one primary source, and optional overlays.
- Fixture recording starts only after **Record fixture**, stops explicitly, exports versioned JSON, and replays through the same store ingestion action used by live OSM frames.
- Delay and SPL show explicit unavailable states because the confirmed OSM `sourceData` payload does not supply either field.
- Milestone 1 protocol diagnostics remain available in a collapsible development section.

## Automated verification

Verified on Windows on 2026-08-25:

- Frontend: 9 test files, 26 tests passed.
- Rust: 8 tests passed, including a regression test that binds two UDP listeners to the same local port.
- ESLint passed.
- All Milestone 2 TypeScript, TSX, and CSS files passed Prettier.
- TypeScript and Vite production build passed.
- `cargo fmt --check` passed.
- Clippy passed with warnings denied.
- Tauri debug executable built successfully with bundling disabled.

The repository-wide Prettier command is not a reliable worktree check on this machine because Git converted untouched legacy files to CRLF during worktree checkout. Formatting was therefore checked on every Milestone 2 source file without rewriting unrelated files.

## Replay and visual validation

A two-source version-1 fixture was loaded through the real file input. Magnitude, Phase, and Coherence rendered from the shared ingestion path with logarithmic frequency axes and stable source identity. The empty state, absent delay/SPL state, primary-source controls, overlay controls, and explicit Record/Stop behavior are also covered by component tests.

## Pending live OSM parity check

The application now sets `SO_REUSEADDR` before binding its UDP discovery socket, removing the client-side bind conflict when PA Tuning Wizard and OSM both use UDP port `49007`. An automated Windows regression test verifies that two reusable listeners can bind the same address and port. End-to-end multicast delivery with OSM remains part of the live check below.

Open Sound Meter was launched successfully, but its Remote **SERVER** was not enabled and no TCP listener appeared on port `49007`. The saved OSM settings file does not expose this runtime toggle, and the Qt UI does not expose controls to Windows UI Automation. No live graph comparison is claimed yet.

To finish the Milestone 2 exit criteria:

1. In the already-open OSM window, enable **SERVER** in Properties.
2. Ensure an active or stored transfer-function source is present.
3. Launch PA Tuning Wizard, connect with Host empty, and select the same source in both applications.
4. Compare Magnitude, Phase, and Coherence shapes and displayed values.
5. Record a fixture, disconnect OSM, replay the fixture, and confirm the same traces and metadata return.

Milestone 3 must not begin until this live parity check passes.
