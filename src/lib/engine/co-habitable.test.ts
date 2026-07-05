import { describe, expect, it } from "vitest";
import { coHabitable } from "./co-habitable";

describe("coHabitable", () => {
  const base = {
    sun: "full" as const,
    waterMin: "medium" as const,
    waterMax: "wet" as const,
    phMin: 6.0,
    phMax: 7.0,
  };

  it("is true when sun/water/pH all overlap", () => {
    expect(coHabitable(base, { ...base, phMin: 6.5, phMax: 7.5 })).toBe(true);
  });

  it("is false when pH ranges don't overlap (e.g. blueberry vs onion)", () => {
    const blueberry = { ...base, phMin: 4.5, phMax: 5.5 };
    const onion = { ...base, phMin: 6.0, phMax: 7.0 };
    expect(coHabitable(blueberry, onion)).toBe(false);
  });

  it("is false when water ranges don't overlap", () => {
    const dryLover = { ...base, waterMin: "dry" as const, waterMax: "dry" as const };
    const wetLover = { ...base, waterMin: "wet" as const, waterMax: "wet" as const };
    expect(coHabitable(dryLover, wetLover)).toBe(false);
  });

  it("is false when sun requirements conflict", () => {
    const fullSun = { ...base, sun: "full" as const };
    const shade = { ...base, sun: "shade" as const };
    expect(coHabitable(fullSun, shade)).toBe(false);
  });

  it("treats 'adaptable' sun as compatible with anything", () => {
    const adaptable = { ...base, sun: "adaptable" as const };
    const shade = { ...base, sun: "shade" as const };
    expect(coHabitable(adaptable, shade)).toBe(true);
  });
});
