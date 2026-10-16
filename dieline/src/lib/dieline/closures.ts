// Closure pieces (lids, dust flaps, lock bottoms) drawn in a local frame:
// u runs along the hinge from 0 to w (left to right as seen on the flat
// blank), v runs outward from the body. Every piece's outline starts at
// (0, 0) and ends at (w, 0) so pieces chain around the blank.

import {
  arc,
  arc3,
  circle,
  clamp,
  euroSlot,
  filletPolyline,
  insetConvex,
  line,
  pt,
  reversePath,
  roundedRect,
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
export function mirrorPiece(p: Piece, w: number): Piece {
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
  /** Slit across the middle of the tuck fold that a lock tab passes through, with a finger hole. */
  tabSlit?: { width: number; hole: number };
  /** Crease across the middle of the lid with a finger tab (shelf-ready tray). */
  middleFold?: { thumb: number };
}

/** Replaces horizontal creases at v with the parts outside [u0, u1]. */
function splitCrease(strokes: Stroke[], v: number, u0: number, u1: number) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const st = strokes[i];
    if (st.layer !== "crease" || st.seg.kind !== "line") continue;
    const { a, b } = st.seg;
    if (Math.abs(a.y - v) > 1e-6 || Math.abs(b.y - v) > 1e-6) continue;
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    strokes.splice(i, 1);
    if (u0 > lo) strokes.push(S(line(pt(lo, v), pt(Math.min(u0, hi), v)), "crease"));
    if (u1 < hi) strokes.push(S(line(pt(Math.max(u1, lo), v), pt(hi, v)), "crease"));
  }
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

  if (s.tabSlit) {
    const cx = w / 2;
    const hw = s.tabSlit.width / 2;
    const rh = s.tabSlit.hole;
    const vc = vT + so;
    splitCrease(strokes, vT, cx - hw, cx + hw);
    strokes.push(S(line(pt(cx - hw, vT), pt(cx - hw, vc)), "cut"));
    strokes.push(S(line(pt(cx - hw, vc), pt(cx + hw, vc)), "cut"));
    strokes.push(S(line(pt(cx + hw, vc), pt(cx + hw, vT)), "cut"));
    strokes.push(S(arc3(pt(cx - rh, vc), pt(cx, vc - rh), pt(cx + rh, vc)), "cut"));
  }
  if (s.middleFold) {
    const vm = vH + lidDepth / 2;
    const r = Math.min(s.middleFold.thumb / 2, lidDepth / 2 - 3);
    const cx = w / 2;
    if (r > 3) {
      strokes.push(S(line(pt(0, vm), pt(cx - r, vm)), "crease"), S(line(pt(cx + r, vm), pt(w, vm)), "crease"));
      strokes.push(S(arc3(pt(cx - r, vm), pt(cx, vm - r), pt(cx + r, vm)), "cut"));
    } else strokes.push(S(line(pt(0, vm), pt(w, vm)), "crease"));
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

/**
 * Dust flap of the standard reverse tuck end. On the side facing the panel
 * that receives the tuck it keeps a square shoulder (caught by the tuck's
 * lock slit) and then a long lead-in; on the side next to the lid's fold it
 * is set back so the lid closes over it.
 */
export function classicDustPiece(s: DustSpec): Piece {
  const { w, depth: d, lock } = s;
  const c = clamp(w * 0.14, 1.5, 5);
  const e = clamp(c * 0.55, 0.8, 3);
  const sh = lock === "slit" ? clamp(s.slitLength, 1.5, d * 0.35) : clamp(d * 0.12, 1, 3);
  const a1 = clamp(w * 0.117, 1.2, 5);
  const a2 = clamp(w * 0.31, a1 + 1, Math.max(a1 + 1, w - c - 3));
  const y1 = Math.min(sh + a1 * 0.75, d - 1);
  const pts = [pt(0, 0), pt(0, sh), pt(a1, y1), pt(a2, d), pt(w - c, d), pt(w - c, e), pt(w, 0)];
  const piece: Piece = {
    outline: filletPolyline(pts),
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

// Snap-lock (1-2-3) bottom, after the studio's reference drawing. The two
// length panels carry a flap with a wide centred notch and a flap with a
// matching tongue on angled shoulders; the two width panels carry hook flaps
// whose rounded lobes catch the notch flap. Each hook's diagonal edge faces
// the notch panel.

/** Notch flap: full width, depth D, with a centred notch of width notchW and depth notchD at its tip. */
export function snapNotchPiece(s: { w: number; t: number; D: number; notchW: number; notchD: number }): Piece {
  const { w, t, D, notchW, notchD } = s;
  const i = t / 2;
  const n0 = (w - notchW) / 2;
  const n1 = n0 + notchW;
  const flare = notchW * 0.026;
  const pts = [pt(0, 0), pt(i, D), pt(n0 - flare, D), pt(n0, D - notchD), pt(n1, D - notchD), pt(n1 + flare, D), pt(w - i, D), pt(w, 0)];
  return { outline: filletPolyline(pts), strokes: [S(line(pt(0, 0), pt(w, 0)), "crease")], regions: [], panels: [] };
}

/** Tongue flap: shoulders run from the hinge corners in to a centred tab of width tabW reaching depth D. */
export function snapTonguePiece(s: { w: number; shoulder: number; D: number; tabW: number }): Piece {
  const { w, shoulder, D, tabW } = s;
  const a = (w - tabW) / 2;
  const r = clamp(Math.min(tabW / 3, (D - shoulder) * 0.6), 0, 12);
  const pts = [pt(0, 0), pt(a, shoulder), pt(a, D), pt(w - a, D), pt(w - a, shoulder), pt(w, 0)];
  return { outline: filletPolyline(pts, [0, 0, r, r, 0, 0]), strokes: [S(line(pt(0, 0), pt(w, 0)), "crease")], regions: [], panels: [] };
}

/** Hook flap of depth D with a rounded lobe; `diagonal` is the side facing the notch panel. */
export function snapHookPiece(s: { w: number; t: number; D: number; diagonal: "left" | "right" }): Piece {
  const { w, t, D } = s;
  const r = Math.min(w * 0.167, D * 0.245);
  const c = pt(w * 0.556, D - r);
  const at = (deg: number) => pt(c.x + r * Math.cos((deg * Math.PI) / 180), c.y + r * Math.sin((deg * Math.PI) / 180));
  const bottom = pt(c.x, D);
  const barb = at(-75);
  const outline: Seg[] = [line(pt(0, 0), pt(t / 2, D)), line(pt(t / 2, D), bottom), arc3(bottom, at(7.5), barb), line(barb, pt(w, 0))];
  const piece: Piece = { outline, strokes: [S(line(pt(0, 0), pt(w, 0)), "crease")], regions: [], panels: [] };
  return s.diagonal === "right" ? piece : mirrorPiece(piece, w);
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

export interface LockTabSpec {
  w: number;
  t: number;
  /** Tab width (the lid slit is cut to the same width). */
  width: number;
  /** Height above the panel edge. */
  height: number;
  /** Depth of the hinge strip cut into the panel. */
  strip: number;
  /** Radius of the finger tongue on the tab fold. */
  tongue: number;
}

/**
 * Lock tab on the panel that receives the tuck: a tab above the edge on a
 * hinge strip cut into the panel. Closed, it passes through the slit in the
 * lid fold and lies on the lid.
 */
export function lockTabPiece(s: LockTabSpec): Piece {
  const { w, t, width, height, strip, tongue } = s;
  const a = (w - width) / 2;
  const b = a + width;
  const cx = w / 2;
  const cr = clamp(width * 0.06, 1, 2.5);
  const outline = filletPolyline([pt(0, 0), pt(a, 0), pt(a, height), pt(b, height), pt(b, 0), pt(w, 0)], [0, 0, cr, cr, 0, 0]);
  const vf = -t;
  const strokes: Stroke[] = [
    S(line(pt(a, 0), pt(a, -strip - 0.25)), "cut"),
    S(line(pt(b, 0), pt(b, -strip - 0.25)), "cut"),
    S(line(pt(a, -strip), pt(b, -strip)), "crease"),
    S(line(pt(a, vf), pt(b, vf)), "crease"),
    S(arc3(pt(cx - tongue, vf), pt(cx, vf - tongue), pt(cx + tongue, vf)), "cut"),
  ];
  return { outline, strokes, regions: [], panels: [] };
}

/** Gable roof with the carrying handle above it: the roofs meet in the middle and the handles stand back to back. */
export function gableRoofPiece(s: { w: number; roof: number; handle: number; holeW: number; holeH: number; glue: boolean }): Piece {
  const { w, roof, handle } = s;
  const eh = handle * 0.7;
  const lean = Math.min(3, eh * 0.05);
  const sx = clamp(w * 0.19, lean + 4, w / 2 - 8);
  const fr = clamp(handle * 0.07, 1, 5);
  const pts = [pt(0, 0), pt(0, roof), pt(lean, roof + eh), pt(sx, roof + handle), pt(w - sx, roof + handle), pt(w - lean, roof + eh), pt(w, roof), pt(w, 0)];
  const outline = filletPolyline(pts, [0, 0, fr, fr, fr, fr, 0, 0]);
  const strokes: Stroke[] = [S(line(pt(0, 0), pt(w, 0)), "crease"), S(line(pt(0, roof), pt(w, roof)), "crease")];
  const hw = Math.min(s.holeW, w - 2 * sx - 4);
  const hh = Math.min(s.holeH, handle * 0.6);
  const hy = roof + handle * 0.49 - hh / 2;
  const regions: Region[] = [];
  if (hw > 10 && hh > 6) {
    for (const seg of roundedRect(w / 2 - hw / 2, hy, hw, hh, Math.min(8, hh / 2))) strokes.push(S(seg, "cut"));
    if (s.glue && hy - roof > 8) regions.push({ layer: "glue", pts: insetConvex([pt(lean, roof), pt(w - lean, roof), pt(w - lean, hy - 1), pt(lean, hy - 1)], 2), label: "Glue" });
  }
  return {
    outline,
    strokes,
    regions,
    panels: [
      { id: "topLid", name: "Roof", u: 0, v: 0, w, h: roof, printable: true },
      { id: "handle", name: "Handle", u: sx, v: roof, w: w - 2 * sx, h: handle, printable: true },
    ],
  };
}

/** Gable end: a triangle standing above the end wall, slotted to hold the handle ends. */
export function gableEndPiece(s: { w: number; t: number; apex: number; slotH: number }): Piece {
  const { w, t, apex } = s;
  const cx = w / 2;
  const outline = filletPolyline([pt(0, 0), pt(cx, apex), pt(w, 0)], [0, Math.min(10, apex * 0.15), 0]);
  const sw = Math.max(2 * t + 1, 2.5);
  const sh = Math.min(s.slotH, apex - 6);
  const strokes: Stroke[] = [
    S(line(pt(0, 0), pt(cx - sw / 2, 0)), "crease"),
    S(line(pt(cx + sw / 2, 0), pt(w, 0)), "crease"),
    S(line(pt(cx - sw / 2, 0), pt(cx - sw / 2, sh)), "cut"),
    S(line(pt(cx - sw / 2, sh), pt(cx + sw / 2, sh)), "cut"),
    S(line(pt(cx + sw / 2, sh), pt(cx + sw / 2, 0)), "cut"),
    S(line(pt(cx + sw / 2, 0), pt(cx - sw / 2, 0)), "cut"),
  ];
  return { outline, strokes, regions: [], panels: [] };
}
