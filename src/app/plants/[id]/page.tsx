import { eq, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { plants, relationships, relationshipSources, sources } from "@/lib/db/schema";
import { pairingCard } from "@/lib/engine/pairing";
import { CompatibilityList } from "./compatibility-list";

// Same reasoning as the plant browser: reflect the live DB, not a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [plant] = await db.select().from(plants).where(eq(plants.id, id));
  if (!plant) notFound();

  const rels = await db
    .select()
    .from(relationships)
    .where(or(eq(relationships.plantAId, id), eq(relationships.plantBId, id)));

  const otherIds = rels.map((rel) => (rel.plantAId === id ? rel.plantBId : rel.plantAId));
  const others = otherIds.length
    ? await db.select().from(plants).where(inArray(plants.id, otherIds))
    : [];
  const otherById = new Map(others.map((p) => [p.id, p]));

  const relIds = rels.map((rel) => rel.id);
  const sourceRows = relIds.length
    ? await db
        .select({
          relationshipId: relationshipSources.relationshipId,
          title: sources.title,
          url: sources.url,
        })
        .from(relationshipSources)
        .innerJoin(sources, eq(relationshipSources.sourceId, sources.id))
        .where(inArray(relationshipSources.relationshipId, relIds))
    : [];
  const sourcesByRelId = new Map<string, { title: string; url: string | null }[]>();
  for (const row of sourceRows) {
    const list = sourcesByRelId.get(row.relationshipId) ?? [];
    list.push({ title: row.title, url: row.url });
    sourcesByRelId.set(row.relationshipId, list);
  }

  const cards = rels.map((rel) => {
    const otherId = rel.plantAId === id ? rel.plantBId : rel.plantAId;
    const other = otherById.get(otherId)!;
    const card = pairingCard({
      relationType: rel.relationType,
      evidenceTier: rel.evidenceTier,
      summary: rel.summary,
      excludeHard: rel.relationType === "antagonistic",
    });
    return {
      ...card,
      otherPlantId: other.id,
      otherCommonName: other.commonName,
      otherScientificName: other.scientificName,
      sources: sourcesByRelId.get(rel.id) ?? [],
    };
  });

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <Link href="/">← All plants</Link>
      </p>
      <h1>{plant.commonName}</h1>
      <p>
        <em>{plant.scientificName}</em> · {plant.type} · zone {plant.minZone}–
        {plant.maxZone}
      </p>
      <CompatibilityList cards={cards} />
    </main>
  );
}
