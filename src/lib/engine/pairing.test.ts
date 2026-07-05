import { describe, expect, it } from "vitest";
import { pairingCard } from "./pairing";
import type { FunctionalVerdict } from "./functional-score";

describe("pairingCard", () => {
  it("returns 'unknown' with no confidence when no relationship exists", () => {
    expect(pairingCard(null)).toEqual({
      verdict: "unknown",
      confidence: null,
      summary: null,
      defaultVisible: true,
    });
  });

  it("maps a beneficial, tier-B relationship to a good pairing with solid evidence", () => {
    const functional: FunctionalVerdict = {
      relationType: "beneficial",
      evidenceTier: "B",
      summary: "Beans fix nitrogen for corn.",
      excludeHard: false,
    };
    expect(pairingCard(functional)).toEqual({
      verdict: "good pairing",
      confidence: "solid evidence",
      summary: "Beans fix nitrogen for corn.",
      defaultVisible: true,
    });
  });

  it("maps an antagonistic, tier-A relationship to keep apart with strong evidence", () => {
    const functional: FunctionalVerdict = {
      relationType: "antagonistic",
      evidenceTier: "A",
      summary: "Juglone harms tomato.",
      excludeHard: true,
    };
    expect(pairingCard(functional).verdict).toBe("keep apart");
    expect(pairingCard(functional).confidence).toBe("strong evidence");
  });

  it("marks tier-D folklore as not default-visible", () => {
    const functional: FunctionalVerdict = {
      relationType: "antagonistic",
      evidenceTier: "D",
      summary: "Widely repeated but unsupported claim.",
      excludeHard: true,
    };
    expect(pairingCard(functional).defaultVisible).toBe(false);
    expect(pairingCard(functional).confidence).toBe("folklore, unsupported");
  });

  it("marks tier-C as not default-visible", () => {
    const functional: FunctionalVerdict = {
      relationType: "beneficial",
      evidenceTier: "C",
      summary: "Plausible but untested.",
      excludeHard: false,
    };
    expect(pairingCard(functional).defaultVisible).toBe(false);
  });
});
