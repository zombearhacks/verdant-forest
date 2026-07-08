import { readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { parse } from "csv-parse/sync";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

config({ path: path.join(__dirname, "..", ".env.local") });

const {
  plants,
  sources,
  relationships,
  relationshipSources,
  plantTypeEnum,
  guildLayerEnum,
  sunEnum,
  waterLevelEnum,
  relationTypeEnum,
  directionalityEnum,
  mechanismEnum,
  evidenceTierEnum,
  sourceTypeEnum,
} = schema;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const dataDir = path.join(__dirname, "..", "data");

function readCsv(file: string): Record<string, string>[] {
  const raw = readFileSync(path.join(dataDir, file), "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true });
}

function splitList(value: string): string[] {
  return value
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

function assertEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  field: string,
  rowLabel: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(
      `${rowLabel}: invalid ${field} "${value}" (expected one of ${allowed.join(", ")})`,
    );
  }
  return value as T;
}

function parseNumeric(value: string, field: string, rowLabel: string): string {
  if (value.trim() === "" || Number.isNaN(Number(value))) {
    throw new Error(`${rowLabel}: invalid numeric ${field} "${value}"`);
  }
  return value.trim();
}

function parseSmallint(value: string, field: string, rowLabel: string): number {
  const n = Number(value);
  if (value.trim() === "" || !Number.isInteger(n)) {
    throw new Error(`${rowLabel}: invalid integer ${field} "${value}"`);
  }
  return n;
}

function parseOptionalSmallint(
  value: string,
  field: string,
  rowLabel: string,
): number | null {
  if (value.trim() === "") return null;
  return parseSmallint(value, field, rowLabel);
}

function parseBoolean(value: string, field: string, rowLabel: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${rowLabel}: invalid boolean ${field} "${value}" (expected "true" or "false")`);
}

const directionalityFlip: Record<string, string> = {
  mutual: "mutual",
  a_helps_b: "b_helps_a",
  b_helps_a: "a_helps_b",
  a_harms_b: "b_harms_a",
  b_harms_a: "a_harms_b",
};

async function seedPlants(): Promise<Map<string, string>> {
  const rows = readCsv("plants.csv");
  const errors: string[] = [];
  const idByScientificName = new Map<string, string>();

  for (const row of rows) {
    const rowLabel = `plants.csv: ${row.scientific_name}`;
    try {
      const type = assertEnum(row.type, plantTypeEnum.enumValues, "type", rowLabel);
      const guildLayer = row.guild_layer
        ? assertEnum(row.guild_layer, guildLayerEnum.enumValues, "guild_layer", rowLabel)
        : null;
      const sun = assertEnum(row.sun, sunEnum.enumValues, "sun", rowLabel);
      const waterMin = assertEnum(row.water_min, waterLevelEnum.enumValues, "water_min", rowLabel);
      const waterOpt = assertEnum(row.water_opt, waterLevelEnum.enumValues, "water_opt", rowLabel);
      const waterMax = assertEnum(row.water_max, waterLevelEnum.enumValues, "water_max", rowLabel);
      const phMin = parseNumeric(row.ph_min, "ph_min", rowLabel);
      const phOpt = parseNumeric(row.ph_opt, "ph_opt", rowLabel);
      const phMax = parseNumeric(row.ph_max, "ph_max", rowLabel);
      if (!(Number(phMin) <= Number(phOpt) && Number(phOpt) <= Number(phMax))) {
        throw new Error(`${rowLabel}: ph_min <= ph_opt <= ph_max violated`);
      }
      const minZone = parseSmallint(row.min_zone, "min_zone", rowLabel);
      const maxZone = parseSmallint(row.max_zone, "max_zone", rowLabel);
      if (minZone > maxZone) {
        throw new Error(`${rowLabel}: min_zone > max_zone`);
      }

      const values = {
        commonName: row.common_name,
        scientificName: row.scientific_name,
        type,
        guildLayer,
        functions: splitList(row.functions),
        edibleParts: splitList(row.edible_parts),
        sun,
        waterMin,
        waterOpt,
        waterMax,
        phMin,
        phOpt,
        phMax,
        minZone,
        maxZone,
        matureHeightCm: parseOptionalSmallint(row.mature_height_cm, "mature_height_cm", rowLabel),
        spreadCm: parseOptionalSmallint(row.spread_cm, "spread_cm", rowLabel),
        rootDepthCm: parseOptionalSmallint(row.root_depth_cm, "root_depth_cm", rowLabel),
        notes: row.notes || null,
        recommendable: parseBoolean(row.recommendable, "recommendable", rowLabel),
      };

      const [inserted] = await db
        .insert(plants)
        .values(values)
        .onConflictDoUpdate({ target: plants.scientificName, set: values })
        .returning({ id: plants.id });

      idByScientificName.set(row.scientific_name, inserted.id);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length) {
    throw new Error(`Failed to seed plants:\n${errors.join("\n")}`);
  }
  console.log(`Seeded ${idByScientificName.size} plants.`);
  return idByScientificName;
}

async function seedSources(): Promise<Map<string, string>> {
  const rows = readCsv("sources.csv");
  const errors: string[] = [];
  const idBySourceKey = new Map<string, string>();

  for (const row of rows) {
    const rowLabel = `sources.csv: ${row.source_key}`;
    try {
      const sourceType = assertEnum(
        row.source_type,
        sourceTypeEnum.enumValues,
        "source_type",
        rowLabel,
      );
      const values = {
        title: row.title,
        publisher: row.publisher || null,
        url: row.url || null,
        sourceType,
        year: parseOptionalSmallint(row.year, "year", rowLabel),
      };

      const existing = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.title, values.title))
        .limit(1);

      let id: string;
      if (existing.length) {
        id = existing[0].id;
        await db.update(sources).set(values).where(eq(sources.id, id));
      } else {
        const [inserted] = await db.insert(sources).values(values).returning({ id: sources.id });
        id = inserted.id;
      }
      idBySourceKey.set(row.source_key, id);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length) {
    throw new Error(`Failed to seed sources:\n${errors.join("\n")}`);
  }
  console.log(`Seeded ${idBySourceKey.size} sources.`);
  return idBySourceKey;
}

async function seedRelationships(
  plantIds: Map<string, string>,
): Promise<Map<string, string>> {
  const rows = readCsv("relationships.csv");
  const errors: string[] = [];
  const idByRelKey = new Map<string, string>();

  for (const row of rows) {
    const rowLabel = `relationships.csv: ${row.rel_key}`;
    try {
      const plantAId = plantIds.get(row.plant_a);
      const plantBId = plantIds.get(row.plant_b);
      if (!plantAId) throw new Error(`${rowLabel}: unknown plant_a "${row.plant_a}"`);
      if (!plantBId) throw new Error(`${rowLabel}: unknown plant_b "${row.plant_b}"`);

      const relationType = assertEnum(
        row.relation_type,
        relationTypeEnum.enumValues,
        "relation_type",
        rowLabel,
      );
      let directionality = assertEnum(
        row.directionality,
        directionalityEnum.enumValues,
        "directionality",
        rowLabel,
      );
      const mechanism = row.mechanism
        ? assertEnum(row.mechanism, mechanismEnum.enumValues, "mechanism", rowLabel)
        : null;
      const evidenceTier = assertEnum(
        row.evidence_tier,
        evidenceTierEnum.enumValues,
        "evidence_tier",
        rowLabel,
      );

      // Canonical ordering is by UUID, not CSV order — swap and flip
      // directionality (a_helps_b <-> b_helps_a etc.) if needed.
      let [canonicalAId, canonicalBId] = [plantAId, plantBId];
      if (canonicalAId > canonicalBId) {
        [canonicalAId, canonicalBId] = [canonicalBId, canonicalAId];
        directionality = directionalityFlip[directionality] as typeof directionality;
      }

      const values = {
        plantAId: canonicalAId,
        plantBId: canonicalBId,
        relationType,
        directionality,
        mechanism,
        evidenceTier,
        summary: row.summary,
      };

      const [inserted] = await db
        .insert(relationships)
        .values(values)
        .onConflictDoUpdate({
          target: [relationships.plantAId, relationships.plantBId],
          set: values,
        })
        .returning({ id: relationships.id });

      idByRelKey.set(row.rel_key, inserted.id);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length) {
    throw new Error(`Failed to seed relationships:\n${errors.join("\n")}`);
  }
  console.log(`Seeded ${idByRelKey.size} relationships.`);
  return idByRelKey;
}

async function seedRelationshipSources(
  relIds: Map<string, string>,
  sourceIds: Map<string, string>,
): Promise<void> {
  const rows = readCsv("relationship_sources.csv");
  const errors: string[] = [];
  const relKeysWithSource = new Set<string>();

  for (const row of rows) {
    const rowLabel = `relationship_sources.csv: ${row.rel_key} / ${row.source_key}`;
    try {
      const relationshipId = relIds.get(row.rel_key);
      const sourceId = sourceIds.get(row.source_key);
      if (!relationshipId) throw new Error(`${rowLabel}: unknown rel_key "${row.rel_key}"`);
      if (!sourceId) throw new Error(`${rowLabel}: unknown source_key "${row.source_key}"`);

      await db
        .insert(relationshipSources)
        .values({ relationshipId, sourceId })
        .onConflictDoNothing({
          target: [relationshipSources.relationshipId, relationshipSources.sourceId],
        });

      relKeysWithSource.add(row.rel_key);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  // Every relationship needs >=1 source (note 12 §C).
  for (const relKey of relIds.keys()) {
    if (!relKeysWithSource.has(relKey)) {
      errors.push(`relationships.csv: "${relKey}" has no rows in relationship_sources.csv`);
    }
  }

  if (errors.length) {
    throw new Error(`Failed to seed relationship_sources:\n${errors.join("\n")}`);
  }
  console.log(`Seeded ${rows.length} relationship_sources links.`);
}

async function main() {
  const plantIds = await seedPlants();
  const sourceIds = await seedSources();
  const relIds = await seedRelationships(plantIds);
  await seedRelationshipSources(relIds, sourceIds);
  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
