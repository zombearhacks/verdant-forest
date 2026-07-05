import { describe, expect, it } from "vitest";
import { nicheScore } from "./niche-score";

describe("nicheScore", () => {
  it("flags differing layers as niche complement", () => {
    const result = nicheScore(
      { guildLayer: "canopy", rootDepthCm: null },
      { guildLayer: "herbaceous", rootDepthCm: null },
    );
    expect(result.layerDiffers).toBe(true);
  });

  it("flags same layer as competing, not complementary", () => {
    const result = nicheScore(
      { guildLayer: "herbaceous", rootDepthCm: null },
      { guildLayer: "herbaceous", rootDepthCm: null },
    );
    expect(result.layerDiffers).toBe(false);
  });

  it("treats null guild_layer as unknown, not different", () => {
    const result = nicheScore(
      { guildLayer: null, rootDepthCm: null },
      { guildLayer: "herbaceous", rootDepthCm: null },
    );
    expect(result.layerDiffers).toBe(false);
  });

  it("computes the real root depth difference in cm", () => {
    const result = nicheScore(
      { guildLayer: null, rootDepthCm: 500 },
      { guildLayer: null, rootDepthCm: 90 },
    );
    expect(result.rootDepthDiffCm).toBe(410);
  });

  it("returns null root depth diff when either plant's depth is unknown", () => {
    const result = nicheScore(
      { guildLayer: null, rootDepthCm: null },
      { guildLayer: null, rootDepthCm: 90 },
    );
    expect(result.rootDepthDiffCm).toBeNull();
  });
});
