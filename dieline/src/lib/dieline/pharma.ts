// Pharma overlays placed on named panels: Braille, the varnish-free coding
// window, the pharmacode zone and the safe-area guides.

import { MARBURG, blockSize, dotPositions, textToBraille, wrapCells } from "./braille";
import { pt, type Pt } from "./geom";
import type { Align, CartonParams, Dot, Issue, Panel, Region, TextItem } from "./types";

export const CODING_PRESETS = {
  batchExpiry: { label: "Batch + expiry", width: 32, height: 14 },
  gs1: { label: "GS1 DataMatrix + batch / expiry / SN", width: 45, height: 22 },
  custom: { label: "Custom size", width: 40, height: 18 },
} as const;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rectPts = (r: Rect): Pt[] => [pt(r.x, r.y), pt(r.x + r.w, r.y), pt(r.x + r.w, r.y + r.h), pt(r.x, r.y + r.h)];

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function placeIn(panel: Panel, w: number, h: number, align: Align, offX: number, offY: number, margin: number): { rect: Rect; fits: boolean } {
  const area = { x: panel.x + margin, y: panel.y + margin, w: panel.w - 2 * margin, h: panel.h - 2 * margin };
  const x = area.x + (area.w - w) / 2 + offX;
  const y = (align === "top" ? area.y : align === "bottom" ? area.y + area.h - h : area.y + (area.h - h) / 2) + offY;
  const rect = { x, y, w, h };
  const fits = x >= area.x - 1e-6 && y >= area.y - 1e-6 && x + w <= area.x + area.w + 1e-6 && y + h <= area.y + area.h + 1e-6;
  return { rect, fits };
}

export interface PharmaLayers {
  regions: Region[];
  dots: Dot[];
  texts: TextItem[];
  issues: Issue[];
}

