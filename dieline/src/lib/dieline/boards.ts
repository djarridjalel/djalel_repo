// Typical calipers for folding boxboard used in pharma cartons. Real values
// vary by mill and product line, so the editor lets the caliper be overridden
// with the figure from the supplier's data sheet.

export interface Board {
  id: string;
  grade: string;
  name: string;
  gsm: number;
  caliper: number;
}

const make = (grade: string, label: string, rows: [number, number][]): Board[] =>
  rows.map(([gsm, caliper]) => ({
    id: `${grade.toLowerCase()}-${gsm}`,
    grade,
    name: `${grade} ${label} ${gsm} g/m²`,
    gsm,
    caliper,
  }));

export const BOARDS: Board[] = [
  ...make("GC1", "FBB white back", [
    [230, 0.355],
    [250, 0.39],
    [270, 0.42],
    [300, 0.47],
    [330, 0.52],
    [350, 0.55],
  ]),
  ...make("GC2", "FBB cream back", [
    [250, 0.385],
    [270, 0.415],
    [300, 0.46],
    [350, 0.54],
  ]),
  ...make("SBS", "solid bleached", [
    [250, 0.33],
    [300, 0.4],
    [350, 0.46],
  ]),
  ...make("GD2", "recycled WLC", [
    [300, 0.42],
    [350, 0.49],
    [400, 0.56],
  ]),
];

export const DEFAULT_BOARD = BOARDS.find((b) => b.id === "gc1-300")!;

export const boardById = (id: string) => BOARDS.find((b) => b.id === id);
