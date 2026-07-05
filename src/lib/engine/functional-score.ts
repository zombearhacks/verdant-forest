import type { EngineRelationship, EvidenceTier, RelationType } from "./types";

export interface FunctionalVerdict {
  relationType: RelationType;
  evidenceTier: EvidenceTier;
  summary: string;
  // Antagonistic pairs are hard-excluded from pairing/guild candidates.
  excludeHard: boolean;
}

// Applies the known relationship for this pair, if any — relationships are
// stored once per canonical pair, so the caller's plant order doesn't matter.
export function functionalScore(
  plantAId: string,
  plantBId: string,
  relationships: EngineRelationship[],
): FunctionalVerdict | null {
  const relationship = relationships.find(
    (rel) =>
      (rel.plantAId === plantAId && rel.plantBId === plantBId) ||
      (rel.plantAId === plantBId && rel.plantBId === plantAId),
  );
  if (!relationship) return null;

  return {
    relationType: relationship.relationType,
    evidenceTier: relationship.evidenceTier,
    summary: relationship.summary,
    excludeHard: relationship.relationType === "antagonistic",
  };
}
