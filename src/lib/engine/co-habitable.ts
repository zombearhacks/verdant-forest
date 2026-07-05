import { rangesOverlap } from "./ranges";
import type { EnginePlant, Sun, WaterLevel } from "./types";

const WATER_ORDER: Record<WaterLevel, number> = {
  dry: 0,
  medium: 1,
  wet: 2,
};

function waterRange(plant: Pick<EnginePlant, "waterMin" | "waterMax">) {
  return { min: WATER_ORDER[plant.waterMin], max: WATER_ORDER[plant.waterMax] };
}

function phRange(plant: Pick<EnginePlant, "phMin" | "phMax">) {
  return { min: plant.phMin, max: plant.phMax };
}

function sunCompatible(a: Sun, b: Sun): boolean {
  return a === b || a === "adaptable" || b === "adaptable";
}

type CoHabitablePlant = Pick<
  EnginePlant,
  "sun" | "waterMin" | "waterMax" | "phMin" | "phMax"
>;

// Hard filter: can these two plants share the same spot? Zone is handled
// upstream by zoneGate (both plants already survive the site's zone before
// reaching this pairwise check), so this only compares sun/water/pH.
export function coHabitable(a: CoHabitablePlant, b: CoHabitablePlant): boolean {
  return (
    sunCompatible(a.sun, b.sun) &&
    rangesOverlap(waterRange(a), waterRange(b)) &&
    rangesOverlap(phRange(a), phRange(b))
  );
}
