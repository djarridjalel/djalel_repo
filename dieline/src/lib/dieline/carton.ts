// Assembles a four-panel folding carton (tube with manufacturer's joint)
// from its closure pieces.
//
// Panel order on the flat blank, left to right:
//   glue flap | Side B (W) | Front (L + t) | Side A (W + t) | Back (L + t, free edge)
// The joint closes at the corner between Back and Side B, away from the
// front and from tear lines that run down from the front. The reverse tuck
// end keeps the standard layout instead:
//   glue flap | Front (L) | Side A (W + t) | Back (L + t) | Side B (W + t, free edge) Crease-to-crease
// widths carry thickness allowances so the erected carton keeps the
// requested inside dimensions. On the folder-gluer the second and fourth
// creases (Side B | Front, Side A | Back) are folded flat.

import {
  crashMainPiece,
  classicDustPiece,
  crashSidePiece,
  dustPiece,
  gableEndPiece,
  gableRoofPiece,
  hangerPiece,
  lidPiece,
  lockTabPiece,
  mirrorPiece,
  nonePiece,
  snapHookPiece,
  snapNotchPiece,
  snapTonguePiece,
  type LocalPanel,
  type Piece,
} from "./closures";
import type { ClosurePiece, FoldResult } from "./fold";
import { arc3, clamp, insetConvex, line, pt, reversePath, xfApply, xfSeg, type Seg, type Xf } from "./geom";
import { hasTopLid, isTray, type CartonParams, type Dimension, type Panel, type Region, type Resolved, type Stroke, type TextItem } from "./types";

export interface Blank {
  outline: Seg[];
  strokes: Stroke[];
  regions: Region[];
  panels: Panel[];
  dims: Dimension[];
  texts: TextItem[];
  /** End closures in their local frames, for the closing check. */
  closures?: ClosurePiece[];
  /** Closing checks computed by builders that are not tubes. */
  fold?: FoldResult;
}

type Slot =
  | "none"
  | "hanger"
  | "lockTab"
  | "lid"
  | "dust"
  | "crashMain"
  | "crashSide"
  | "snapNotch"
  | "snapTongue"
  | "snapHookL"
  | "snapHookR"
  | "gableRoof"
  | "gableEnd";

function slotsFor(style: CartonParams["style"]): { top: Slot[]; bottom: Slot[]; bottomLidOn: 0 | 2 | null } {
  const top: Slot[] = ["none", "dust", "lid", "dust"];
  switch (style) {
    case "ste":
      return { top, bottom: ["none", "dust", "lid", "dust"], bottomLidOn: 2 };
    case "rte":
      return { top, bottom: ["lid", "dust", "none", "dust"], bottomLidOn: 0 };
    case "crash":
    case "srp":
      return { top, bottom: ["crashMain", "crashSide", "crashMain", "crashSide"], bottomLidOn: null };
    case "snap":
    case "srpSnap":
      return { top, bottom: ["snapNotch", "snapHookL", "snapTongue", "snapHookR"], bottomLidOn: null };
    case "gable":
      return { top: ["gableRoof", "gableEnd", "gableRoof", "gableEnd"], bottom: ["snapNotch", "snapHookL", "snapTongue", "snapHookR"], bottomLidOn: null };
    default:
      return { top, bottom: ["none", "dust", "lid", "dust"], bottomLidOn: 2 };
  }
}

/**
 * Physical order of the panels (0 Front, 1 Side A, 2 Back, 3 Side B) on the
 * blank, left to right after the glue flap. The reverse tuck end keeps the
 * industry-standard layout with the glue flap on the front's edge; the other
 * tubes put Side B next to the glue flap so the joint closes at a back corner.
 */
const orderFor = (style: CartonParams["style"]): readonly number[] => (style === "rte" ? [0, 1, 2, 3] : [3, 0, 1, 2]);

