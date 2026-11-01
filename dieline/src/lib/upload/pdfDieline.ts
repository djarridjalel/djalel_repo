// Reads an uploaded packaging PDF: finds the layer that holds the dieline by
// what it contains (thin strokes, no fills, images or text), not by its name,
// and returns its cut and crease lines in millimetres on the flat blank
// (y down), with the page size, so the artwork can be lined up with it.

import type { PDFDocumentProxy } from "pdfjs-dist";
import { pt, type Pt } from "../dieline/geom";

export interface DieSeg {
  a: Pt;
  b: Pt;
  kind: "cut" | "crease";
}

export interface LayerInfo {
  id: string;
  name: string;
  strokes: number;
  dashed: number;
  fills: number;
  text: number;
  images: number;
  score: number;
}

export interface PdfDieline {
  /** Page size in mm. */
  width: number;
  height: number;
  layers: LayerInfo[];
  /** The layer that looks most like a dieline; null when none does. */
  layer: LayerInfo | null;
  /** Every layer taken as part of the dieline (cuts and folds can be on separate layers). */
  dielineLayers: string[];
  segs: DieSeg[];
}

const MM = 25.4 / 72;
type M = [number, number, number, number, number, number];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const tx = (m: M, x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

interface Raw {
  layer: string;
  pts: Pt[][];
  dashed: boolean;
  color: string;
}

/**
 * Walks page 1's drawing operations, keeping track of the transform and the
 * layer each one belongs to, and collects every stroked path.
 */
export async function readPdfDieline(doc: PDFDocumentProxy, OPS: Record<string, number>): Promise<PdfDieline> {
  const page = await doc.getPage(1);
  const [x0, y0, x1, y1] = page.view;
  const width = (x1 - x0) * MM;
  const height = (y1 - y0) * MM;
  const toMM = (p: Pt) => pt((p.x - x0) * MM, (y1 - p.y) * MM);

  const oc = await doc.getOptionalContentConfig();
  const nameOf = (id: string) => (oc?.getGroup(id) as { name?: string } | null)?.name ?? id;

  const ops = await page.getOperatorList();
  const stats = new Map<string, LayerInfo>();
  const stat = (id: string) => {
    let s = stats.get(id);
    if (!s) stats.set(id, (s = { id, name: id === "-" ? "(no layer)" : nameOf(id), strokes: 0, dashed: 0, fills: 0, text: 0, images: 0, score: 0 }));
    return s;
  };

  const raws: Raw[] = [];
  let ctm: M = [1, 0, 0, 1, 0, 0];
  const stack: { ctm: M; dashed: boolean; color: string }[] = [];
  let dashed = false;
  let color = "#000000";
  const layers: string[] = [];
  let path: Pt[][] = [];
  const layer = () => layers.filter(Boolean).at(-1) ?? "-";

  const flushPath = (stroke: boolean, fill: boolean) => {
    const s = stat(layer());
    if (stroke && path.length) {
      raws.push({ layer: layer(), pts: path.map((sp) => sp.map(toMM)), dashed, color });
      // Count lines, not drawing calls: some files stroke a whole layer at once.
      const n = path.reduce((k, sp) => k + sp.length - 1, 0);
      s.strokes += n;
      if (dashed) s.dashed += n;
    }
    if (fill) s.fills++;
    path = [];
  };

  const name = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, k]));
  ops.fnArray.forEach((fn, i) => {
    const args = ops.argsArray[i] as unknown[];
    switch (name[fn]) {
      case "save":
        stack.push({ ctm, dashed, color });
        break;
      case "restore": {
        const st = stack.pop();
        if (st) ({ ctm, dashed, color } = st);
        break;
      }
      case "transform":
        ctm = mul(ctm, args as M);
        break;
      case "paintFormXObjectBegin":
        stack.push({ ctm, dashed, color });
        if (Array.isArray(args[0])) ctm = mul(ctm, args[0] as M);
        break;
      case "paintFormXObjectEnd": {
        const st = stack.pop();
        if (st) ({ ctm, dashed, color } = st);
        break;
      }
      case "setDash":
        dashed = Array.isArray(args[0]) && (args[0] as number[]).some((v) => v > 0);
        break;
      case "setStrokeRGBColor":
      case "setStrokeColor":
        color = typeof args[0] === "string" ? args[0] : JSON.stringify(args);
        break;
      case "beginMarkedContentProps": {
        const props = args[1] as { type?: string; id?: string } | null;
        layers.push(props && props.type === "OCG" && props.id ? props.id : "");
        break;
      }
      case "beginMarkedContent":
        layers.push("");
        break;
      case "endMarkedContent":
        layers.pop();
        break;
      case "constructPath": {
        const [pops, pargs] = args as [number[], number[]];
        let k = 0;
        let sub: Pt[] = [];
        const start = () => {
          if (sub.length > 1) path.push(sub);
          sub = [];
        };
        for (const op of pops) {
          const on = name[op];
          if (on === "moveTo") {
            start();
            sub.push(tx(ctm, pargs[k], pargs[k + 1]));
            k += 2;
          } else if (on === "lineTo") {
            sub.push(tx(ctm, pargs[k], pargs[k + 1]));
            k += 2;
          } else if (on === "curveTo" || on === "curveTo2" || on === "curveTo3") {
            const n = on === "curveTo" ? 6 : 4;
            const c = pargs.slice(k, k + n);
            k += n;
            const p0 = sub.at(-1) ?? tx(ctm, c[n - 2], c[n - 1]);
            const [c1, c2, p3] =
              on === "curveTo"
                ? [tx(ctm, c[0], c[1]), tx(ctm, c[2], c[3]), tx(ctm, c[4], c[5])]
                : on === "curveTo2"
                  ? [p0, tx(ctm, c[0], c[1]), tx(ctm, c[2], c[3])]
                  : [tx(ctm, c[0], c[1]), tx(ctm, c[2], c[3]), tx(ctm, c[2], c[3])];
            for (let j = 1; j <= 8; j++) {
              const u = j / 8;
              const v = 1 - u;
              sub.push(pt(v * v * v * p0.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * p3.x, v * v * v * p0.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * p3.y));
            }
          } else if (on === "closePath") {
            if (sub.length) sub.push(sub[0]);
          } else if (on === "rectangle") {
            start();
            const [rx, ry, rw, rh] = pargs.slice(k, k + 4);
            k += 4;
            sub = [tx(ctm, rx, ry), tx(ctm, rx + rw, ry), tx(ctm, rx + rw, ry + rh), tx(ctm, rx, ry + rh), tx(ctm, rx, ry)];
          }
        }
        start();
        break;
      }
      case "stroke":
      case "closeStroke":
        flushPath(true, false);
        break;
      case "fill":
      case "eoFill":
        flushPath(false, true);
        break;
      case "fillStroke":
      case "eoFillStroke":
      case "closeFillStroke":
      case "closeEOFillStroke":
        flushPath(true, true);
        break;
      case "endPath":
        path = [];
        break;
      case "showText":
      case "showSpacedText":
        stat(layer()).text++;
        break;
      case "paintImageXObject":
      case "paintInlineImageXObject":
      case "paintImageMaskXObject":
        stat(layer()).images++;
        break;
    }
  });

  // A dieline layer is all strokes, with some dashed creases, and spans most of the page.
  for (const s of stats.values()) {
    const lines = raws.filter((r) => r.layer === s.id).flatMap((r) => r.pts.flat());
    const xs = lines.map((p) => p.x);
    const ys = lines.map((p) => p.y);
    const span = lines.length ? ((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) / (width * height) : 0;
    const clean = s.strokes / (1 + 3 * s.fills + 10 * s.text + 50 * s.images);
    s.score = s.strokes >= 4 ? clean * (s.dashed > 0 ? 2 : 1) * Math.min(1, span * 3) : 0;
  }
  const layersOut = [...stats.values()].sort((a, b) => b.score - a.score);
  const best = layersOut[0]?.score > 0 ? layersOut[0] : null;
  // Cuts and folds are often on layers of their own: take every line-only layer that scores near the best.
  const chosen = new Set(best ? layersOut.filter((l) => l.score > 0 && l.fills + l.text + l.images === 0).map((l) => l.id).concat(best.id) : []);

  const mine = raws.filter((r) => chosen.has(r.layer));
  // Creases: dashed lines; with no dashes at all, any colour other than the one drawing the outline.
  const anyDash = mine.some((r) => r.dashed);
  let cutColor = "";
  if (!anyDash && mine.length) {
    const xs = mine.flatMap((r) => r.pts.flat().map((p) => p.x));
    const left = Math.min(...xs);
    cutColor = mine.find((r) => r.pts.flat().some((p) => Math.abs(p.x - left) < 0.01))?.color ?? "";
  }
  const segs: DieSeg[] = [];
  for (const r of mine) {
    const kind = anyDash ? (r.dashed ? "crease" : "cut") : r.color === cutColor ? "cut" : "crease";
    for (const sub of r.pts) for (let j = 1; j < sub.length; j++) if (Math.hypot(sub[j].x - sub[j - 1].x, sub[j].y - sub[j - 1].y) > 1e-3) segs.push({ a: sub[j - 1], b: sub[j], kind });
  }
  return { width, height, layers: layersOut, layer: best, dielineLayers: [...chosen], segs };
}
