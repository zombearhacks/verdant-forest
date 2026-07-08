import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const plantTypeEnum = pgEnum("plant_type", [
  "tree",
  "shrub",
  "vine",
  "herb",
  "vegetable",
  "ground_cover",
]);

export const guildLayerEnum = pgEnum("guild_layer", [
  "canopy",
  "understory",
  "shrub",
  "herbaceous",
  "groundcover",
  "root",
  "vine",
]);

export const sunEnum = pgEnum("sun", ["full", "partial", "shade", "adaptable"]);

export const waterLevelEnum = pgEnum("water_level", ["dry", "medium", "wet"]);

export const relationTypeEnum = pgEnum("relation_type", [
  "beneficial",
  "antagonistic",
  "neutral",
]);

export const directionalityEnum = pgEnum("directionality", [
  "mutual",
  "a_helps_b",
  "b_helps_a",
  "a_harms_b",
  "b_harms_a",
]);

export const mechanismEnum = pgEnum("mechanism", [
  "pest_confusion",
  "pest_trap",
  "beneficial_insect_attraction",
  "nitrogen_fixation",
  "allelopathy",
  "shade_structure",
  "ground_cover_weed_suppression",
  "nutrient_accumulation_claimed",
  "disease_pressure",
  "resource_competition",
  "unknown",
]);

export const evidenceTierEnum = pgEnum("evidence_tier", ["A", "B", "C", "D"]);

export const sourceTypeEnum = pgEnum("source_type", [
  "peer_reviewed",
  "extension_service",
  "horticultural_org",
  "book",
  "traditional",
]);

export const plants = pgTable(
  "plants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commonName: text("common_name").notNull(),
    scientificName: text("scientific_name").notNull().unique(),
    type: plantTypeEnum("type").notNull(),
    guildLayer: guildLayerEnum("guild_layer"),
    functions: text("functions").array().notNull().default(sql`'{}'::text[]`),
    edibleParts: text("edible_parts")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sun: sunEnum("sun").notNull(),
    waterMin: waterLevelEnum("water_min").notNull(),
    waterOpt: waterLevelEnum("water_opt").notNull(),
    waterMax: waterLevelEnum("water_max").notNull(),
    phMin: numeric("ph_min", { precision: 3, scale: 1 }).notNull(),
    phOpt: numeric("ph_opt", { precision: 3, scale: 1 }).notNull(),
    phMax: numeric("ph_max", { precision: 3, scale: 1 }).notNull(),
    minZone: smallint("min_zone").notNull(),
    maxZone: smallint("max_zone").notNull(),
    matureHeightCm: smallint("mature_height_cm"),
    spreadCm: smallint("spread_cm"),
    rootDepthCm: smallint("root_depth_cm"),
    notes: text("notes"),
    // false = a "site feature" (existing yard tree, e.g. oak, silver maple) —
    // never suggested to plant, only enters a guild when the user declares
    // it present (as anchor or existing occupant). Decision #28.
    recommendable: boolean("recommendable").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    check("zone_range", sql`${table.minZone} <= ${table.maxZone}`),
    check(
      "ph_range",
      sql`${table.phMin} <= ${table.phOpt} and ${table.phOpt} <= ${table.phMax}`,
    ),
  ],
);

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  publisher: text("publisher"),
  url: text("url"),
  sourceType: sourceTypeEnum("source_type").notNull(),
  year: smallint("year"),
  ...timestamps,
});

export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plantAId: uuid("plant_a_id")
      .notNull()
      .references(() => plants.id),
    plantBId: uuid("plant_b_id")
      .notNull()
      .references(() => plants.id),
    relationType: relationTypeEnum("relation_type").notNull(),
    directionality: directionalityEnum("directionality").notNull(),
    mechanism: mechanismEnum("mechanism"),
    evidenceTier: evidenceTierEnum("evidence_tier").notNull(),
    summary: text("summary").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("relationships_pair_unique").on(table.plantAId, table.plantBId),
    check(
      "canonical_pair_order",
      sql`${table.plantAId} < ${table.plantBId}`,
    ),
  ],
);

export const relationshipSources = pgTable(
  "relationship_sources",
  {
    relationshipId: uuid("relationship_id")
      .notNull()
      .references(() => relationships.id),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    ...timestamps,
  },
  (table) => [
    unique("relationship_sources_pair_unique").on(
      table.relationshipId,
      table.sourceId,
    ),
  ],
);

// USDA hardiness zone reference (half-zone granularity, e.g. "6b") for the
// ZIP lookup below; plants.min_zone/max_zone use whole zones since seed
// data doesn't grade tolerance to the half-zone.
export const zones = pgTable("zones", {
  code: text("code").primaryKey(), // e.g. "6b"
  minTempC: numeric("min_temp_c", { precision: 5, scale: 1 }).notNull(),
  maxTempC: numeric("max_temp_c", { precision: 5, scale: 1 }).notNull(),
  ...timestamps,
});

export const zipZones = pgTable("zip_zones", {
  zip: text("zip").primaryKey(),
  zoneCode: text("zone_code")
    .notNull()
    .references(() => zones.code),
  ...timestamps,
});
