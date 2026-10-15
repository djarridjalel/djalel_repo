// Closure pieces (lids, dust flaps, lock bottoms) drawn in a local frame:
// u runs along the hinge from 0 to w (left to right as seen on the flat
// blank), v runs outward from the body. Every piece's outline starts at
// (0, 0) and ends at (w, 0) so pieces chain around the blank.

import {
  arc,
  circle,
  clamp,
  euroSlot,
  filletPolyline,
  insetConvex,
  line,
  pt,
  reversePath,
  xfSeg,
  type Pt,
  type Seg,
} from "./geom";
import type { Layer, LockType, PanelId, Region, Stroke, TamperType } from "./types";

export interface LocalPanel {
  id: PanelId;
  name: string;
  u: number;
  v: number;
  w: number;
  h: number;
  printable: boolean;
}

export interface Piece {
  outline: Seg[];
  strokes: Stroke[];
  regions: Region[];
  panels: LocalPanel[];
}

const S = (seg: Seg, layer: Layer): Stroke => ({ seg, layer });

const mirrorU = (w: number) => ({ a: -1, b: 0, c: 0, d: 1, e: w, f: 0 });

/** Mirrors a piece left-to-right while keeping its outline running from u=0 to u=w. */
function mirrorPiece(p: Piece, w: number): Piece {
  const m = mirrorU(w);
  return {
    outline: reversePath(p.outline.map((s) => xfSeg(m, s))),
    strokes: p.strokes.map((s) => ({ ...s, seg: xfSeg(m, s.seg) })),
    regions: p.regions.map((r) => ({ ...r, pts: r.pts.map((q) => pt(w - q.x, q.y)) })),
    panels: p.panels.map((q) => ({ ...q, u: w - q.u - q.w })),
  };
}

export function nonePiece(w: number): Piece {
  return { outline: [line(pt(0, 0), pt(w, 0))], strokes: [], regions: [], panels: [] };
}

export interface LidSpec {
  w: number;
  t: number;
  lidDepth: number;
  tuckDepth: number;
  tuckRadius: number;
  lock: LockType;
  slitLength: number;
  slitOffset: number;
  sideClear: number;
  tamper: TamperType;
  which: "top" | "bottom";
}

/**
 * Lid with tuck flap. The hinge crease sits one caliper out from the body
 * edge so the lid closes over the dust flaps folded beneath it.
 */
