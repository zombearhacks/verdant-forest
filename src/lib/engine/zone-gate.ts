import type { EnginePlant } from "./types";

// Hard filter: which plants survive the user's site zone. Not edible-gated —
// guilds need support species too (decision #9).
export function zoneGate<T extends Pick<EnginePlant, "minZone" | "maxZone">>(
  plants: T[],
  zone: number,
): T[] {
  return plants.filter((plant) => plant.minZone <= zone && zone <= plant.maxZone);
}
