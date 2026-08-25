# PA Tuning Wizard

A guided professional PA measurement, alignment, and tuning companion for Open Sound Meter.

This repository is intentionally isolated from all Arbor repositories and projects.

## Core principle

Open Sound Meter performs the measurement. PA Tuning Wizard turns that data into a safe, beginner-friendly, professional tuning workflow with explicit guardrails, repeatable analysis, and before/after verification.

## v0.1 focus

The first release targets a main + sub workflow:

- connect to Open Sound Meter
- verify measurement quality
- capture main and sub with a common timing reference
- detect acoustic crossover
- analyze phase and polarity
- recommend delay changes
- verify actual summation
- perform multi-position measurements
- recommend conservative system EQ
- generate a final tuning report

See `/docs` for the complete product, architecture, milestone, and Codex implementation specifications.

## Milestone 0–1 development

Prerequisites on Windows: Node.js 20+, Rust via `rustup`, Microsoft C++ Build Tools, and WebView2. Install dependencies with `npm install`.

```powershell
npm run test
npm run lint
npm run build
npm run tauri dev
```

In Open Sound Meter, enable **SERVER** in Properties. The diagnostics screen listens for OSM multicast discovery on `239.255.42.42:49007`; an optional IPv4 host can be supplied for a direct TCP reachability check. Windows Firewall must allow private-network UDP/TCP traffic for both applications.

This milestone intentionally contains no acoustic analysis, tuning recommendations, DSP control, persistence, or Milestone 2 graphing.
