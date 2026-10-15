// Inside carton size from what goes in it: blisters standing on their long
// edge, stacked face to face, with the folded leaflet against the front.

export interface ContentsInput {
  blisterLength: number;
  blisterWidth: number;
  blisterThickness: number;
  blisterCount: number;
  leafletLength: number;
  leafletWidth: number;
  leafletThickness: number;
  /** Extra room per dimension so the contents slide in. */
  clearL: number;
  clearW: number;
  clearH: number;
}

export const DEFAULT_CONTENTS: ContentsInput = {
  blisterLength: 95,
  blisterWidth: 50,
  blisterThickness: 4.5,
  blisterCount: 2,
  leafletLength: 90,
  leafletWidth: 45,
  leafletThickness: 2,
  clearL: 1.5,
  clearW: 1,
  clearH: 2,
};

const up = (v: number) => Math.ceil(v * 2) / 2;

export function sizeFromContents(c: ContentsInput): { L: number; W: number; H: number } {
  const L = Math.max(c.blisterWidth, c.leafletWidth) + c.clearL;
  const W = c.blisterCount * c.blisterThickness + c.leafletThickness + c.clearW;
  const H = Math.max(c.blisterLength, c.leafletLength) + c.clearH;
  return { L: up(L), W: up(W), H: up(H) };
}
