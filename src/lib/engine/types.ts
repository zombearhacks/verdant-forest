// Deliberately independent of src/lib/db/schema.ts: the engine is pure
// logic (data ↔ logic ↔ UI stay separate), so it defines its own small,
// stable vocabulary rather than importing Drizzle types.

export type Sun = "full" | "partial" | "shade" | "adaptable";
export type WaterLevel = "dry" | "medium" | "wet";
export type GuildLayer =
  | "canopy"
  | "understory"
  | "shrub"
  | "herbaceous"
  | "groundcover"
  | "root"
  | "vine";
export type RelationType = "beneficial" | "antagonistic" | "neutral";
export type EvidenceTier = "A" | "B" | "C" | "D";

export interface EnginePlant {
  id: string;
  commonName: string;
  scientificName: string;
  sun: Sun;
  waterMin: WaterLevel;
  waterOpt: WaterLevel;
  waterMax: WaterLevel;
  phMin: number;
  phOpt: number;
  phMax: number;
  minZone: number;
  maxZone: number;
  guildLayer: GuildLayer | null;
  rootDepthCm: number | null;
  matureHeightCm: number | null;
}

export interface EngineRelationship {
  plantAId: string;
  plantBId: string;
  relationType: RelationType;
  evidenceTier: EvidenceTier;
  summary: string;
}
