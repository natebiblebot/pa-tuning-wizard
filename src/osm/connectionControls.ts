import type { ConnectionState } from "./types";

export function connectionControls(state: ConnectionState) {
  const active =
    state === "connecting" || state === "connected" || state === "reconnecting";
  return { connectDisabled: active, disconnectDisabled: !active };
}
