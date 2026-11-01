// Upload a packaging PDF: find its dieline, match it to one of the app's
// models, check its closures, and lay its artwork on that model in 3D.
// Runs entirely in the browser; the file never leaves the device.

import type { Model3D } from "../dieline/fold3d";
import { pt, type Pt } from "../dieline/geom";
import { STYLE_NAMES } from "../dieline/export/common";
import type { Dieline } from "../dieline/types";
import type { FoldCheck } from "../dieline/fold";
import { analyseTube, type Match, type Orientation } from "./match";
import { readPdfDieline } from "./pdfDieline";

export interface UploadArt {
  image: HTMLCanvasElement;
  x0: number;
  y0: number;
  w: number;
  h: number;
}

export type UploadResult =
  | {
      ok: true;
      fileName: string;
      label: string;
      match: Match;
      /** The app's corrected dieline at the uploaded size. */
      dieline: Dieline;
      /** Problems found in the uploaded closures. */
      issues: FoldCheck[];
      model: Model3D;
      art: UploadArt;
    }
  | { ok: false; fileName: string; reason: string };

const MAX_PX = 4096;

export async function analysePdf(file: File): Promise<UploadResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const read = await readPdfDieline(doc, pdfjs.OPS as unknown as Record<string, number>);
  if (!read.segs.length) return { ok: false, fileName: file.name, reason: "No dieline found: the PDF has no stroked cut or fold lines." };
  const found = analyseTube(read.segs, read.width, read.height);
  if (!found) return { ok: false, fileName: file.name, reason: "This dieline is not one of the app's carton styles, so it cannot be folded in 3D." };
  const match = found.matches[0];
  const r = match.dieline.resolved;
  const label = `${STYLE_NAMES[match.style].name} · ${fmt(r.Li)} × ${fmt(r.Wi)} × ${fmt(r.Hi)} mm (inside)`;

  // Artwork: page 1 with the dieline layer hidden, as large as the device allows.
  const page = await doc.getPage(1);
  const oc = await doc.getOptionalContentConfig();
  for (const id of read.dielineLayers) if (id !== "-") oc.setVisibility(id, false);
  const scale = Math.min(MAX_PX / page.view[2], MAX_PX / page.view[3], 6);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport, optionalContentConfigPromise: Promise.resolve(oc) }).promise;

  return {
    ok: true,
    fileName: file.name,
    label,
    match,
    dieline: match.dieline,
    issues: found.checks.filter((c) => !c.ok),
    model: orient(match.dieline.model3d, found.orientation, match, read.width, read.height),
    art: { image: canvas, x0: 0, y0: 0, w: read.width, h: read.height },
  };
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

/**
 * Moves the app's model onto the uploaded page: shifted onto the uploaded
 * body and mirrored the way the upload is drawn, so each face sits on its own
 * part of the artwork.
 */
function orient(m: Model3D, o: Orientation, match: Match, W: number, H: number): Model3D {
  const f = (p: Pt) => {
    const x = p.x + match.dx;
    const y = p.y + match.dy;
    return pt(o.sx > 0 ? x : W - x, o.sy > 0 ? y : H - y);
  };
  return {
    ...m,
    faces: m.faces.map((face) => ({
      ...face,
      poly: face.poly.map(f),
      hinge: face.hinge ? [f(face.hinge[0]), f(face.hinge[1])] : null,
      lines: face.lines?.map((l) => ({ ...l, pts: l.pts.map(f) })),
    })),
    away: m.away ? { x: m.away.x * o.sx, y: m.away.y * o.sy, z: m.away.z } : undefined,
  };
}
