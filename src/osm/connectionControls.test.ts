import { describe, expect, it } from "vitest";
import { connectionControls } from "./connectionControls";

describe("connection controls", () => {
  it("enables only Connect while disconnected or failed", () => {
    expect(connectionControls("disconnected")).toEqual({
      connectDisabled: false,
      disconnectDisabled: true,
    });
    expect(connectionControls("error")).toEqual({
      connectDisabled: false,
      disconnectDisabled: true,
    });
  });

  it("enables only Disconnect while connecting or connected", () => {
    expect(connectionControls("connecting")).toEqual({
      connectDisabled: true,
      disconnectDisabled: false,
    });
    expect(connectionControls("connected")).toEqual({
      connectDisabled: true,
      disconnectDisabled: false,
    });
  });
});
