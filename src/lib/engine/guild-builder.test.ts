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
    recommendable: true,
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

    const result = buildGuild([apple], [clover, comfrey], relationships);
    const names = result.members.map((m) => m.plant.commonName);
    expect(names).toEqual(["Apple", "Comfrey", "White clover"]);
    expect(result.members[1].reasons[0].text).toContain("beneficial");
    // Comfrey's relationship to apple is C-tier -> traditional badge.
    expect(result.members[1].reasons[0].isTraditional).toBe(true);
    // Clover's relationship to apple is B-tier -> not traditional.
    expect(result.members[2].reasons[0].isTraditional).toBe(false);
  });

  it("ranks a C-tier beneficial candidate above a D-tier one (traditional beats folklore)", () => {
    const anchor = plant({ id: "anchor", guildLayer: "canopy" });
    const cTier = plant({ id: "c-tier", guildLayer: "herbaceous" });
    const dTier = plant({ id: "d-tier", guildLayer: "shrub" });

    const relationships: EngineRelationship[] = [
      {
        plantAId: "anchor",
        plantBId: "c-tier",
        relationType: "beneficial",
        evidenceTier: "C",
        summary: "Traditional permaculture pairing.",
      },
      {
        plantAId: "anchor",
        plantBId: "d-tier",
        relationType: "beneficial",
        evidenceTier: "D",
        summary: "Unsourced folklore pairing.",
      },
    ];

    const result = buildGuild([anchor], [cTier, dTier], relationships);
    const cMember = result.members.find((m) => m.plant.id === "c-tier");
    const dMember = result.members.find((m) => m.plant.id === "d-tier");
    // Both get added (different layers, no conflict) but only C is flagged traditional.
    expect(cMember?.reasons[0].isTraditional).toBe(true);
    expect(dMember?.reasons[0].isTraditional).toBe(false);
  });

  it("picks a C-tier candidate over a D-tier one competing for the same layer", () => {
    const anchor = plant({ id: "anchor", guildLayer: "canopy" });
    const cTier = plant({ id: "c-tier", guildLayer: "herbaceous" });
    const dTier = plant({ id: "d-tier", guildLayer: "herbaceous" });

    const relationships: EngineRelationship[] = [
      {
        plantAId: "anchor",
        plantBId: "c-tier",
        relationType: "beneficial",
        evidenceTier: "C",
        summary: "Traditional permaculture pairing.",
      },
      {
        plantAId: "anchor",
        plantBId: "d-tier",
        relationType: "beneficial",
        evidenceTier: "D",
        summary: "Unsourced folklore pairing.",
      },
    ];

    const result = buildGuild([anchor], [cTier, dTier], relationships);
    expect(result.members).toHaveLength(2);
    expect(result.members[1].plant.id).toBe("c-tier");
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

    const result = buildGuild([anchor], [antagonist], relationships);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].plant.id).toBe("anchor");
  });

  it("never auto-fills a site feature (recommendable=false), even as the best-ranked candidate", () => {
    const anchor = plant({ id: "anchor", guildLayer: "shrub" });
    const siteFeature = plant({
      id: "oak",
      commonName: "White oak",
      guildLayer: "canopy",
      recommendable: false,
    });
    const relationships: EngineRelationship[] = [
      {
        plantAId: "anchor",
        plantBId: "oak",
        relationType: "beneficial",
        evidenceTier: "A",
        summary: "Strongest possible relationship, but oak is a site feature.",
      },
    ];

    const result = buildGuild([anchor], [siteFeature], relationships);
    expect(result.members).toHaveLength(1);
  });

  it("allows a site feature (recommendable=false) as the anchor itself", () => {
    const oakAnchor = plant({
      id: "oak",
      commonName: "White oak",
      guildLayer: "canopy",
      recommendable: false,
    });
    const pawpaw = plant({ id: "pawpaw", guildLayer: "understory" });

    const result = buildGuild([oakAnchor], [pawpaw], []);
    expect(result.members).toHaveLength(2);
    expect(result.members[0].plant.id).toBe("oak");
    expect(result.members[1].plant.id).toBe("pawpaw");
  });

  it("applies the shade rule: prefers shade-tolerant candidates under a tall anchor", () => {
    const tallAnchor = plant({ id: "anchor", guildLayer: "canopy", matureHeightCm: 400 });
    const sunny = plant({ id: "sunny", guildLayer: "herbaceous", sun: "full" });
    const shady = plant({ id: "shady", guildLayer: "herbaceous", sun: "shade" });

    const result = buildGuild([tallAnchor], [sunny, shady], []);
    expect(result.members).toHaveLength(2);
    expect(result.members[1].plant.id).toBe("shady");
  });

  it("does not apply the shade rule when the anchor is too short to cast real shade", () => {
    const shortAnchor = plant({ id: "anchor", guildLayer: "canopy", matureHeightCm: 50 });
    const sunny = plant({ id: "sunny", guildLayer: "herbaceous", sun: "full" });
    const shady = plant({ id: "shady", guildLayer: "herbaceous", sun: "shade" });

    // Neither has a documented relationship or a co-habitability edge (identical
    // ranges), so without the shade rule the first candidate in input order wins.
    const result = buildGuild([shortAnchor], [sunny, shady], []);
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

    const result = buildGuild([anchor], [incompatible, compatible], []);
    const ids = result.members.map((m) => m.plant.id);
    expect(ids).toEqual(["anchor", "compatible"]);
  });

  it("accepts multiple declared-present plants and fills remaining layers around all of them", () => {
    const oak = plant({
      id: "oak",
      commonName: "White oak",
      guildLayer: "canopy",
      recommendable: false,
      matureHeightCm: 2500,
    });
    const apple = plant({ id: "apple", commonName: "Apple", guildLayer: "understory" });
    const pawpaw = plant({ id: "pawpaw", guildLayer: "shrub", sun: "shade" });

    const result = buildGuild([oak, apple], [pawpaw], []);
    const ids = result.members.map((m) => m.plant.id);
    expect(ids).toEqual(["oak", "apple", "pawpaw"]);
  });

  it("shade rule triggers from any declared-present plant, not just the first", () => {
    const smallAnchor = plant({ id: "anchor", guildLayer: "understory", matureHeightCm: 50 });
    const tallExisting = plant({
      id: "oak",
      guildLayer: "canopy",
      recommendable: false,
      matureHeightCm: 2500,
    });
    const sunny = plant({ id: "sunny", guildLayer: "herbaceous", sun: "full" });
    const shady = plant({ id: "shady", guildLayer: "herbaceous", sun: "shade" });

    const result = buildGuild([smallAnchor, tallExisting], [sunny, shady], []);
    expect(result.members.find((m) => m.plant.guildLayer === "herbaceous")?.plant.id).toBe(
      "shady",
    );
  });

  it("surfaces a conflict between two declared-present plants instead of dropping either", () => {
    const cedar = plant({ id: "cedar", commonName: "Eastern red cedar", guildLayer: "canopy" });
    const appleExisting = plant({ id: "apple", commonName: "Apple", guildLayer: "understory" });
    const relationships: EngineRelationship[] = [
      {
        plantAId: "cedar",
        plantBId: "apple",
        relationType: "antagonistic",
        evidenceTier: "B",
        summary: "Cedar-apple rust: cedar is an alternate host.",
      },
    ];

    const result = buildGuild([cedar, appleExisting], [], relationships);
    // Both plants stay in the guild — the user already has both.
    expect(result.members.map((m) => m.plant.id)).toEqual(["cedar", "apple"]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].summary).toContain("rust");
  });

  it("reports no conflicts when declared-present plants get along", () => {
    const apple = plant({ id: "apple", guildLayer: "canopy" });
    const clover = plant({ id: "clover", guildLayer: "groundcover" });
    const result = buildGuild([apple, clover], [], []);
    expect(result.conflicts).toEqual([]);
  });
});
