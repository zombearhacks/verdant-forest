import type { plants } from "./schema";
import type { EnginePlant } from "@/lib/engine/types";

type PlantRow = typeof plants.$inferSelect;

// Drizzle returns `numeric` columns as strings (avoids float precision
// loss); the engine works in plain numbers, so this is the one place that
// conversion happens.
export function toEnginePlant(row: PlantRow): EnginePlant {
  return {
    id: row.id,
    commonName: row.commonName,
    scientificName: row.scientificName,
    sun: row.sun,
    waterMin: row.waterMin,
    waterOpt: row.waterOpt,
    waterMax: row.waterMax,
    phMin: Number(row.phMin),
    phOpt: Number(row.phOpt),
    phMax: Number(row.phMax),
    minZone: row.minZone,
    maxZone: row.maxZone,
    guildLayer: row.guildLayer,
    rootDepthCm: row.rootDepthCm,
    matureHeightCm: row.matureHeightCm,
    recommendable: row.recommendable,
  };
}
