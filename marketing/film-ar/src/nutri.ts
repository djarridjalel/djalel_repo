// The Nutriboost carton read exactly as the app reads an upload: the
// dieline found and matched, its own flaps folded, and the artwork drawn
// without the dieline, at a resolution fit for macro shots.

import * as pdfjs from "pdfjs-dist";
import { readPdfDieline, type DieSeg } from "../../../dieline/src/lib/upload/pdfDieline";
import { analyseTube } from "../../../dieline/src/lib/upload/match";
import { orient } from "../../../dieline/src/lib/upload/index";
import type { Model3D } from "../../../dieline/src/lib/dieline/fold3d";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("./worker/pdf.worker.min.mjs", document.baseURI.replace(/[^/]*$/, "") + "dist/").toString();

export interface Carton {
  model: Model3D;
  art: { image: HTMLCanvasElement; x0: number; y0: number; w: number; h: number };
  /** Blank bounds on the page, mm. */
  box: { x0: number; y0: number; w: number; h: number };
  /** Every cut and crease of the upload on the page, mm, for drawing the dieline. */
  lines: { a: { x: number; y: number }; b: { x: number; y: number }; kind: "cut" | "crease" }[];
}

export async function loadCarton(url: string, maxPx = 8192): Promise<Carton> {
  const data = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const read = await readPdfDieline(doc, pdfjs.OPS as unknown as Record<string, number>);
  const found = analyseTube(read.segs, read.width, read.height)!;
  const match = found.matches[0];
  const model = orient(found.drawn.model3d, found.orientation, match, read.width, read.height);

  // Blank bounds from the folded model's faces.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of model.faces) for (const q of f.poly) (x0 = Math.min(x0, q.x)), (y0 = Math.min(y0, q.y)), (x1 = Math.max(x1, q.x)), (y1 = Math.max(y1, q.y));
  const pad = 3;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const w = x1 - x0, h = y1 - y0;

  // The dieline's own strokes are left out of the artwork (as the app does).
  const skip = new Set<number>();
  const colours = new Set(found.segs.map((g) => g.color));
  for (const g of read.segs as DieSeg[]) if (g.ord !== undefined && colours.has(g.color)) skip.add(g.ord);

  const page = await doc.getPage(1);
  const pxPerMm = maxPx / Math.max(w, h);
  const ptToMm = read.width / page.view[2];
  const scale = pxPerMm * ptToMm;
  const viewport = page.getViewport({ scale, offsetX: -x0 * pxPerMm, offsetY: -y0 * pxPerMm });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * pxPerMm);
  canvas.height = Math.round(h * pxPerMm);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const proto = CanvasRenderingContext2D.prototype;
  const { stroke } = proto;
  let ns = 0;
  proto.stroke = function (this: CanvasRenderingContext2D, ...a: unknown[]) {
    if (!skip.has(ns++)) (stroke as (...x: unknown[]) => void).apply(this, a);
  };
  try {
    await page.render({ canvasContext: ctx, viewport }).promise;
  } finally {
    proto.stroke = stroke;
  }
  const lines = found.segs.map((g) => {
    // Back from the matched orientation to the page, as orient() does for faces.
    const o = found.orientation;
    const [W, H] = o.swap ? [read.height, read.width] : [read.width, read.height];
    const f = (p: { x: number; y: number }) => {
      const x = o.sx > 0 ? p.x : W - p.x;
      const y = o.sy > 0 ? p.y : H - p.y;
      return o.swap ? { x: y, y: x } : { x, y };
    };
    return { a: f(g.a), b: f(g.b), kind: g.kind };
  });
  return { model, art: { image: canvas, x0, y0, w, h }, box: { x0, y0, w, h }, lines };
}
