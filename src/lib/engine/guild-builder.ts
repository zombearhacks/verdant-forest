import { functionalScore } from "./functional-score";
import { nicheScore } from "./niche-score";
import { rangesOverlap } from "./ranges";
import type { EnginePlant, EngineRelationship, EvidenceTier, GuildLayer } from "./types";

const LAYER_ORDER: GuildLayer[] = [
  "canopy",
  "understory",
  "shrub",
  "herbaceous",
  "groundcover",
  "root",
  "vine",
];

// Height at which an anchor plant casts real shade on the layers beneath it
// (roughly small-tree/large-shrub scale) — used by the shade rule below.
const SHADE_CASTING_HEIGHT_CM = 300;

const WATER_ORDER: Record<EnginePlant["waterMin"], number> = {
  dry: 0,
  medium: 1,
  wet: 2,
};

// Cross-layer hard filter for guild membership: soil (pH/water) only, not
// sun. coHabitable's sun check assumes both plants share the same ambient
// light, which holds for two plants in the same layer/bed but not across
// a guild's vertical strata — a full-sun canopy tree and a shade-tolerant
// understory plant growing in its shadow are the guild working as intended,
// not a conflict. Sun is handled below as the shade-rule preference instead.
function soilCompatible(a: EnginePlant, b: EnginePlant): boolean {
  const waterA = { min: WATER_ORDER[a.waterMin], max: WATER_ORDER[a.waterMax] };
  const waterB = { min: WATER_ORDER[b.waterMin], max: WATER_ORDER[b.waterMax] };
  return (
    rangesOverlap(waterA, waterB) &&
    rangesOverlap({ min: a.phMin, max: a.phMax }, { min: b.phMin, max: b.phMax })
  );
}

function overlapRatio(min: number, max: number, oMin: number, oMax: number): number {
  const overlapLen = Math.min(max, oMax) - Math.max(min, oMin);
  const unionLen = Math.max(max, oMax) - Math.min(min, oMin);
  if (unionLen <= 0) return 1;
  return Math.max(0, overlapLen) / unionLen;
}

// A real, measured soil-overlap strength (0-1), not a fabricated magnitude —
// average of pH and water range overlap ratios. Used only to rank
// candidates that already passed the soilCompatible hard filter (decision
// A2: "derive it only from co-habitability overlap").
function soilOverlapStrength(a: EnginePlant, b: EnginePlant): number {
  const ph = overlapRatio(a.phMin, a.phMax, b.phMin, b.phMax);
  const water = overlapRatio(
    WATER_ORDER[a.waterMin],
    WATER_ORDER[a.waterMax],
    WATER_ORDER[b.waterMin],
    WATER_ORDER[b.waterMax],
  );
  return (ph + water) / 2;
}

export interface GuildReason {
  text: string;
  evidenceTier: EvidenceTier | null; // null = no documented relationship
  // Guild builder shows A/B/C by default (C carries this badge); D-tier
  // positives don't get a ranking boost, matching "D opt-in" from the
  // picker, translated to this context (decision #27).
  isTraditional: boolean;
}

export interface GuildMember {
  plant: EnginePlant;
  reasons: GuildReason[];
}

export interface GuildResult {
  members: GuildMember[];
}

// Greedy layer-fill: anchor plant, then for each empty layer (canopy ->
// vine) pick the candidate with the best combined score against everyone
// already in the guild. "Best" is a tier bucket from known relationships
// (evidence tier ranks/gates, never folds into a magnitude — decision A2),
// then the shade rule, then real soil-overlap strength as the tie-break.
// A layer with no candidate that clears the hard filters is left empty;
// the loop still tries the remaining layers (decision logged: a guild with
// gaps is more useful than stopping dead on the first empty layer).
export function buildGuild(
  anchor: EnginePlant,
  candidates: EnginePlant[],
  relationships: EngineRelationship[],
): GuildResult {
  const members: GuildMember[] = [{ plant: anchor, reasons: [] }];
  const filledLayers = new Set<GuildLayer>();
  if (anchor.guildLayer) filledLayers.add(anchor.guildLayer);

  const anchorCastsShade = (anchor.matureHeightCm ?? 0) >= SHADE_CASTING_HEIGHT_CM;

  for (const layer of LAYER_ORDER) {
    if (filledLayers.has(layer)) continue;

    // Greedy fill only ever proposes plants you'd plant, never site
    // features (decision #28) — those can only enter a guild as a
    // user-declared anchor/existing occupant, not an auto-added candidate.
    const layerCandidates = candidates.filter(
      (candidate) =>
        candidate.recommendable &&
        candidate.guildLayer === layer &&
        candidate.id !== anchor.id,
    );

    const scored: {
      plant: EnginePlant;
      tier: number;
      shadeTolerant: boolean;
      overlapStrength: number;
      reasons: GuildReason[];
    }[] = [];

    for (const candidate of layerCandidates) {
      let hardExcluded = false;
      let bestTier = 0;
      let overlapSum = 0;
      const reasons: GuildReason[] = [];

      for (const member of members) {
        if (!soilCompatible(candidate, member.plant)) {
          hardExcluded = true;
          break;
        }
        const functional = functionalScore(candidate.id, member.plant.id, relationships);
        if (functional?.excludeHard) {
          hardExcluded = true;
          break;
        }
        if (functional) {
          const isTraditional = functional.evidenceTier === "C";
          reasons.push({
            text: `${functional.relationType} with ${member.plant.commonName} (${functional.evidenceTier}-tier): ${functional.summary}`,
            evidenceTier: functional.evidenceTier,
            isTraditional,
          });
          const tier =
            functional.relationType !== "beneficial"
              ? 0
              : functional.evidenceTier === "A" || functional.evidenceTier === "B"
                ? 2
                : functional.evidenceTier === "C"
                  ? 1
                  : 0; // D-tier positives: no ranking boost, same as unknown
          bestTier = Math.max(bestTier, tier);
        } else {
          const niche = nicheScore(candidate, member.plant);
          reasons.push({
            text:
              `No documented relationship with ${member.plant.commonName}; compatible soil (pH/water) and ` +
              `${niche.layerDiffers ? "different" : "same"} guild layer.`,
            evidenceTier: null,
            isTraditional: false,
          });
        }
        overlapSum += soilOverlapStrength(candidate, member.plant);
      }

      if (hardExcluded) continue;

      scored.push({
        plant: candidate,
        tier: bestTier,
        shadeTolerant: candidate.sun !== "full",
        overlapStrength: overlapSum / members.length,
        reasons,
      });
    }

    if (scored.length === 0) continue;

    scored.sort((a, b) => {
      if (a.tier !== b.tier) return b.tier - a.tier;
      if (anchorCastsShade && layer !== "canopy" && a.shadeTolerant !== b.shadeTolerant) {
        return a.shadeTolerant ? -1 : 1;
      }
      return b.overlapStrength - a.overlapStrength;
    });

    const winner = scored[0];
    members.push({ plant: winner.plant, reasons: winner.reasons });
    filledLayers.add(layer);
  }

  return { members };
}
