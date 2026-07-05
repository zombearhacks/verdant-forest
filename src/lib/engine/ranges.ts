export interface Range {
  min: number;
  max: number;
}

// Standard interval overlap: touching endpoints count as overlapping.
export function rangesOverlap(a: Range, b: Range): boolean {
  return a.min <= b.max && b.min <= a.max;
}