export function buildBlank(p: CartonParams, r: Resolved): Blank {
  const { t, panelWidths: pw, bodyHeight: Hp } = r;
  const ORDER = orderFor(p.style);
  // X[i]: left edge of panel i on the blank.
  const X = [0, 0, 0, 0];
  let total = 0;
  for (const i of ORDER) {
    X[i] = total;
    total += pw[i];
  }
  const { top, bottom, bottomLidOn } = slotsFor(p.style);
  if (p.hangTab.enabled && hasTopLid(p.style)) top[0] = "hanger";
  // Lock tab on the panel that receives each tuck.
  const tabTop = p.lockTab && top[0] === "none";
  if (tabTop) top[0] = "lockTab";
  const bottomRecv = bottomLidOn === 0 ? 2 : bottomLidOn === 2 ? 0 : -1;
  const tabBottom = p.lockTab && bottomRecv >= 0 && bottom[bottomRecv] === "none";
  if (tabBottom) bottom[bottomRecv] = "lockTab";
  const tabW = clamp(pw[0] * 0.44, 12, 50);
  const tabStrip = clamp(r.tuckDepth * 0.8, 6, Hp * 0.3);
  const tabTongue = clamp(Math.min(tabW * 0.23, tabStrip - 3), 3, 10);
  const c = r.Wi / 2 + t / 2;
  // Snap-lock proportions from the studio's working sample: the front and
  // back flaps reach past the centre line by the base lock reach, which is
  // also the notch depth and the tab length, so the tongue narrows to its tab
  // exactly where the notch begins. Each hook lobe sits 2 mm outside a side
  // edge of the tab, part-way along it.
  const snapLb = pw[0];
  const snapE = r.bottomExtension;
  const snapNotchW = clamp(snapLb * 0.4, 8, snapLb - 8);
  const snapTabW = snapNotchW - 2 * Math.max(t, 0.75);
  const snapLobeDepth = snapLb / 2 + snapTabW / 2 + 2;
  const snapR = Math.max(3, Math.min(Math.min(pw[1], pw[3]) * 0.167, snapLb * 0.147, snapLb - snapLobeDepth - 1.5));
  const snap = {
    D: c + snapE,
    notchW: snapNotchW,
    notchD: snapE,
    tabW: snapTabW,
    r: snapR,
    lobeDepth: snapLobeDepth,
    lobeFromNotch: c - snapE + 0.614 * snapE,
  };

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
      case "hanger":
        return hangerPiece(w, r.hangerHeight, p.hangTab.slot);
      case "lockTab":
        return lockTabPiece({ w, t, width: tabW, height: Math.max(8, r.tuckDepth - 1), strip: tabStrip, tongue: tabTongue });
      case "gableRoof":
        return gableRoofPiece({ w, roof: Math.max(5, r.Wi / 2 - t / 2), handle: p.gable.handleHeight, holeW: p.gable.holeWidth, holeH: p.gable.holeHeight, glue: i === 2 });
      case "gableEnd":
        return gableEndPiece({ w, t, apex: p.gable.handleHeight, slotH: p.gable.handleHeight * 0.7 + 6 });
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
          tabSlit: (which === "top" ? tabTop : tabBottom) ? { width: tabW + 0.4, hole: tabTongue } : undefined,
          middleFold: which === "top" && isTray(p.style) ? { thumb: clamp(pw[2] * 0.35, 0, 60) } : undefined,
        });
      case "dust": {
        const lidOn = which === "top" ? 2 : (bottomLidOn ?? 2);
        const spec = { w, depth: r.dustDepth, lockSide: lockSideFor(i as 1 | 3, lidOn), lock: p.lock, slitLength: r.slitLength };
        return p.style === "rte" ? classicDustPiece(spec) : dustPiece(spec);
      }
      // Mirrored so the glued corners sit on the creases folded flat on the gluer.
      case "crashMain":
        return mirrorPiece(crashMainPiece({ w, t, c, e: r.bottomExtension }), w);
      case "crashSide":
        return mirrorPiece(crashSidePiece(w, c), w);
      case "snapNotch":
        return snapNotchPiece({ w, t, D: snap.D, notchW: snap.notchW, notchD: snap.notchD });
      case "snapTongue":
        return snapTonguePiece({ w, shoulder: c, D: snap.D, tabW: snap.tabW });
      case "snapHookL":
      case "snapHookR":
        return snapHookPiece({ w, t, r: snap.r, lobeDepth: snap.lobeDepth, lobeFromNotch: snap.lobeFromNotch, diagonal: slot === "snapHookL" ? "left" : "right" });
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
  const handle = p.gable.handleHeight;
  const metaFor = (slot: Slot, i: number): Record<string, number> | undefined =>
    slot === "lid"
      ? { tuckDepth: r.tuckDepth }
      : slot === "crashMain"
        ? // Mirrored pieces: the glued triangle lies beyond the 45° crease u = v.
          { glueBeyondUeqV: 1 }
      : slot === "gableRoof"
        ? { roof: Math.max(5, r.Wi / 2 - t / 2), handleEnd: handle * 0.7 }
        : slot === "gableEnd"
          ? { slotH: Math.min(handle * 0.7 + 6, handle - 6), slotW: Math.max(2 * t + 1, 2.5) }
          : slot === "snapHookL" || slot === "snapHookR"
            ? // The rounded lobe, as drawn: centre, radius and the side it bulges to.
              slot === "snapHookR"
              ? { lobeU: pw[i] - snap.lobeFromNotch, lobeV: snap.lobeDepth, lobeR: snap.r, bulge: 1 }
              : { lobeU: snap.lobeFromNotch, lobeV: snap.lobeDepth, lobeR: snap.r, bulge: -1 }
            : undefined;
  const closures: ClosurePiece[] = [
    ...top.map((slot, i) => ({ which: "top" as const, panel: i as 0 | 1 | 2 | 3, slot, w: pw[i], outline: topPieces[i].outline, meta: metaFor(slot, i) })),
    ...bottom.map((slot, i) => ({ which: "bottom" as const, panel: i as 0 | 1 | 2 | 3, slot, w: pw[i], outline: botPieces[i].outline, meta: metaFor(slot, i) })),
  ];

  for (const i of ORDER) {
    outline.push(...topPieces[i].outline.map((s) => xfSeg(topXf(X[i]), s)));
    place(topPieces[i], topXf(X[i]), X[i], "top");
  }
  // Free edge of the back panel.
  outline.push(line(pt(total, 0), pt(total, Hp)));
  for (const i of [...ORDER].reverse()) {
    outline.push(...reversePath(botPieces[i].outline.map((s) => xfSeg(botXf(X[i]), s))));
    place(botPieces[i], botXf(X[i]), X[i], "bottom");
  }

  // Glue flap on the left of Side B, glued inside the back panel's free edge.
  const g = r.glueWidth;
  const taper = Math.min(g * Math.tan((r.glueAngle * Math.PI) / 180), Hp / 3);
  outline.push(line(pt(0, Hp), pt(-g, Hp - taper)), line(pt(-g, Hp - taper), pt(-g, taper)), line(pt(-g, taper), pt(0, 0)));
  strokes.push({ layer: "crease", seg: line(pt(0, 0), pt(0, Hp)) });
  panels.push({ id: "glueFlap", name: "Glue flap", x: -g, y: 0, w: g, h: Hp, printable: false });
  /** Left edge of the glue flap at height y. */
  const glueEdge = (y: number) => -g * (taper > 0 ? Math.min(1, y / taper, (Hp - y) / taper) : 1);
  /** Glue area between two heights, kept 1.5 mm inside the flap. */
  const glueBand = (ya: number, yb: number) => {
    if (yb - ya < 6 || g <= 4) return;
    const pts = [pt(0, ya), pt(0, yb), pt(glueEdge(yb), yb)];
    if (Hp - taper < yb && Hp - taper > ya) pts.push(pt(-g, Hp - taper));
    if (taper < yb && taper > ya) pts.push(pt(-g, taper));
    pts.push(pt(glueEdge(ya), ya));
    const clean = pts.filter((q, i) => {
      const n = pts[(i + 1) % pts.length];
      return Math.hypot(q.x - n.x, q.y - n.y) > 1e-6;
    });
    regions.push({ layer: "glue", pts: insetConvex(clean, 1.5), label: "Glue" });
  };

  const perf = (seg: Seg) => strokes.push({ layer: "perf", seg });
  if (p.zipStrip.enabled) {
    // Zip strip: two perforations right round the body and across the glue
    // flap, which is left unglued where the strip passes. It is opened from
    // a thumb tab cut into the strip near the front's left corner.
    const y1 = r.zipFromTop;
    const y2 = y1 + r.zipWidth;
    for (const y of [y1, y2]) perf(line(pt(glueEdge(y), y), pt(total, y)));
    glueBand(0, y1 - 1.5);
    glueBand(y2 + 1.5, Hp);
    const m = Math.min(0.6, r.zipWidth * 0.1);
    const rr = r.zipWidth / 2 - m;
    const cx = X[0] + clamp(pw[0] * 0.15, rr + 4, 15);
    strokes.push({ layer: "cut", seg: arc3(pt(cx, y1 + m), pt(cx - rr, (y1 + y2) / 2), pt(cx, y2 - m)) });
  } else glueBand(0, Hp);

  if (isTray(p.style)) {
    // Tear-away front: across the front, then down both sides from the back
    // corners. The joint sits at a back corner, so the tear never crosses it.
    const d = clamp(p.srp.tearDepth > 0 ? p.srp.tearDepth : Math.round(Hp / 2), 10, Math.max(10, Hp - 10));
    const fw = Math.min(p.srp.fingerWidth, pw[0] * 0.6);
    const sg = Math.min(fw * 0.375, Hp - d - 8);
    const x0 = X[0];
    const x1 = X[0] + pw[0];
    const cx = (x0 + x1) / 2;
    if (fw >= 10 && sg >= 4) {
      perf(line(pt(x0, d), pt(cx - fw / 2, d)));
      perf(arc3(pt(cx - fw / 2, d), pt(cx, d + sg), pt(cx + fw / 2, d)));
      perf(line(pt(cx + fw / 2, d), pt(x1, d)));
    } else perf(line(pt(x0, d), pt(x1, d)));
    perf(line(pt(X[1], d), pt(X[1] + pw[1], 0)));
    perf(line(pt(X[3], 0), pt(X[3] + pw[3], d)));
  }

  // Folds between neighbouring panels, in their order on the blank.
  for (const i of ORDER.slice(1)) strokes.push({ layer: "crease", seg: line(pt(X[i], 0), pt(X[i], Hp)) });

  const names = ["Front", "Side A", "Back", "Side B"];
  const ids = ["front", "sideA", "back", "sideB"] as const;
  for (let i = 3; i >= 0; i--) panels.unshift({ id: ids[i], name: names[i], x: X[i], y: 0, w: pw[i], h: Hp, printable: true });

  const dims = buildDims(p, r, X, panels);
  const texts = buildLabels(p, panels);
  strokes.push(...grainArrow(p, panels));
  return { outline, strokes, regions, panels, dims, texts, closures };
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

