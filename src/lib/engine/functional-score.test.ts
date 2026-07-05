import { describe, expect, it } from "vitest";
import { functionalScore } from "./functional-score";
import type { EngineRelationship } from "./types";

describe("functionalScore", () => {
  const beanCorn: EngineRelationship = {
    plantAId: "bean",
    plantBId: "corn",
    relationType: "beneficial",
    evidenceTier: "B",
    summary: "Beans fix nitrogen; corn is a trellis.",
  };
  const tomatoWalnut: EngineRelationship = {
    plantAId: "tomato",
    plantBId: "walnut",
    relationType: "antagonistic",
    evidenceTier: "A",
    summary: "Juglone from walnut roots harms tomato.",
  };
  const relationships = [beanCorn, tomatoWalnut];

  it("finds a relationship regardless of query order vs stored order", () => {
    expect(functionalScore("corn", "bean", relationships)?.summary).toBe(
      beanCorn.summary,
    );
    expect(functionalScore("bean", "corn", relationships)?.summary).toBe(
      beanCorn.summary,
    );
  });

  it("returns null when no relationship is known", () => {
    expect(functionalScore("bean", "walnut", relationships)).toBeNull();
  });

  it("hard-excludes antagonistic pairs", () => {
    expect(functionalScore("tomato", "walnut", relationships)?.excludeHard).toBe(true);
  });

  it("does not exclude beneficial pairs", () => {
    expect(functionalScore("bean", "corn", relationships)?.excludeHard).toBe(false);
  });
});
