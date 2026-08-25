# Open Sound Meter Remote Protocol Notes

Verified on 2026-08-25 against official OSM source commit `1e08de2322f5e8849e1ba39e1d3993187a7cc75c` and the official [Remote Control API page](https://opensoundmeter.com/api).

## Transport and discovery

- OSM Remote is not HTTP or WebSocket.
- The server listens on IPv4 TCP port `49007` and sends compact JSON discovery/change notifications over UDP multicast to `239.255.42.42:49007`.
- `hello` messages advertise server UUID, hostname, TCP port, API version, generator UUID when exposed, and sources as `{ uuid, objectName }`.
- Other confirmed UDP types include `added`, `removed`, `changed`, `readyRead`, `levels`, and `generator_changed`.

Source references: [`network.h`](https://github.com/psmokotnin/osm/blob/master/src/remote/network.h), [`network.cpp`](https://github.com/psmokotnin/osm/blob/master/src/remote/network.cpp), [`server.cpp`](https://github.com/psmokotnin/osm/blob/master/src/remote/server.cpp), and [`remoteclient.cpp`](https://github.com/psmokotnin/osm/blob/master/src/remote/remoteclient.cpp).

## TCP framing and payloads

Requests use a four-byte little-endian payload length followed by compact JSON. OSM closes the connection after its response. Responses use the same length framing, but the framed body is Qt `qCompress` output: a four-byte big-endian uncompressed-size prefix followed by a zlib stream.

Confirmed request messages are `requestChanged`, `requestData`, `update`, and `command`. `requestData` returns `sourceData` with:

- `ftdata`: rows of frequency Hz, module, raw magnitude, phase in radians, and coherence.
- `timeData`: rows of impulse time and impulse value.

Only those positions are considered confirmed. Their semantic units come directly from OSM source; no conversion to the product's normalized Milestone 2 model occurs here.

## Current uncertainties

- OSM provides implementation source but not a versioned wire-format schema or compatibility promise.
- Source display names are properties fetched with `requestChanged`; the discovery message exposes `objectName`, not necessarily the user-visible name.
- TCP response limits and behavior across older OSM releases require field validation.
- Multicast behavior can depend on Windows firewall and selected network interface.

The diagnostics client therefore preserves message types/field names, tolerates unknown notifications, and reports malformed data without inventing fields.