function buildDims(p: CartonParams, r: Resolved, X: number[], panels: Panel[]): Dimension[] {
  if (!p.showDimensions) return [];
  const Hp = r.bodyHeight;
  const pw = r.panelWidths;
  const y = Hp - Math.min(14, Hp * 0.12);
  const dims: Dimension[] = [];
  for (let i = 0; i < 4; i++) dims.push({ a: pt(X[i], y), b: pt(X[i] + pw[i], y), offset: 0, text: fmt(pw[i]) });
  const first = X.indexOf(0);
  const hx = Math.min(10, pw[first] * 0.15);
  dims.push({ a: pt(hx, 0), b: pt(hx, Hp), offset: 0, text: fmt(Hp) });
  dims.push({ a: pt(-r.glueWidth, Hp / 2), b: pt(0, Hp / 2), offset: 0, text: fmt(r.glueWidth) });
  const lid = panels.find((q) => q.id === "topLid");
  if (lid) {
    const lx = lid.x + Math.min(12, lid.w * 0.15);
    dims.push({ a: pt(lx, lid.y + lid.h), b: pt(lx, lid.y), offset: 0, text: fmt(lid.h) });
    const tuck = panels.find((q) => q.id === "topTuck");
    if (tuck) dims.push({ a: pt(lid.x + lid.w - Math.min(14, lid.w * 0.2), tuck.y + tuck.h), b: pt(lid.x + lid.w - Math.min(14, lid.w * 0.2), tuck.y), offset: 0, text: fmt(tuck.h) });
  }
  const dx = X[1] + pw[1] / 2;
  dims.push({ a: pt(dx, 0), b: pt(dx, -r.dustDepth), offset: 0, text: fmt(r.dustDepth) });
  return dims;
}

export function buildLabels(p: CartonParams, panels: Panel[]): TextItem[] {
  const out: TextItem[] = [];
  for (const q of panels) {
    if (q.w < 8 || q.h < 8) continue;
    const size = clamp(Math.min(q.w, q.h) * 0.09, 2.2, 5);
    const vertical = q.id === "glueFlap";
    out.push({
      // The hanger's centre holds the slot, so its name sits near the body.
      at: pt(q.x + q.w / 2, q.id === "hanger" ? q.y + q.h - 3 : q.id === "handle" ? q.y + Math.min(5, q.h * 0.15) + size / 2 : q.y + q.h / 2),
      text: q.name.toUpperCase(),
      size,
      layer: "label",
      anchor: "middle",
      rotate: vertical ? -90 : 0,
    });
  }
  return out;
}

export function grainArrow(p: CartonParams, panels: Panel[]): Stroke[] {
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
