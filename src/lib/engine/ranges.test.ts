import { describe, expect, it } from "vitest";
import { rangesOverlap } from "./ranges";

describe("rangesOverlap", () => {
  it("is true when ranges overlap", () => {
    expect(rangesOverlap({ min: 6.0, max: 6.8 }, { min: 6.0, max: 7.5 })).toBe(true);
  });

  it("is true when ranges only touch at an endpoint", () => {
    expect(rangesOverlap({ min: 0, max: 1 }, { min: 1, max: 2 })).toBe(true);
  });

  it("is false when ranges are disjoint", () => {
    expect(rangesOverlap({ min: 4.5, max: 5.5 }, { min: 6.0, max: 7.0 })).toBe(false);
  });

  it("is true when one range fully contains the other", () => {
    expect(rangesOverlap({ min: 0, max: 10 }, { min: 4, max: 6 })).toBe(true);
  });
});
