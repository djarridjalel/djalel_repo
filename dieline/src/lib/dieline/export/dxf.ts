// AutoCAD R12 ASCII DXF, the version every CAD, CAM and sample-cutting table
// reads. One DXF layer per dieline layer, millimetres, Y axis up.

import { arcSweep, xfSeg, type Seg } from "../geom";
import { LAYERS, LAYER_ORDER } from "../layers";
import type { Dieline, Layer } from "../types";
import { titleRows, type ExportMeta } from "./common";

const FLIP = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 };
const num = (v: number) => (Math.round(v * 10000) / 10000).toString();
const dxfName = (l: Layer) => LAYERS[l].name.toUpperCase();

export function renderDxf(d: Dieline, opts: { layers?: Set<Layer>; meta: ExportMeta }): string {
  const on = (l: Layer) => !opts.layers || opts.layers.has(l);
  const out: string[] = [];
  const g = (code: number, value: string | number) => out.push(String(code), typeof value === "number" ? num(value) : value);

  const used = LAYER_ORDER.filter(on);
  g(0, "SECTION");
  g(2, "HEADER");
  g(9, "$ACADVER");
  g(1, "AC1009");
  g(9, "$INSBASE");
  g(10, 0);
  g(20, 0);
  g(30, 0);
  g(0, "ENDSEC");

  g(0, "SECTION");
  g(2, "TABLES");
  g(0, "TABLE");
  g(2, "LTYPE");
  g(70, 1);
  g(0, "LTYPE");
  g(2, "CONTINUOUS");
  g(70, 0);
  g(3, "Solid line");
  g(72, 65);
  g(73, 0);
  g(40, 0);
  g(0, "ENDTAB");
  g(0, "TABLE");
  g(2, "LAYER");
  g(70, used.length + 1);
  for (const l of [...used, "TITLE" as const]) {
    g(0, "LAYER");
    g(2, l === "TITLE" ? "TITLE" : dxfName(l));
    g(70, 0);
    g(62, l === "TITLE" ? 7 : LAYERS[l].dxfColor);
    g(6, "CONTINUOUS");
  }
  g(0, "ENDTAB");
  g(0, "ENDSEC");

  g(0, "SECTION");
  g(2, "ENTITIES");

  const seg = (s0: Seg, layer: string) => {
    const s = xfSeg(FLIP, s0);
    if (s.kind === "line") {
      g(0, "LINE");
      g(8, layer);
      g(10, s.a.x);
      g(20, s.a.y);
      g(30, 0);
      g(11, s.b.x);
      g(21, s.b.y);
      g(31, 0);
      return;
    }
    const full = arcSweep(s) > Math.PI * 2 - 1e-6;
    const from = s.ccw ? s.a : s.b;
    const to = s.ccw ? s.b : s.a;
    const a0 = (Math.atan2(from.y - s.c.y, from.x - s.c.x) * 180) / Math.PI;
    const a1 = (Math.atan2(to.y - s.c.y, to.x - s.c.x) * 180) / Math.PI;
    g(0, full ? "CIRCLE" : "ARC");
    g(8, layer);
    g(10, s.c.x);
    g(20, s.c.y);
    g(30, 0);
    g(40, s.r);
    if (!full) {
      g(50, (a0 + 360) % 360);
      g(51, (a1 + 360) % 360);
    }
  };

  const textEnt = (layer: string, x: number, y: number, h: number, str: string, rot = 0, center = false) => {
    g(0, "TEXT");
    g(8, layer);
    g(10, x);
    g(20, y);
    g(30, 0);
    g(40, h);
    g(1, str.replace(/[^\x20-\x7E]/g, (ch) => ({ "×": "x", "·": "-", "—": "-", "²": "2", "é": "e", "è": "e", "à": "a" })[ch] ?? "?"));
    if (rot) g(50, rot);
    if (center) {
      g(72, 1);
      g(73, 2);
      g(11, x);
      g(21, y);
      g(31, 0);
    }
  };

  for (const layer of used) {
    const name = dxfName(layer);
    const segs = d.strokes.filter((s) => s.layer === layer).map((s) => s.seg);
    if (layer === "cut") segs.unshift(...d.outline);
    for (const s of segs) seg(s, name);
    for (const rg of d.regions.filter((r) => r.layer === layer)) {
      for (let i = 0; i < rg.pts.length; i++) {
        const a = rg.pts[i];
        const b = rg.pts[(i + 1) % rg.pts.length];
        seg({ kind: "line", a, b }, name);
      }
    }
    for (const dot of d.dots.filter((q) => q.layer === layer)) {
      g(0, "CIRCLE");
      g(8, name);
      g(10, dot.c.x);
      g(20, -dot.c.y);
      g(30, 0);
      g(40, dot.r);
    }
    if (layer === "dimension") {
      for (const dm of d.dims) {
        seg({ kind: "line", a: dm.a, b: dm.b }, name);
        const ang = (Math.atan2(-(dm.b.y - dm.a.y), dm.b.x - dm.a.x) * 180) / Math.PI;
        const deg = ang > 90 ? ang - 180 : ang < -90 ? ang + 180 : ang;
        textEnt(name, (dm.a.x + dm.b.x) / 2, -(dm.a.y + dm.b.y) / 2 + 1.5, 2.5, dm.text, deg, true);
      }
    }
    for (const tx of d.texts.filter((q) => q.layer === layer)) {
      textEnt(name, tx.at.x, -tx.at.y, tx.size, tx.text, -(tx.rotate ?? 0), tx.anchor === "middle");
    }
  }

  const rows = titleRows(d, opts.meta);
  let ty = -(d.bbox.maxY + 12);
  for (const [k, v] of rows) {
    textEnt("TITLE", d.bbox.minX, ty, 2.5, `${k}: ${v}`);
    ty -= 4;
  }

  g(0, "ENDSEC");
  g(0, "EOF");
  return out.join("\r\n") + "\r\n";
}
