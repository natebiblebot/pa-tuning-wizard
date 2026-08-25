# Milestone 1 Result

## What works

- Tauri 2 + React + TypeScript foundation and diagnostics screen.
- OSM UDP multicast discovery lifecycle with connect, disconnect, reconnect-safe cleanup, source inventory, raw message type, timestamp, and parsed-field diagnostics.
- Framed TCP `requestData` retrieval after `readyRead`, including Qt `qCompress` decoding and validated frequency/time row counts.
- Optional direct host/port reachability check.
- Parser tests for confirmed discovery and source data, malformed/foreign messages, invalid source rows, and TCP framing.
- Frontend production build, Rust tests, and Tauri debug executable build complete successfully on Windows.
- Live validation against OSM v1.5.2 on Windows discovered active and stored sources, received `readyRead`, and decoded a real `sourceData` response containing 8,192 frequency bins and 16,384 time samples.

## What OSM exposes

OSM advertises sources and change notifications over multicast. Source settings and complete frequency/time arrays are requestable through framed TCP. Confirmed frequency rows contain frequency, module, raw magnitude, phase, and coherence.

## What OSM does not expose

There is no HTTP/WebSocket endpoint, formal schema, authentication layer, or explicit compatibility negotiation in the inspected implementation. Discovery does not guarantee a user-friendly source name.

## Protocol uncertainties

See `OSM_PROTOCOL_NOTES.md`. Real OSM v1.5.2 traffic must be captured on the user's laptop before treating all source classes and fields as stable.

The automated implementation checks and the first live field check are complete. The Codex sandbox prevents launching WebView2 itself, but the user launched the development app outside the sandbox and verified real OSM traffic on the same Windows laptop.

## Test with local OSM

1. Open OSM and enable **SERVER** in Properties.
2. Allow OSM and PA Tuning Wizard through Windows Firewall on private networks.
3. Run `npm run tauri dev` and click **Connect** with Host empty for multicast discovery.
4. Confirm `hello` traffic and sources appear. Change an active measurement and confirm live message timestamps update.
5. If multicast is unavailable, enter the OSM machine's IPv4 address and port `49007` to test direct reachability.
