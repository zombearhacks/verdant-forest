import type { EnginePlant, Sun, WaterLevel } from "./types";

const WATER_ORDER: Record<WaterLevel, number> = { dry: 0, medium: 1, wet: 2 };
const SUN_ORDER: Record<Exclude<Sun, "adaptable">, number> = {
  shade: 0,
  partial: 1,
  full: 2,
};

export interface Site {
  zone: number;
  sun: Sun;
  water: WaterLevel;
  ph: number;
}

export type RegionFitBand = "Thrives" | "OK" | "Marginal" | "Won't survive";

export interface RegionFitBreakdown {
  zoneFit: number;
  sunFit: number;
  waterFit: number;
  phFit: number;
  overall: number;
  band: RegionFitBand;
}

// 100 at the center of the range, tapering linearly to 0 at either edge;
// outside the range is 0. A narrow tolerance rated right at the site's
// value is riskier than a wide one centered on it — this is what encodes
// that ("rated 4-9 is safer in 6b than one rated 6-7", decision A2).
function rangeFit(value: number, min: number, max: number): number {
  if (value < min || value > max) return 0;
  const half = (max - min) / 2;
  if (half === 0) return 100;
  const center = (min + max) / 2;
  return Math.round(100 * (1 - Math.abs(value - center) / half));
}

// Sun isn't stored as a range (plants have one preference), so this is
// ordinal distance instead of range centering. "adaptable" matches anything.
function sunFit(plantSun: Sun, siteSun: Sun): number {
  if (plantSun === "adaptable" || siteSun === "adaptable" || plantSun === siteSun) {
    return 100;
  }
  const diff = Math.abs(SUN_ORDER[plantSun] - SUN_ORDER[siteSun]);
  return Math.max(0, 100 - diff * 50);
}

type RegionFitPlant = Pick<
  EnginePlant,
  "sun" | "waterMin" | "waterMax" | "phMin" | "phMax" | "minZone" | "maxZone"
>;

// Region fit — a real 0-100 per plant, averaged from concrete sub-signals
// that each trace to a measured fact (decision A2). Zone is existential: if
// the site's zone falls outside the plant's range, no amount of sun/water/pH
// fit changes the outcome, so it vetoes the band rather than being averaged
// away.
export function regionFit(plant: RegionFitPlant, site: Site): RegionFitBreakdown {
  const zoneFit = rangeFit(site.zone, plant.minZone, plant.maxZone);
  const waterFit = rangeFit(
    WATER_ORDER[site.water],
    WATER_ORDER[plant.waterMin],
    WATER_ORDER[plant.waterMax],
  );
  const phFit = rangeFit(site.ph, plant.phMin, plant.phMax);
  const sFit = sunFit(plant.sun, site.sun);

  if (zoneFit === 0) {
    return { zoneFit, sunFit: sFit, waterFit, phFit, overall: 0, band: "Won't survive" };
  }

  const overall = Math.round((zoneFit + sFit + waterFit + phFit) / 4);
  const band: RegionFitBand =
    overall >= 80 ? "Thrives" : overall >= 60 ? "OK" : overall >= 40 ? "Marginal" : "Won't survive";

  return { zoneFit, sunFit: sFit, waterFit, phFit, overall, band };
}
