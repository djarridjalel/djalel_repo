import type { Box, Pt, Seg } from "./geom";

export type Layer =
  | "cut"
  | "crease"
  | "perf"
  | "bleed"
  | "safe"
  | "glue"
  | "varnishFree"
  | "braille"
  | "pharmacode"
  | "dimension"
  | "label";

export type StyleId = "rte" | "ste" | "crash" | "snap";
export type LockType = "slit" | "friction" | "none";
export type TamperType = "none" | "glueTuck" | "tearStrip";
export type Align = "top" | "center" | "bottom";

/** A value of `null` means "let the generator choose". */
export interface CartonParams {
  style: StyleId;
  dimMode: "inside" | "outside";
  L: number;
  W: number;
  H: number;
  boardId: string;
  caliper: number;
  gsm: number;
  tuckDepth: number | null;
  tuckRadius: number | null;
  lock: LockType;
  slitLength: number | null;
  dustDepth: number | null;
  glueWidth: number | null;
  glueAngle: number | null;
  bottomExtension: number | null;
  bleed: number;
  grain: "horizontal" | "vertical";
  tamper: TamperType;
  safeMargin: number;
  showDimensions: boolean;
  braille: BrailleParams;
  codingWindow: CodingWindowParams;
  pharmacode: PharmacodeParams;
  hangTab: HangTabParams;
  window: WindowParams;
  zipStrip: ZipStripParams;
  dispenser: DispenserParams;
}

/** Hanger above the front panel: two layers glued back to back, with the slot through both. */
export interface HangTabParams {
  enabled: boolean;
  height: number;
  slot: "euro" | "round";
}

/** Die-cut window with rounded corners. */
export interface WindowParams {
  enabled: boolean;
  panel: PanelId;
  width: number;
  height: number;
  radius: number;
  align: Align;
  offsetX: number;
  offsetY: number;
}

/** Zip tear strip around the body, opened from a pull tab at the free edge. */
export interface ZipStripParams {
  enabled: boolean;
  fromTop: number;
  width: number;
}

/** Perforated opening that is pushed in to dispense sachets or stick packs. */
export interface DispenserParams {
  enabled: boolean;
  panel: PanelId;
  width: number;
  height: number;
  fromBottom: number;
}

export interface BrailleParams {
  enabled: boolean;
  text: string;
  panel: PanelId;
  orientation: "horizontal" | "vertical";
  align: Align;
  offsetX: number;
  offsetY: number;
}

export type CodingPreset = "batchExpiry" | "gs1" | "custom";

export interface CodingWindowParams {
  enabled: boolean;
  preset: CodingPreset;
  width: number;
  height: number;
  panel: PanelId;
  align: Align;
  offsetX: number;
  offsetY: number;
}

export interface PharmacodeParams {
  enabled: boolean;
  width: number;
  height: number;
  panel: PanelId;
  align: Align;
  offsetX: number;
  offsetY: number;
}

export type PanelId =
  | "front"
  | "sideA"
  | "back"
  | "sideB"
  | "topLid"
  | "bottomLid"
  | "glueFlap"
  | "topTuck"
  | "bottomTuck"
  | "hanger";

export interface Panel {
  id: PanelId;
  name: string;
  /** Axis-aligned rectangle in drawing coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  printable: boolean;
}

export interface Stroke {
  seg: Seg;
  layer: Layer;
}

export interface Region {
  layer: Layer;
  pts: Pt[];
  label?: string;
}

export interface Dot {
  c: Pt;
  r: number;
  layer: Layer;
}

export interface TextItem {
  at: Pt;
  text: string;
  size: number;
  layer: Layer;
  rotate?: number;
  anchor?: "start" | "middle" | "end";
}

export interface Dimension {
  a: Pt;
  b: Pt;
  /** Offset of the dimension line, perpendicular to a→b. */
  offset: number;
  text: string;
}

export type Severity = "error" | "warning" | "info";

export interface Issue {
  severity: Severity;
  message: string;
  field?: keyof CartonParams | string;
  fix?: { field: keyof CartonParams; value: number | string; label: string };
}

export interface Resolved {
  Li: number;
  Wi: number;
  Hi: number;
  t: number;
  panelWidths: [number, number, number, number];
  bodyHeight: number;
  lidDepth: number;
  tuckDepth: number;
  tuckRadius: number;
  slitLength: number;
  slitOffset: number;
  sideClear: number;
  dustDepth: number;
  glueWidth: number;
  glueAngle: number;
  bottomExtension: number;
  hangerHeight: number;
  zipFromTop: number;
  zipWidth: number;
}

export interface Stats {
  flatWidth: number;
  flatHeight: number;
  cutLength: number;
  creaseLength: number;
  perfLength: number;
  blankArea: number;
  utilization: number;
  blankWeight: number;
}

export interface Dieline {
  params: CartonParams;
  resolved: Resolved;
  outline: Seg[];
  strokes: Stroke[];
  regions: Region[];
  dots: Dot[];
  texts: TextItem[];
  dims: Dimension[];
  panels: Panel[];
  bbox: Box;
  stats: Stats;
  issues: Issue[];
}