export function lidPiece(s: LidSpec): Piece {
  const { w, t, lidDepth, tuckDepth, lock, slitLength: sl, slitOffset: so, sideClear: sc, tamper } = s;
  const vH = t;
  const vT = t + lidDepth;
  const vE = vT + tuckDepth;
  const strokes: Stroke[] = [];
  const regions: Region[] = [];

  // Thumb notch for the tear strip, cut into the lid's left edge.
  const stripA = vH + clamp(lidDepth * 0.12, 3, 6);
  const stripW = clamp(lidDepth * 0.12, 4, 6);
  const leftEdge: Seg[] = [];
  if (tamper === "tearStrip") {
    leftEdge.push(line(pt(0, 0), pt(0, stripA)));
    leftEdge.push(arc(pt(0, stripA + stripW / 2), stripW / 2, pt(0, stripA), pt(0, stripA + stripW), true));
  }
  const leftStart = tamper === "tearStrip" ? pt(0, stripA + stripW) : pt(0, 0);

  let outline: Seg[];
  if (lock === "slit") {
    const R = s.tuckRadius;
    const j1 = pt(sc, vT + so);
    const j2 = pt(w - sc, vT + so);
    const pts: Pt[] = [leftStart, pt(0, vT - 3), j1, pt(sc, vE), pt(w - sc, vE), j2, pt(w, vT - 3), pt(w, 0)];
    outline = [...leftEdge, ...filletPolyline(pts, [0, 0, 0, R, R, 0, 0, 0])];
    // Lock slits: a cut parallel to the tuck crease, curving back onto it.
    strokes.push(S(line(j1, pt(sl - so, vT + so)), "cut"));
    strokes.push(S(arc(pt(sl - so, vT), so, pt(sl - so, vT + so), pt(sl, vT), false), "cut"));
    strokes.push(S(line(j2, pt(w - sl + so, vT + so)), "cut"));
    strokes.push(S(arc(pt(w - sl + so, vT), so, pt(w - sl + so, vT + so), pt(w - sl, vT), true), "cut"));
    strokes.push(S(line(pt(sl, vT), pt(w - sl, vT)), "crease"));
  } else {
    const R = s.tuckRadius;
    const sh = lock === "friction" ? 1 : 0.5;
    const pts: Pt[] = [
      leftStart,
      pt(0, vT),
      pt(sc + sh, vT + sh),
      pt(sc + sh, vE),
      pt(w - sc - sh, vE),
      pt(w - sc - sh, vT + sh),
      pt(w, vT),
      pt(w, 0),
    ];
    outline = [...leftEdge, ...filletPolyline(pts, [0, 0, 0, R, R, 0, 0, 0])];
    strokes.push(S(line(pt(0, vT), pt(w, vT)), "crease"));
  }
  strokes.push(S(line(pt(0, vH), pt(w, vH)), "crease"));

  if (tamper === "tearStrip") {
    strokes.push(S(line(pt(0, stripA), pt(w, stripA)), "perf"));
    strokes.push(S(line(pt(0, stripA + stripW), pt(w, stripA + stripW)), "perf"));
  }
  if (tamper === "glueTuck" || tamper === "tearStrip") {
    const R = s.tuckRadius;
    const v0 = vT + Math.max(so, 1) + 1.5;
    let vP = v0;
    if (tamper === "glueTuck") {
      vP = vT + clamp(tuckDepth * 0.35, so + 1.5, tuckDepth - 4);
      strokes.push(S(line(pt(sc, vP), pt(w - sc, vP)), "perf"));
      vP += 1.5;
    }
    const top = vE - Math.max(R, 2) - 0.5;
    const hasRoom = top - vP >= 3;
    const u0 = hasRoom ? sc + 2 : sc + R;
    const u1 = hasRoom ? w - sc - 2 : w - sc - R;
    const v1 = hasRoom ? top : vE - 2;
    if (u1 - u0 > 2 && v1 - vP > 1.5) {
      regions.push({
        layer: "glue",
        pts: [pt(u0, vP), pt(u1, vP), pt(u1, v1), pt(u0, v1)],
        label: "Glue",
      });
    }
  }

  const lidId: PanelId = s.which === "top" ? "topLid" : "bottomLid";
  const tuckId: PanelId = s.which === "top" ? "topTuck" : "bottomTuck";
  return {
    outline,
    strokes,
    regions,
    panels: [
      { id: lidId, name: s.which === "top" ? "Top lid" : "Bottom lid", u: 0, v: vH, w, h: lidDepth, printable: true },
      { id: tuckId, name: s.which === "top" ? "Top tuck" : "Bottom tuck", u: sc, v: vT, w: w - 2 * sc, h: tuckDepth, printable: false },
    ],
  };
}

export interface DustSpec {
  w: number;
  depth: number;
  lockSide: "left" | "right";
  lock: LockType;
  slitLength: number;
}

/** Dust flap. The lock side keeps a square shoulder that catches in the tuck slit. */
export function dustPiece(s: DustSpec): Piece {
  const { w, depth: d, lock } = s;
  const tl = clamp(d * 0.12, 1, 5);
  const tr = clamp(d * 0.12, 1.5, 6);
  const rc = clamp(d * 0.08, 0.5, 2);
  let pts: Pt[];
  if (lock === "none") {
    pts = [pt(0, 0), pt(1, 1.5), pt(tl, d), pt(w - tr, d), pt(w - 1, 1.5), pt(w, 0)];
  } else {
    const sh = lock === "slit" ? clamp(Math.min(5, s.slitLength - 1), 1, d * 0.4) : clamp(3, 1, d * 0.3);
    pts = [pt(0, 0), pt(0, sh), pt(tl, d), pt(w - tr, d), pt(w - 1, 1.5), pt(w, 0)];
  }
  const radii = pts.map((_, i) => (i === 2 || i === 3 ? rc : 0));
  const piece: Piece = {
    outline: filletPolyline(pts, radii),
    strokes: [S(line(pt(0, 0), pt(w, 0)), "crease")],
    regions: [],
    panels: [],
  };
  return s.lockSide === "left" ? piece : mirrorPiece(piece, w);
}

export interface CrashSpec {
  w: number;
  t: number;
  /** Depth from the hinge to the centre line of the base. */
  c: number;
  /** How far the locking tongue reaches past the centre line. */
  e: number;
}

/**
 * Crash-lock (auto) bottom flap on a length panel. A 45° crease from the
 * right-hand corner turns the right end into a glue panel that is glued to
 * the neighbouring side flap on the folder-gluer; the left half carries the
 * tongue that crosses the centre line, the middle a recess for the opposite
 * flap's tongue.
 */
