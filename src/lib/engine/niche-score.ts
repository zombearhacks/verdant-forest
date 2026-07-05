import type { EnginePlant } from "./types";

export interface NicheComplement {
  layerDiffers: boolean;
  rootDepthDiffCm: number | null;
}

type NichePlant = Pick<EnginePlant, "guildLayer" | "rootDepthCm">;

// Not a hard filter — a breakdown of real, measured signals for niche
// complement (different layer / different root depth = less competition).
// No invented magnitude: callers decide how to weigh these facts.
export function nicheScore(a: NichePlant, b: NichePlant): NicheComplement {
  const layerDiffers =
    a.guildLayer !== null && b.guildLayer !== null && a.guildLayer !== b.guildLayer;
  const rootDepthDiffCm =
    a.rootDepthCm !== null && b.rootDepthCm !== null
      ? Math.abs(a.rootDepthCm - b.rootDepthCm)
      : null;
  return { layerDiffers, rootDepthDiffCm };
}