export function buildPharma(p: CartonParams, panels: Panel[]): PharmaLayers {
  const regions: Region[] = [];
  const dots: Dot[] = [];
  const texts: TextItem[] = [];
  const issues: Issue[] = [];
  const byId = (id: string) => panels.find((q) => q.id === id);
  const margin = Math.max(0, p.safeMargin);
  const zones: { name: string; rect: Rect }[] = [];

  // Safe areas on printable panels.
  if (margin > 0) {
    for (const q of panels) {
      if (!q.printable || q.w <= 2 * margin || q.h <= 2 * margin) continue;
      regions.push({ layer: "safe", pts: rectPts({ x: q.x + margin, y: q.y + margin, w: q.w - 2 * margin, h: q.h - 2 * margin }) });
    }
  }

  // Varnish-free coding window.
  const cw = p.codingWindow;
  if (cw.enabled) {
    const panel = byId(cw.panel);
    if (!panel) {
      issues.push({ severity: "warning", field: "codingWindow", message: "The coding window's panel does not exist on this style." });
    } else {
      const preset = CODING_PRESETS[cw.preset];
      const w = cw.preset === "custom" ? cw.width : preset.width;
      const h = cw.preset === "custom" ? cw.height : preset.height;
      const rot = w > panel.w - 2 * margin && h <= panel.w - 2 * margin;
      const [rw, rh] = rot ? [h, w] : [w, h];
      const { rect, fits } = placeIn(panel, rw, rh, cw.align, cw.offsetX, cw.offsetY, margin);
      regions.push({ layer: "varnishFree", pts: rectPts(rect), label: "Varnish-free coding area" });
      texts.push({ at: pt(rect.x + rect.w / 2, rect.y + rect.h / 2), text: "NO VARNISH · CODING", size: Math.min(2.2, rect.w / 12), layer: "varnishFree", anchor: "middle", rotate: rot ? -90 : 0 });
      if (cw.preset === "gs1") {
        const dm = 14;
        const q = { x: rect.x + 1.5, y: rect.y + (rect.h - dm) / 2, w: dm, h: dm };
        if (rot) Object.assign(q, { x: rect.x + (rect.w - dm) / 2, y: rect.y + rect.h - dm - 1.5 });
        regions.push({ layer: "varnishFree", pts: rectPts(q), label: "DataMatrix 14 × 14" });
      }
      zones.push({ name: "coding window", rect });
      if (!fits) {
        issues.push({ severity: "warning", field: "codingWindow", message: `The coding window (${w} × ${h} mm) does not fit inside the safe area of ${panel.name}.` });
      }
      if (panel.id === "glueFlap") issues.push({ severity: "warning", field: "codingWindow", message: "The coding window sits on the glue flap, which is glued and hidden." });
    }
  }

  // Pharmacode zone.
  const pc = p.pharmacode;
  if (pc.enabled) {
    const panel = byId(pc.panel);
    if (!panel) {
      issues.push({ severity: "warning", field: "pharmacode", message: "The pharmacode's panel does not exist on this style." });
    } else {
      const rot = pc.width > panel.w - 2 * margin && pc.height <= panel.w - 2 * margin;
      const [rw, rh] = rot ? [pc.height, pc.width] : [pc.width, pc.height];
      const { rect, fits } = placeIn(panel, rw, rh, pc.align, pc.offsetX, pc.offsetY, margin);
      regions.push({ layer: "pharmacode", pts: rectPts(rect), label: "Pharmacode" });
      texts.push({ at: pt(rect.x + rect.w / 2, rect.y + rect.h / 2), text: "PHARMACODE", size: Math.min(2.2, Math.max(rect.w, rect.h) / 14), layer: "pharmacode", anchor: "middle", rotate: rot ? -90 : 0 });
      zones.push({ name: "pharmacode", rect });
      if (!fits) issues.push({ severity: "warning", field: "pharmacode", message: `The pharmacode zone does not fit inside the safe area of ${panel.name}.` });
    }
  }

  // Braille.
  const br = p.braille;
  if (br.enabled && br.text.trim()) {
    const panel = byId(br.panel);
    if (!panel) {
      issues.push({ severity: "warning", field: "braille", message: "The Braille panel does not exist on this style." });
    } else {
      const { cells, unsupported } = textToBraille(br.text.trim());
      if (unsupported.length) {
        issues.push({ severity: "warning", field: "braille", message: `These characters have no braille equivalent here and were skipped: ${unsupported.join(" ")}` });
      }
      const bm = Math.max(margin, 4);
      const vertical = br.orientation === "vertical";
      const along = (vertical ? panel.h : panel.w) - 2 * bm;
      const maxCells = Math.floor((along - MARBURG.dotPitch - MARBURG.dotDiameter) / MARBURG.cellPitch) + 1;
      const lines = wrapCells(cells, maxCells);
      const size = blockSize(lines);
      const [bw, bh] = vertical ? [size.h, size.w] : [size.w, size.h];
      const { rect, fits } = placeIn(panel, bw, bh, br.align, br.offsetX, br.offsetY, bm);
      const r = MARBURG.dotDiameter / 2;
      for (const d of dotPositions(lines)) {
        // Horizontal: reading left to right. Vertical: rotated 90° clockwise,
        // reading top to bottom.
        const c = vertical ? pt(rect.x + rect.w - r - d.y, rect.y + r + d.x) : pt(rect.x + r + d.x, rect.y + r + d.y);
        dots.push({ c, r, layer: "braille" });
      }
      zones.push({ name: "Braille", rect });
      if (!fits || maxCells < 1) {
        issues.push({ severity: "error", field: "braille", message: `The Braille text needs ${lines.length} line${lines.length === 1 ? "" : "s"} and does not fit on ${panel.name}. Shorten it or choose a larger panel.` });
      }
      if (!panel.printable) issues.push({ severity: "warning", field: "braille", message: `Braille on ${panel.name} is hidden once the carton is closed.` });
      if (fits && lines.length > 2) {
        const other = (vertical ? panel.w : panel.h) - 2 * bm;
        const otherCells = Math.floor((other - MARBURG.dotPitch - MARBURG.dotDiameter) / MARBURG.cellPitch) + 1;
        const otherLines = wrapCells(cells, otherCells).length;
        if (otherCells >= 1 && otherLines < lines.length) {
          issues.push({ severity: "info", field: "braille", message: `The Braille runs over ${lines.length} lines. Running it ${vertical ? "across" : "along the height"} would need ${otherLines}.` });
        }
      }
    }
  }

  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (overlaps(zones[i].rect, zones[j].rect)) {
        issues.push({ severity: "warning", message: `The ${zones[i].name} overlaps the ${zones[j].name}. Move one of them.` });
      }
    }
  }

  return { regions, dots, texts, issues };
}