export function crashMainPiece(s: CrashSpec): Piece {
  const { w, t, c, e } = s;
  const d = t / 2;
  const D = c + e;
  const a = clamp(e * 0.2, 1, 3);
  const un = w / 2 - d;
  const ch = Math.max(0, e - 3);
  const k = clamp(c * 0.35, 3, c - 3);
  const pts: Pt[] = [
    pt(0, 0),
    pt(a, D),
    pt(un - ch, D),
    pt(un, c + 3),
    pt(un, c),
    pt(w - c, c),
    pt(w - c + e, D),
    pt(w - d, D),
    pt(w - d, 2 * k - d),
    pt(w - k, k),
    pt(w, 0),
  ];
  const gluePanel = [pt(w - c, c), pt(w - k, k), pt(w - d, 2 * k - d), pt(w - d, D), pt(w - c + e, D)];
  return {
    outline: filletPolyline(pts),
    strokes: [S(line(pt(0, 0), pt(w, 0)), "crease"), S(line(pt(w - c, c), pt(w - k, k)), "crease")],
    regions: [{ layer: "glue", pts: insetConvex(gluePanel, 1.5), label: "Glue" }],
    panels: [],
  };
}

/** Crash-lock side flap: 60° on the left (meets a glue panel), 45° on the right. */
export function crashSidePiece(w: number, c: number): Piece {
  const s60 = c * Math.tan(Math.PI / 6);
  return {
    outline: filletPolyline([pt(0, 0), pt(s60, c), pt(w - c, c), pt(w, 0)]),
    strokes: [S(line(pt(0, 0), pt(w, 0)), "crease")],
    regions: [],
    panels: [],
  };
}

/** Snap-lock (1-2-3) flap with a central recess reaching back to the centre line. */
export function snapNotchPiece(w: number, c: number, e: number, notchW: number): Piece {
  const D = c + e;
  const n0 = (w - notchW) / 2;
  const n1 = (w + notchW) / 2;
  const pts = [pt(0, 0), pt(0, D), pt(n0, D), pt(n0, c), pt(n1, c), pt(n1, D), pt(w, D), pt(w, 0)];
  return {
    outline: filletPolyline(pts, [0, 0, 1, 0, 0, 1, 0, 0]),
    strokes: [S(line(pt(0, 0), pt(w, 0)), "crease")],
    regions: [],
    panels: [],
  };
}

/** Snap-lock flap with 45° shoulders and a central tongue. */
export function snapTonguePiece(w: number, c: number, e: number): Piece {
  const D = c + e;
  const pts = [pt(0, 0), pt(c, c), pt(c, D), pt(w - c, D), pt(w - c, c), pt(w, 0)];
  return {
    outline: filletPolyline(pts, [0, 0, 3, 3, 0, 0]),
    strokes: [S(line(pt(0, 0), pt(w, 0)), "crease")],
    regions: [],
    panels: [],
  };
}

/** Snap-lock side flap with a hook; the 45° edge faces the recessed flap. */
export function snapHookPiece(w: number, c: number, e: number, side45: "left" | "right"): Piece {
  const D = c + e;
  const hb = (D - c) * Math.tan((15 * Math.PI) / 180);
  const pts = [pt(0, 0), pt(c, c), pt(c - hb, D), pt(w - Math.min(0.9, w * 0.02), D), pt(w, 0)];
  const piece: Piece = {
    outline: filletPolyline(pts, [0, 0, 3, 0, 0]),
    strokes: [S(line(pt(0, 0), pt(w, 0)), "crease")],
    regions: [],
    panels: [],
  };
  return side45 === "left" ? piece : mirrorPiece(piece, w);
}

/**
 * Hanger above a panel: two sections of height `h` either side of a fold,
 * folded back and glued so the slot goes through both layers.
 */
export function hangerPiece(w: number, h: number, slot: "euro" | "round"): Piece {
  const r = clamp(w * 0.08, 1, 4);
  const outline = filletPolyline([pt(0, 0), pt(0, 2 * h), pt(w, 2 * h), pt(w, 0)], [0, r, r, 0]);
  const e = clamp(h * 0.42, 6, 12);
  const strokes: Stroke[] = [S(line(pt(0, 0), pt(w, 0)), "crease"), S(line(pt(0, h), pt(w, h)), "crease")];
  const sw = clamp(w * 0.55, 14, 30);
  const holes =
    slot === "euro"
      ? [...euroSlot(w / 2, h - e, sw, 7, 4, 1), ...euroSlot(w / 2, h + e, sw, 7, 4, -1)]
      : [...circle(pt(w / 2, h - e), 4), ...circle(pt(w / 2, h + e), 4)];
  for (const seg of holes) strokes.push(S(seg, "cut"));
  return {
    outline,
    strokes,
    regions: [],
    panels: [{ id: "hanger", name: "Hanger", u: 0, v: 0, w, h, printable: true }],
  };
}
