// Assembles a four-panel folding carton (tube with manufacturer's joint)
// from its closure pieces.
//
// Panel order on the flat blank, left to right:
//   Front (L + t, free edge) | Side A (W + t) | Back (L + t) | Side B (W) | glue flap
// Crease-to-crease widths carry thickness allowances so the erected carton
// keeps the requested inside dimensions; the free-edge panel stops half a
// caliper short of the outer face so it never protrudes.

import {
  crashMainPiece,
  crashSidePiece,
  dustPiece,
  lidPiece,
  nonePiece,
  snapHookPiece,
  snapNotchPiece,
  snapTonguePiece,
  type LocalPanel,
  type Piece,
} from "./closures";
import { clamp, insetConvex, line, pt, reversePath, xfApply, xfSeg, type Seg, type Xf } from "./geom";
import type { CartonParams, Dimension, Panel, Region, Resolved, Stroke, TextItem } from "./types";

export interface Blank {
  outline: Seg[];
  strokes: Stroke[];
  regions: Region[];
  panels: Panel[];
  dims: Dimension[];
  texts: TextItem[];
}

type Slot = "none" | "lid" | "dust" | "crashMain" | "crashSide" | "snapNotch" | "snapTongue" | "snapHookL" | "snapHookR";

function slotsFor(style: CartonParams["style"]): { top: Slot[]; bottom: Slot[]; bottomLidOn: 0 | 2 | null } {
  const top: Slot[] = ["none", "dust", "lid", "dust"];
  switch (style) {
    case "ste":
      return { top, bottom: ["none", "dust", "lid", "dust"], bottomLidOn: 2 };
    case "rte":
      return { top, bottom: ["lid", "dust", "none", "dust"], bottomLidOn: 0 };
    case "crash":
      return { top, bottom: ["crashMain", "crashSide", "crashMain", "crashSide"], bottomLidOn: null };
    case "snap":
      return { top, bottom: ["snapNotch", "snapHookL", "snapTongue", "snapHookR"], bottomLidOn: null };
  }
}

