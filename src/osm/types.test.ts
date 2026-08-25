import { describe, expect, it } from "vitest";
import { DEFAULT_OSM_PORT, OSM_MULTICAST_ADDRESS } from "./types";

describe("verified OSM network defaults", () => {
  it("matches upstream OSM", () => {
    expect(DEFAULT_OSM_PORT).toBe(49007);
    expect(OSM_MULTICAST_ADDRESS).toBe("239.255.42.42");
  });
});
