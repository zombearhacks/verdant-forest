import { describe, expect, it } from "vitest";
import { buildGuild } from "./guild-builder";
import type { EnginePlant, EngineRelationship } from "./types";

function plant(overrides: Partial<EnginePlant> & { id: string }): EnginePlant {
  return {
    commonName: overrides.id,
    scientificName: overrides.id,
    sun: "full",
    waterMin: "medium",
    waterOpt: "medium",
    waterMax: "medium",
    phMin: 6.0,
    phOpt: 6.5,
    phMax: 7.0,
    minZone: 3,
    maxZone: 9,
    guildLayer: null,
    rootDepthCm: null,
    matureHeightCm: null,
    ...overrides,
  };
}

describe("buildGuild", () => {
  it("fills empty layers with real Apple/clover/comfrey stub data", () => {
    const apple = plant({
      id: "apple",
      commonName: "Apple",
      guildLayer: "canopy",
      matureHeightCm: 400,
      phMin: 6.0,
      phMax: 7.0,
    });
    const clover = plant({
      id: "clover",
      commonName: "White clover",
      guildLayer: "groundcover",
      sun: "adaptable",
      waterMax: "wet",
      phMin: 6.0,
      phMax: 7.0,
    });
    const comfrey = plant({
      id: "comfrey",
      commonName: "Comfrey",
      guildLayer: "herbaceous",
      sun: "adaptable",
      waterMax: "wet",
      phMin: 6.0,
      phMax: 7.5,
    });
    const relationships: EngineRelationship[] = [
      {
        plantAId: "apple",
        plantBId: "clover",
        relationType: "beneficial",
        evidenceTier: "B",
        summary: "White clover fixes nitrogen and suppresses weeds beneath apple.",
      },
      {
        plantAId: "apple",
        plantBId: "comfrey",
        relationType: "beneficial",
        evidenceTier: "C",
        summary: "Comfrey chop-and-drop mulch under fruit trees.",
      },
    ];

    const result = buildGuild(apple, [clover, comfrey], relationships);
    const names = result.members.map((m) => m.plant.commonName);
    expect(names).toEqual(["Apple", "Comfrey", "White clover"]);
    expect(result.members[1].reasons[0]).toContain("beneficial");
  });

  it("hard-excludes an antagonist even when it's the only candidate for a layer", () => {
    const anchor = plant({ id: "anchor", guildLayer: "canopy" });
    const antagonist = plant({ id: "antagonist", guildLayer: "root" });
    const relationships: EngineRelationship[] = [
      {
        plantAId: "anchor",
        plantBId: "antagonist",
        relationType: "antagonistic",
        evidenceTier: "A",
        summary: "Roots release a compound toxic to the anchor.",
      },
    ];

    const result = buildGuild(anchor, [antagonist], relationships);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].plant.id).toBe("anchor");
  });

  it("applies the shade rule: prefers shade-tolerant candidates under a tall anchor", () => {
    const tallAnchor = plant({ id: "anchor", guildLayer: "canopy", matureHeightCm: 400 });
    const sunny = plant({ id: "sunny", guildLayer: "herbaceous", sun: "full" });
    const shady = plant({ id: "shady", guildLayer: "herbaceous", sun: "shade" });

    const result = buildGuild(tallAnchor, [sunny, shady], []);
    expect(result.members).toHaveLength(2);
    expect(result.members[1].plant.id).toBe("shady");
  });

  it("does not apply the shade rule when the anchor is too short to cast real shade", () => {
    const shortAnchor = plant({ id: "anchor", guildLayer: "canopy", matureHeightCm: 50 });
    const sunny = plant({ id: "sunny", guildLayer: "herbaceous", sun: "full" });
    const shady = plant({ id: "shady", guildLayer: "herbaceous", sun: "shade" });

    // Neither has a documented relationship or a co-habitability edge (identical
    // ranges), so without the shade rule the first candidate in input order wins.
    const result = buildGuild(shortAnchor, [sunny, shady], []);
    expect(result.members[1].plant.id).toBe("sunny");
  });

  it("leaves a layer empty when every candidate fails the hard filter, but keeps filling others", () => {
    const anchor = plant({ id: "anchor", guildLayer: "canopy", phMin: 6.0, phMax: 7.0 });
    const incompatible = plant({
      id: "incompatible",
      guildLayer: "shrub",
      phMin: 4.0,
      phMax: 4.5,
    });
    const compatible = plant({
      id: "compatible",
      guildLayer: "herbaceous",
      phMin: 6.0,
      phMax: 7.0,
    });

    const result = buildGuild(anchor, [incompatible, compatible], []);
    const ids = result.members.map((m) => m.plant.id);
    expect(ids).toEqual(["anchor", "compatible"]);
  });
});
