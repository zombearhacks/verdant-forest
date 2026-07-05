import { describe, expect, it } from "vitest";
import { zoneGate } from "./zone-gate";

describe("zoneGate", () => {
  const plant = (minZone: number, maxZone: number) => ({ minZone, maxZone });

  it("keeps plants whose range includes the site zone", () => {
    const plants = [plant(3, 8), plant(9, 11)];
    expect(zoneGate(plants, 6)).toEqual([plant(3, 8)]);
  });

  it("includes boundary zones (inclusive range)", () => {
    const plants = [plant(3, 6), plant(6, 9)];
    expect(zoneGate(plants, 6)).toEqual(plants);
  });

  it("excludes plants entirely outside the zone", () => {
    const plants = [plant(9, 11)];
    expect(zoneGate(plants, 6)).toEqual([]);
  });
});