export function buildBlank(p: CartonParams, r: Resolved): Blank {
  const { t, panelWidths: pw, bodyHeight: Hp } = r;
  const xs = [0, pw[0], pw[0] + pw[1], pw[0] + pw[1] + pw[2], pw[0] + pw[1] + pw[2] + pw[3]];
  const { top, bottom, bottomLidOn } = slotsFor(p.style);
  const c = r.Wi / 2 + t / 2;

  // Dust flaps lock on the edge facing the panel that receives the tuck.
  // Side A sits between Front (left) and Back (right); Side B between Back
  // (left) and, through the joint, Front (right).
  const lockSideFor = (panel: 1 | 3, lidOn: 0 | 2): "left" | "right" => {
    const receiving = lidOn === 2 ? 0 : 2;
    if (panel === 1) return receiving === 0 ? "left" : "right";
    return receiving === 0 ? "right" : "left";
  };

  const makePiece = (slot: Slot, i: number, which: "top" | "bottom"): Piece => {
    const w = pw[i];
    switch (slot) {
      case "none":
        return nonePiece(w);
      case "lid":
        return lidPiece({
          w,
          t,
          lidDepth: r.lidDepth,
          tuckDepth: r.tuckDepth,
          tuckRadius: r.tuckRadius,
          lock: p.lock,
          slitLength: r.slitLength,
          slitOffset: r.slitOffset,
          sideClear: r.sideClear,
          tamper: which === "top" ? p.tamper : "none",
          which,
        });
      case "dust": {
        const lidOn = which === "top" ? 2 : (bottomLidOn ?? 2);
        return dustPiece({ w, depth: r.dustDepth, lockSide: lockSideFor(i as 1 | 3, lidOn), lock: p.lock, slitLength: r.slitLength });
      }
      case "crashMain":
        return crashMainPiece({ w, t, c, e: r.bottomExtension });
      case "crashSide":
        return crashSidePiece(w, c);
      case "snapNotch":
        return snapNotchPiece(w, c, r.bottomExtension, clamp(r.Li - r.Wi + 1, 4, w - 10));
      case "snapTongue":
        return snapTonguePiece(w, c, r.bottomExtension);
      case "snapHookL":
      case "snapHookR": {
        const e2 = clamp(r.bottomExtension * 1.33, 3, Math.max(3, r.Li / 2 - c - 1));
        return snapHookPiece(w, c, e2, slot === "snapHookL" ? "left" : "right");
      }
    }
  };

  const topXf = (x0: number): Xf => ({ a: 1, b: 0, c: 0, d: -1, e: x0, f: 0 });
  const botXf = (x0: number): Xf => ({ a: 1, b: 0, c: 0, d: 1, e: x0, f: Hp });

  const outline: Seg[] = [];
  const strokes: Stroke[] = [];
  const regions: Region[] = [];
  const panels: Panel[] = [];

  const place = (piece: Piece, m: Xf, x0: number, which: "top" | "bottom") => {
    for (const s of piece.strokes) strokes.push({ layer: s.layer, seg: xfSeg(m, s.seg) });
    for (const rg of piece.regions) regions.push({ ...rg, pts: rg.pts.map((q) => xfApply(m, q)) });
    for (const lp of piece.panels) panels.push(localToPanel(lp, x0, which, Hp));
  };

  const topPieces = top.map((s, i) => makePiece(s, i, "top"));
  const botPieces = bottom.map((s, i) => makePiece(s, i, "bottom"));

  topPieces.forEach((pc, i) => {
    outline.push(...pc.outline.map((s) => xfSeg(topXf(xs[i]), s)));
    place(pc, topXf(xs[i]), xs[i], "top");
  });

  // Glue flap
  const g = r.glueWidth;
  const taper = Math.min(g * Math.tan((r.glueAngle * Math.PI) / 180), Hp / 3);
  const x4 = xs[4];
  const gf = [pt(x4, 0), pt(x4 + g, taper), pt(x4 + g, Hp - taper), pt(x4, Hp)];
  outline.push(line(gf[0], gf[1]), line(gf[1], gf[2]), line(gf[2], gf[3]));
  strokes.push({ layer: "crease", seg: line(pt(x4, 0), pt(x4, Hp)) });
  if (g > 4) regions.push({ layer: "glue", pts: insetConvex(gf, 1.5), label: "Glue" });
  panels.push({ id: "glueFlap", name: "Glue flap", x: x4, y: 0, w: g, h: Hp, printable: false });

  for (let i = 3; i >= 0; i--) {
    const pc = botPieces[i];
    outline.push(...reversePath(pc.outline.map((s) => xfSeg(botXf(xs[i]), s))));
    place(pc, botXf(xs[i]), xs[i], "bottom");
  }
  outline.push(line(pt(0, Hp), pt(0, 0)));

  for (let i = 1; i <= 3; i++) strokes.push({ layer: "crease", seg: line(pt(xs[i], 0), pt(xs[i], Hp)) });

  const names = ["Front", "Side A", "Back", "Side B"];
  const ids = ["front", "sideA", "back", "sideB"] as const;
  for (let i = 0; i < 4; i++) {
    panels.unshift({ id: ids[3 - i], name: names[3 - i], x: xs[3 - i], y: 0, w: pw[3 - i], h: Hp, printable: true });
  }

  const dims = buildDims(p, r, xs, panels);
  const texts = buildLabels(p, panels);
  strokes.push(...grainArrow(p, panels));
  return { outline, strokes, regions, panels, dims, texts };
}

