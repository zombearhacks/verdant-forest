import type { FunctionalVerdict } from "./functional-score";
import type { EvidenceTier, RelationType } from "./types";

export type PairingVerdictLabel = "good pairing" | "keep apart" | "neutral" | "unknown";
export type ConfidenceLabel =
  | "strong evidence"
  | "solid evidence"
  | "traditional, unverified"
  | "folklore, unsupported";

export interface PairingCard {
  verdict: PairingVerdictLabel;
  confidence: ConfidenceLabel | null;
  summary: string | null;
  // A/B shown by default, C/D behind a toggle (decisions #10, #19).
  defaultVisible: boolean;
}

const VERDICT_LABEL: Record<RelationType, PairingVerdictLabel> = {
  beneficial: "good pairing",
  antagonistic: "keep apart",
  neutral: "neutral",
};

const CONFIDENCE_LABEL: Record<EvidenceTier, ConfidenceLabel> = {
  A: "strong evidence",
  B: "solid evidence",
  C: "traditional, unverified",
  D: "folklore, unsupported",
};

// Never a made-up magnitude (decision A2): verdict comes straight from
// relation_type, confidence straight from evidence_tier, kept as two
// separate badges rather than folded into one number.
export function pairingCard(functional: FunctionalVerdict | null): PairingCard {
  if (!functional) {
    return { verdict: "unknown", confidence: null, summary: null, defaultVisible: true };
  }
  return {
    verdict: VERDICT_LABEL[functional.relationType],
    confidence: CONFIDENCE_LABEL[functional.evidenceTier],
    summary: functional.summary,
    defaultVisible: functional.evidenceTier === "A" || functional.evidenceTier === "B",
  };
}
