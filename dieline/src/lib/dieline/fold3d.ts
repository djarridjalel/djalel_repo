// 3D folding: the blank is split into rigid faces joined by hinges along its
// creases. Each face turns about its hinge, relative to its parent face, from
// flat (t = 0) to closed (t = 1) during its own time window. Faces are kept in
// blank coordinates (mm, y down) with the printed side facing +z; a positive
// angle folds a face away from the printed side, which keeps the print outside.

import { pointInPolygon, samplePath, sampleSeg, type Pt, type Seg } from "./geom";
import { area, diff, inter } from "./fold";

export interface Face3D {
  /** Outline on the flat blank. */
  poly: Pt[];
  /** Index of the face it hangs from; -1 for the root. */
  parent: number;
  /** Two points on the crease it turns about, on the flat blank. */
  hinge: [Pt, Pt] | null;
  /** Final fold angle in degrees; positive folds away from the printed side. */
  angle: number;
  /** Time window of the fold, within 0 (flat) … 1 (closed). */
  t0: number;
  t1: number;
  /** Stacking order where faces end up on top of each other; higher is further out. */
  layer: number;
  /** Presentation (slider 1 → 2): a further turn in degrees, within its window p0 … p1 of that step. */
  angle2?: number;
  p0?: number;
  p1?: number;
  /** Torn away in the presentation step, with everything hanging from it. */
  remove?: boolean;
  /** Cuts, creases and perforations inside the face, drawn on it. */
  lines?: { kind: "cut" | "crease" | "perf"; pts: Pt[] }[];
}

export interface Model3D {
  faces: Face3D[];
  /** The face the others hang from: an upright wall (tubes) or the base (trays, mailers). */
  root?: "wall" | "base";
  /** Name of the presentation step (slider 1 → 2), when the carton has one. */
  present?: string;
  /** Where the torn-away part goes in the presentation step, in blank coordinates (mm). */
  away?: { x: number; y: number; z: number };
}

/* ---------- building ---------- */

export class FaceList {
  faces: Face3D[] = [];
  add(poly: Pt[], parent: number, hinge: [Pt, Pt] | null, angle = 0, t0 = 0, t1 = 1, layer = 0): number {
    if (poly.length < 3 || area([poly]) < 0.5) return -1;
    this.faces.push({ poly, parent, hinge, angle, t0, t1, layer });
    return this.faces.length - 1;
  }
}

/** A closure piece's outline as a polygon in its local frame (hinge from (0,0) to (w,0)). */
export function piecePoly(outline: Seg[]): Pt[] {
  const pts = samplePath(outline, 0.8);
  if (pts.length && (Math.abs(pts[0].x) > 1e-6 || Math.abs(pts[0].y) > 1e-6)) pts.unshift({ x: 0, y: 0 });
  return pts;
}

/** Splits a polygon by a region: the part inside it and the parts outside. */
export function split(poly: Pt[], region: Pt[]): { inside: Pt[][]; outside: Pt[][] } {
  return { inside: inter([poly], [region]), outside: diff([poly], [region]) };
}

/* ---------- posing ---------- */

/** 4×4 matrix, column-major. */
export type Mat4 = number[];

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

/** Rotation by angle (radians) about the in-plane axis through a with direction u (unit, z = 0). */
function rotAbout(a: Pt, u: Pt, ang: number): Mat4 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const [x, y, z] = [u.x, u.y, 0];
  const C = 1 - c;
  const R = [c + x * x * C, y * x * C + z * s, z * x * C - y * s, 0, x * y * C - z * s, c + y * y * C, z * y * C + x * s, 0, x * z * C + y * s, y * z * C - x * s, c + z * z * C, 0, 0, 0, 0, 1];
  const T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, a.x, a.y, 0, 1];
  const Ti = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -a.x, -a.y, 0, 1];
  return mul(T, mul(R, Ti));
}

const ease = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/** How far the torn-away part has gone, 0 … 1, at time t (presentation runs from 1 to 2). */
export function removal(t: number): number {
  return ease((t - 1) / 0.45);
}

/** Faces torn away in the presentation step, with their children. */
export function removedFaces(m: Model3D): boolean[] {
  const out: boolean[] = [];
  const is = (i: number): boolean => (out[i] ??= !!m.faces[i].remove || (m.faces[i].parent >= 0 && is(m.faces[i].parent)));
  m.faces.forEach((_, i) => is(i));
  return out;
}

/** World matrices of every face at time t (0 flat … 1 closed … 2 presented, when the carton has a presentation step). */
export function pose(m: Model3D, t: number): Mat4[] {
  const out: Mat4[] = new Array(m.faces.length);
  const at = (i: number): Mat4 => {
    if (out[i]) return out[i];
    const f = m.faces[i];
    if (f.parent < 0) return (out[i] = IDENTITY);
    if (!f.hinge) return (out[i] = at(f.parent));
    const [a, b] = f.hinge;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    // Fold away from the printed side: the face's centre must head for -z.
    const cx = f.poly.reduce((s, q) => s + q.x, 0) / f.poly.length - a.x;
    const cy = f.poly.reduce((s, q) => s + q.y, 0) / f.poly.length - a.y;
    const side = Math.sign(u.x * cy - u.y * cx) || 1;
    const k = f.t1 > f.t0 ? ease((t - f.t0) / (f.t1 - f.t0)) : t >= f.t1 ? 1 : 0;
    const k2 = f.angle2 && t > 1 ? ease((t - 1 - (f.p0 ?? 0)) / ((f.p1 ?? 1) - (f.p0 ?? 0) || 1)) : 0;
    const ang = (-side * (f.angle * k + (f.angle2 ?? 0) * k2) * Math.PI) / 180;
    let mat = mul(at(f.parent), rotAbout(a, u, ang));
    if (f.remove && m.away && t > 1) {
      const kr = removal(t);
      mat = mul([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, m.away.x * kr, m.away.y * kr, m.away.z * kr, 1], mat);
    }
    return (out[i] = mat);
  };
  for (let i = 0; i < m.faces.length; i++) at(i);
  return out;
}

/** Applies a matrix to a blank point (z = 0). */
export function apply(mat: Mat4, q: Pt): [number, number, number] {
  return [mat[0] * q.x + mat[4] * q.y + mat[12], mat[1] * q.x + mat[5] * q.y + mat[13], mat[2] * q.x + mat[6] * q.y + mat[14]];
}

/** Distance from a point to a polygon's outline. */
function edgeDist(q: Pt, poly: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const k = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(a.x + k * dx - q.x, a.y + k * dy - q.y));
  }
  return best;
}

/** Puts each cut, crease and perforation inside a face onto that face; lines along face edges are the hinges and outlines already drawn. */
export function attachLines(m: Model3D, strokes: { layer: string; seg: Seg }[]): Model3D {
  for (const st of strokes) {
    if (st.layer !== "cut" && st.layer !== "crease" && st.layer !== "perf") continue;
    const pts = sampleSeg(st.seg, 1);
    const mid = pts[Math.floor(pts.length / 2)];
    const at = (st.seg.kind === "line" ? { x: (st.seg.a.x + st.seg.b.x) / 2, y: (st.seg.a.y + st.seg.b.y) / 2 } : mid) ?? mid;
    const face = m.faces.find((f) => pointInPolygon(at, f.poly) && edgeDist(at, f.poly) > 0.3);
    if (face) (face.lines ??= []).push({ kind: st.layer, pts });
  }
  return m;
}
