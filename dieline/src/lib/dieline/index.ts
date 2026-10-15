import ClipperLib from "clipper-lib";
import { DEFAULT_BOARD } from "./boards";
import { buildBlank } from "./carton";
import { boxOf, findSelfIntersection, line, pt, round, samplePath, segLength, signedArea, type Pt, type Seg } from "./geom";
import { buildPharma } from "./pharma";
import { resolve } from "./resolve";
import type { CartonParams, Dieline, Issue, Stats, Stroke } from "./types";

export * from "./types";

export const DEFAULT_PARAMS: CartonParams = {
  style: "rte",
  dimMode: "inside",
  L: 60,
  W: 25,
  H: 110,
  boardId: DEFAULT_BOARD.id,
  caliper: DEFAULT_BOARD.caliper,
  gsm: DEFAULT_BOARD.gsm,
  tuckDepth: null,
  tuckRadius: null,
  lock: "slit",
  slitLength: null,
  dustDepth: null,
  glueWidth: null,
  glueAngle: null,
  bottomExtension: null,
  bleed: 3,
  grain: "horizontal",
  tamper: "none",
  safeMargin: 2,
  showDimensions: true,
  braille: { enabled: false, text: "", panel: "sideA", orientation: "horizontal", align: "center", offsetX: 0, offsetY: 0 },
  codingWindow: { enabled: false, preset: "batchExpiry", width: 40, height: 18, panel: "sideB", align: "bottom", offsetX: 0, offsetY: 0 },
  pharmacode: { enabled: false, width: 30, height: 8, panel: "back", align: "top", offsetX: 0, offsetY: 0 },
  hangTab: { enabled: false, height: 25, slot: "euro" },
  window: { enabled: false, panel: "front", width: 30, height: 40, radius: 4, align: "center", offsetX: 0, offsetY: 0 },
  zipStrip: { enabled: false, fromTop: 15, width: 6 },
  dispenser: { enabled: false, panel: "front", width: 40, height: 30, fromBottom: 12 },
};

/** Fills in fields added after a project was saved. */
export function normalizeParams(raw: Partial<CartonParams> | null | undefined): CartonParams {
  const p = { ...DEFAULT_PARAMS, ...(raw ?? {}) } as CartonParams;
  p.braille = { ...DEFAULT_PARAMS.braille, ...(raw?.braille ?? {}) };
  p.codingWindow = { ...DEFAULT_PARAMS.codingWindow, ...(raw?.codingWindow ?? {}) };
  p.pharmacode = { ...DEFAULT_PARAMS.pharmacode, ...(raw?.pharmacode ?? {}) };
  p.hangTab = { ...DEFAULT_PARAMS.hangTab, ...(raw?.hangTab ?? {}) };
  p.window = { ...DEFAULT_PARAMS.window, ...(raw?.window ?? {}) };
  p.zipStrip = { ...DEFAULT_PARAMS.zipStrip, ...(raw?.zipStrip ?? {}) };
  p.dispenser = { ...DEFAULT_PARAMS.dispenser, ...(raw?.dispenser ?? {}) };
  return p;
}

const SCALE = 1000;

function offsetPolygon(poly: Pt[], d: number): Pt[][] {
  const path = poly.map((q) => ({ X: Math.round(q.x * SCALE), Y: Math.round(q.y * SCALE) }));
  const co = new ClipperLib.ClipperOffset(2, 0.05 * SCALE);
  co.AddPath(path, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out: { X: number; Y: number }[][] = [];
  co.Execute(out, d * SCALE);
  return out.map((ring) => ring.map((q) => pt(q.X / SCALE, q.Y / SCALE)));
}

export function generate(params: CartonParams): Dieline {
  const p = normalizeParams(params);
  const { r, issues } = resolve(p);
  const blank = buildBlank(p, r);
  const pharma = buildPharma(p, blank.panels);
  const allIssues: Issue[] = [...issues, ...pharma.issues];

  const poly = samplePath(blank.outline, 0.4);
  poly.pop();
  const crossing = findSelfIntersection(samplePath(blank.outline, 1.5));
  if (crossing) {
    allIssues.unshift({
      severity: "error",
      message: `Flaps overlap on the flat blank near x ${round(crossing.x, 0)}, y ${round(crossing.y, 0)} mm. Reduce flap sizes or change the dimensions.`,
    });
  }

  const strokes: Stroke[] = [...blank.strokes, ...pharma.strokes];
  if (p.bleed > 0) {
    for (const ring of offsetPolygon(poly, p.bleed)) {
      for (let i = 0; i < ring.length; i++) strokes.push({ layer: "bleed", seg: line(ring[i], ring[(i + 1) % ring.length]) });
    }
  }

  const sum = (layer: string, extra: Seg[] = []) =>
    strokes.filter((s) => s.layer === layer).reduce((a, s) => a + segLength(s.seg), 0) + extra.reduce((a, s) => a + segLength(s), 0);
  const bbox = boxOf(poly);
  const flatWidth = bbox.maxX - bbox.minX;
  const flatHeight = bbox.maxY - bbox.minY;
  const area = Math.abs(signedArea(poly));
  const stats: Stats = {
    flatWidth: round(flatWidth, 1),
    flatHeight: round(flatHeight, 1),
    cutLength: round(sum("cut", blank.outline), 0),
    creaseLength: round(sum("crease"), 0),
    perfLength: round(sum("perf"), 0),
    blankArea: round(area / 100, 1),
    utilization: round((area / (flatWidth * flatHeight)) * 100, 1),
    blankWeight: round((area / 1e6) * p.gsm, 2),
  };

  if (flatWidth > 1020 || flatHeight > 1020 || Math.min(flatWidth, flatHeight) > 720) {
    allIssues.push({ severity: "warning", message: `The flat blank (${stats.flatWidth} × ${stats.flatHeight} mm) does not fit a 720 × 1020 mm (B1) press sheet.` });
  }

  const order = { error: 0, warning: 1, info: 2 };
  allIssues.sort((a, b) => order[a.severity] - order[b.severity]);

  const grainBack = blank.panels.find((q) => q.id === "back");
  const texts = [...blank.texts, ...pharma.texts];
  if (grainBack) {
    texts.push({
      at: pt(grainBack.x + grainBack.w / 2, grainBack.y + grainBack.h * 0.32 + (p.grain === "horizontal" ? 4.5 : 0)),
      text: "GRAIN",
      size: 2.2,
      layer: "label",
      anchor: p.grain === "horizontal" ? "middle" : "start",
      ...(p.grain === "vertical" ? { at: pt(grainBack.x + grainBack.w / 2 + 2, grainBack.y + grainBack.h * 0.32) } : {}),
    });
  }

  return {
    params: p,
    resolved: r,
    outline: blank.outline,
    strokes,
    regions: [...blank.regions, ...pharma.regions],
    dots: pharma.dots,
    texts,
    dims: blank.dims,
    panels: blank.panels,
    bbox: boxOf([...poly, ...strokes.filter((s) => s.layer === "bleed").map((s) => s.seg.a)]),
    stats,
    issues: allIssues,
  };
}