function localToPanel(lp: LocalPanel, x0: number, which: "top" | "bottom", Hp: number): Panel {
  return {
    id: lp.id,
    name: lp.name,
    x: x0 + lp.u,
    y: which === "top" ? -(lp.v + lp.h) : Hp + lp.v,
    w: lp.w,
    h: lp.h,
    printable: lp.printable,
  };
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

function buildDims(p: CartonParams, r: Resolved, xs: number[], panels: Panel[]): Dimension[] {
  if (!p.showDimensions) return [];
  const Hp = r.bodyHeight;
  const y = Hp - Math.min(14, Hp * 0.12);
  const dims: Dimension[] = [];
  for (let i = 0; i < 4; i++) dims.push({ a: pt(xs[i], y), b: pt(xs[i + 1], y), offset: 0, text: fmt(r.panelWidths[i]) });
  const hx = Math.min(10, r.panelWidths[0] * 0.15);
  dims.push({ a: pt(hx, 0), b: pt(hx, Hp), offset: 0, text: fmt(Hp) });
  dims.push({ a: pt(xs[4], Hp / 2), b: pt(xs[4] + r.glueWidth, Hp / 2), offset: 0, text: fmt(r.glueWidth) });
  const lid = panels.find((q) => q.id === "topLid");
  if (lid) {
    const lx = lid.x + Math.min(12, lid.w * 0.15);
    dims.push({ a: pt(lx, lid.y + lid.h), b: pt(lx, lid.y), offset: 0, text: fmt(lid.h) });
    const tuck = panels.find((q) => q.id === "topTuck");
    if (tuck) dims.push({ a: pt(lid.x + lid.w - Math.min(14, lid.w * 0.2), tuck.y + tuck.h), b: pt(lid.x + lid.w - Math.min(14, lid.w * 0.2), tuck.y), offset: 0, text: fmt(tuck.h) });
  }
  const dx = xs[1] + r.panelWidths[1] / 2;
  dims.push({ a: pt(dx, 0), b: pt(dx, -r.dustDepth), offset: 0, text: fmt(r.dustDepth) });
  return dims;
}

function buildLabels(p: CartonParams, panels: Panel[]): TextItem[] {
  const out: TextItem[] = [];
  for (const q of panels) {
    if (q.w < 8 || q.h < 8) continue;
    const size = clamp(Math.min(q.w, q.h) * 0.09, 2.2, 5);
    const vertical = q.id === "glueFlap";
    out.push({
      at: pt(q.x + q.w / 2, q.y + q.h / 2),
      text: q.name.toUpperCase(),
      size,
      layer: "label",
      anchor: "middle",
      rotate: vertical ? -90 : 0,
    });
  }
  return out;
}

function grainArrow(p: CartonParams, panels: Panel[]): Stroke[] {
  const back = panels.find((q) => q.id === "back");
  if (!back) return [];
  const cx = back.x + back.w / 2;
  const cy = back.y + back.h * 0.32;
  const half = Math.min(back.w, back.h) * 0.18;
  const h = Math.min(3, half * 0.3);
  const segs: Seg[] =
    p.grain === "horizontal"
      ? [
          line(pt(cx - half, cy), pt(cx + half, cy)),
          line(pt(cx + half, cy), pt(cx + half - h, cy - h * 0.6)),
          line(pt(cx + half, cy), pt(cx + half - h, cy + h * 0.6)),
          line(pt(cx - half, cy), pt(cx - half + h, cy - h * 0.6)),
          line(pt(cx - half, cy), pt(cx - half + h, cy + h * 0.6)),
        ]
      : [
          line(pt(cx, cy - half), pt(cx, cy + half)),
          line(pt(cx, cy - half), pt(cx - h * 0.6, cy - half + h)),
          line(pt(cx, cy - half), pt(cx + h * 0.6, cy - half + h)),
          line(pt(cx, cy + half), pt(cx - h * 0.6, cy + half - h)),
          line(pt(cx, cy + half), pt(cx + h * 0.6, cy + half - h)),
        ];
  return segs.map((seg) => ({ seg, layer: "label" as const }));
}
