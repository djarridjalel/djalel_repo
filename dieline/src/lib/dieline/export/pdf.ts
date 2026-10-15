// True-scale vector PDF. Every layer is drawn in its own Separation (spot)
// colour with overprint on, and wrapped in an optional content group so
// Illustrator and Acrobat list it as a layer.

import { PDFDict, PDFDocument, PDFName, PDFString, StandardFonts, type PDFFont, type PDFRef } from "pdf-lib";
import { arcToBeziers, type Pt, type Seg } from "../geom";
import { LAYERS, LAYER_ORDER } from "../layers";
import type { Dieline, Layer } from "../types";
import { BRAND, DISCLAIMER, titleRows, type ExportMeta } from "./common";

const MM = 72 / 25.4;
const f = (v: number) => (Math.round(v * 1000) / 1000).toString();

export interface PdfOptions {
  layers?: Set<Layer>;
  meta: ExportMeta;
}

export async function renderPdf(d: Dieline, opts: PdfOptions): Promise<Uint8Array> {
  const on = (l: Layer) => !opts.layers || opts.layers.has(l);
  const margin = 12;
  const titleH = 42;
  const wMm = Math.max(d.bbox.maxX - d.bbox.minX + 2 * margin, 200);
  const hMm = d.bbox.maxY - d.bbox.minY + 2 * margin + titleH;
  const W = wMm * MM;
  const H = hMm * MM;
  const X = (x: number) => (x - d.bbox.minX + margin) * MM;
  const Y = (y: number) => H - (y - d.bbox.minY + margin) * MM;

  const doc = await PDFDocument.create();
  doc.setTitle(opts.meta.projectName || "Dieline");
  doc.setCreator(BRAND);
  doc.setProducer(BRAND);
  const page = doc.addPage([W, H]);
  const ctx = doc.context;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontKey = page.node.newFontDictionary("F", font.ref);
  const boldKey = page.node.newFontDictionary("FB", bold.ref);
  const gsKey = page.node.newExtGState("GS", ctx.obj({ Type: "ExtGState", OP: true, op: true, OPM: 1 }));

  const resources = page.node.normalizedEntries().Resources;
  const colorSpaces = ctx.obj({}) as PDFDict;
  const properties = ctx.obj({}) as PDFDict;
  resources.set(PDFName.of("ColorSpace"), colorSpaces);
  resources.set(PDFName.of("Properties"), properties);

  const ocgRefs: PDFRef[] = [];
  let content = "";

  const pathOps = (segs: Seg[]) => {
    let s = "";
    let cur: Pt | null = null;
    for (const seg of segs) {
      if (!cur || Math.abs(cur.x - seg.a.x) > 1e-6 || Math.abs(cur.y - seg.a.y) > 1e-6) s += `${f(X(seg.a.x))} ${f(Y(seg.a.y))} m\n`;
      if (seg.kind === "line") s += `${f(X(seg.b.x))} ${f(Y(seg.b.y))} l\n`;
      else for (const [, c1, c2, p3] of arcToBeziers(seg)) s += `${f(X(c1.x))} ${f(Y(c1.y))} ${f(X(c2.x))} ${f(Y(c2.y))} ${f(X(p3.x))} ${f(Y(p3.y))} c\n`;
      cur = seg.b;
    }
    return s;
  };

  const text = (fnt: PDFFont, key: PDFName, str: string, x: number, y: number, size: number, rotateDeg = 0, anchor: "start" | "middle" | "end" = "start") => {
    const safe = Array.from(str)
      .map((ch) => {
        try {
          fnt.encodeText(ch);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
    const width = fnt.widthOfTextAtSize(safe, size);
    const dx = anchor === "middle" ? -width / 2 : anchor === "end" ? -width : 0;
    const a = (rotateDeg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const ox = x + dx * cos;
    const oy = y + dx * sin;
    return `BT ${key.toString()} ${f(size)} Tf ${f(cos)} ${f(sin)} ${f(-sin)} ${f(cos)} ${f(ox)} ${f(oy)} Tm ${fnt.encodeText(safe).toString()} Tj ET\n`;
  };

  let csIndex = 0;
  for (const layer of LAYER_ORDER) {
    if (!on(layer)) continue;
    const st = LAYERS[layer];
    const segs = d.strokes.filter((s) => s.layer === layer).map((s) => s.seg);
    if (layer === "cut") segs.unshift(...d.outline);
    const regions = d.regions.filter((r) => r.layer === layer);
    const dots = d.dots.filter((q) => q.layer === layer);
    const texts = d.texts.filter((q) => q.layer === layer);
    const dims = layer === "dimension" ? d.dims : [];
    if (!segs.length && !regions.length && !dots.length && !texts.length && !dims.length) continue;

    const fn = ctx.register(ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: st.cmyk, N: 1 }));
    const cs = ctx.obj([PDFName.of("Separation"), PDFName.of(st.name), PDFName.of("DeviceCMYK"), fn]);
    const csName = `CS${csIndex}`;
    colorSpaces.set(PDFName.of(csName), cs);
    const ocg = ctx.register(ctx.obj({ Type: "OCG", Name: PDFString.of(st.label) }));
    ocgRefs.push(ocg);
    const ocName = `OC${csIndex}`;
    properties.set(PDFName.of(ocName), ocg);
    csIndex++;

    content += `/OC /${ocName} BDC\nq ${gsKey.toString()} gs /${csName} CS /${csName} cs 1 SCN 1 scn\n`;
    content += `${f(st.width * MM)} w 1 J 1 j\n`;
    content += st.dash ? `[${st.dash.map((v) => f(v * MM)).join(" ")}] 0 d\n` : "[] 0 d\n";
    if (segs.length) content += pathOps(segs) + "S\n";
    for (const rg of regions) {
      const pts = rg.pts;
      let s = `${f(X(pts[0].x))} ${f(Y(pts[0].y))} m\n`;
      for (const q of pts.slice(1)) s += `${f(X(q.x))} ${f(Y(q.y))} l\n`;
      s += "h\n";
      content += st.fill ? `q ${f(st.fill)} scn\n${s}f\nQ\n${s}S\n` : `${s}S\n`;
    }
    for (const dot of dots) {
      const k = 0.5523 * dot.r;
      const cx = dot.c.x;
      const cy = dot.c.y;
      content += `${f(X(cx + dot.r))} ${f(Y(cy))} m ${f(X(cx + dot.r))} ${f(Y(cy + k))} ${f(X(cx + k))} ${f(Y(cy + dot.r))} ${f(X(cx))} ${f(Y(cy + dot.r))} c `;
      content += `${f(X(cx - k))} ${f(Y(cy + dot.r))} ${f(X(cx - dot.r))} ${f(Y(cy + k))} ${f(X(cx - dot.r))} ${f(Y(cy))} c `;
      content += `${f(X(cx - dot.r))} ${f(Y(cy - k))} ${f(X(cx - k))} ${f(Y(cy - dot.r))} ${f(X(cx))} ${f(Y(cy - dot.r))} c `;
      content += `${f(X(cx + k))} ${f(Y(cy - dot.r))} ${f(X(cx + dot.r))} ${f(Y(cy - k))} ${f(X(cx + dot.r))} ${f(Y(cy))} c f\n`;
    }
    for (const dm of dims) {
      content += `${f(X(dm.a.x))} ${f(Y(dm.a.y))} m ${f(X(dm.b.x))} ${f(Y(dm.b.y))} l S\n`;
      const ang = Math.atan2(-(dm.b.y - dm.a.y), dm.b.x - dm.a.x);
      let deg = (ang * 180) / Math.PI;
      if (deg > 90) deg -= 180;
      if (deg < -90) deg += 180;
      const mx = X((dm.a.x + dm.b.x) / 2);
      const my = Y((dm.a.y + dm.b.y) / 2);
      const off = 1.2 * MM;
      const nx = -Math.sin((deg * Math.PI) / 180) * off;
      const ny = Math.cos((deg * Math.PI) / 180) * off;
      content += text(font, fontKey, dm.text, mx + nx, my + ny, 2.6 * MM, deg, "middle");
    }
    for (const tx of texts) {
      const size = tx.size * MM;
      content += text(font, fontKey, tx.text, X(tx.at.x), Y(tx.at.y) - size * 0.35, size, -(tx.rotate ?? 0), tx.anchor ?? "start");
    }
    content += "Q\nEMC\n";
  }

  // Title block in plain black, outside the spot layers.
  const rows = titleRows(d, opts.meta);
  const tx0 = margin * MM;
  let ty = (titleH - 6) * MM;
  let tb = "q 0 g\n";
  tb += text(bold, boldKey, BRAND, tx0, ty, 3.6 * MM);
  ty -= 6 * MM;
  for (const [k, v] of rows) {
    tb += `q 0.4 g\n${text(font, fontKey, k, tx0, ty, 2.6 * MM)}Q\n`;
    tb += text(font, fontKey, v, tx0 + 26 * MM, ty, 2.6 * MM);
    ty -= 3.8 * MM;
  }
  tb += `q 0.69 0 0.13 rg\n${text(font, fontKey, DISCLAIMER, tx0, ty - 1 * MM, 2.3 * MM)}Q\nQ\n`;
  content += tb;

  const stream = ctx.flateStream(content);
  page.node.addContentStream(ctx.register(stream));

  doc.catalog.set(
    PDFName.of("OCProperties"),
    ctx.obj({
      OCGs: ocgRefs,
      D: { Order: ocgRefs, ON: ocgRefs, Name: PDFString.of("Layers") },
    }),
  );

  return doc.save();
}
