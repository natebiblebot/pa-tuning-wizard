import { describe, expect, it } from "vitest";
import { mergeLiveDiagnostics } from "./liveDiagnostics";
import type { LiveMeasurement } from "./types";

const sourceData: LiveMeasurement = {
  sourceId: "source-1",
  messageType: "sourceData",
  timestamp: 1,
  fields: ["ftdata", "timeData"],
  frequencyBinCount: 512,
  timeSampleCount: 1024,
};

describe("live diagnostics", () => {
  it("retains decoded measurement counts when a notification arrives next", () => {
    const notification: LiveMeasurement = {
      sourceId: "source-1",
      messageType: "readyRead",
      timestamp: 2,
      fields: ["message", "source"],
    };
    const result = mergeLiveDiagnostics(sourceData, notification);
    expect(result.messageType).toBe("readyRead");
    expect(result.frequencyBinCount).toBe(512);
    expect(result.timeSampleCount).toBe(1024);
  });
});
