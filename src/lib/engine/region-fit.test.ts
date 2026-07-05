import { describe, expect, it } from "vitest";
import { regionFit, type Site } from "./region-fit";

describe("regionFit", () => {
  it("scores an apple thriving in a centered zone 5, matched sun/water/pH site", () => {
    const apple = {
      sun: "full" as const,
      waterMin: "medium" as const,
      waterMax: "medium" as const,
      phMin: 6.0,
      phMax: 7.0,
      minZone: 3,
      maxZone: 8,
    };
    const site: Site = { zone: 5, sun: "full", water: "medium", ph: 6.5 };
    const result = regionFit(apple, site);
    expect(result).toEqual({
      zoneFit: 80,
      sunFit: 100,
      waterFit: 100,
      phFit: 100,
      overall: 95,
      band: "Thrives",
    });
  });

  it("vetoes the band when the site's zone is outside the plant's range, regardless of other fits", () => {
    const tropical = {
      sun: "full" as const,
      waterMin: "medium" as const,
      waterMax: "medium" as const,
      phMin: 6.0,
      phMax: 7.0,
      minZone: 10,
      maxZone: 12,
    };
    const site: Site = { zone: 6, sun: "full", water: "medium", ph: 6.5 };
    const result = regionFit(tropical, site);
    expect(result.zoneFit).toBe(0);
    expect(result.band).toBe("Won't survive");
  });

  it("flags a real pH mismatch (blueberry in unamended zone-6b loam)", () => {
    const blueberry = {
      sun: "full" as const,
      waterMin: "medium" as const,
      waterMax: "wet" as const,
      phMin: 4.5,
      phMax: 5.5,
      minZone: 3,
      maxZone: 7,
    };
    const site: Site = { zone: 6, sun: "full", water: "medium", ph: 6.5 };
    const result = regionFit(blueberry, site);
    expect(result.phFit).toBe(0);
    expect(result.band).toBe("Won't survive");
  });

  it("scores 0 fit exactly at a narrow range's edge (riskier than a wide range)", () => {
    const wideRange = { sun: "full" as const, waterMin: "medium" as const, waterMax: "medium" as const, phMin: 6, phMax: 7, minZone: 4, maxZone: 9 };
    const narrowRange = { ...wideRange, minZone: 6, maxZone: 7 };
    const site: Site = { zone: 6, sun: "full", water: "medium", ph: 6.5 };
    expect(regionFit(wideRange, site).zoneFit).toBe(80);
    expect(regionFit(narrowRange, site).zoneFit).toBe(0);
  });
});
