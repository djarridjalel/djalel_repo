// 3D folding: the blank is split into rigid faces joined by hinges along its
// creases. Each face turns about its hinge, relative to its parent face, from
// flat (t = 0) to closed (t = 1) during its own time window. Faces are kept in
// blank coordinates (mm, y down) with the printed side facing +z; a positive
// angle folds a face away from the printed side, which keeps the print outside.

import { samplePath, type Pt, type Seg } from "./geom";
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
}

export interface Model3D {
  faces: Face3D[];
  /** The face the others hang from: an upright wall (tubes) or the base (trays, mailers). */
  root?: "wall" | "base";
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

/** World matrices of every face at time t (0 flat … 1 closed). */
export function pose(m: Model3D, t: number): Mat4[] {
  const out: Mat4[] = new Array(m.faces.length);
  const at = (i: number): Mat4 => {
    if (out[i]) return out[i];
    const f = m.faces[i];
    if (f.parent < 0 || !f.hinge) return (out[i] = f.parent < 0 ? IDENTITY : at(f.parent));
    const [a, b] = f.hinge;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    // Fold away from the printed side: the face's centre must head for -z.
    const cx = f.poly.reduce((s, q) => s + q.x, 0) / f.poly.length - a.x;
    const cy = f.poly.reduce((s, q) => s + q.y, 0) / f.poly.length - a.y;
    const side = Math.sign(u.x * cy - u.y * cx) || 1;
    const k = f.t1 > f.t0 ? ease((t - f.t0) / (f.t1 - f.t0)) : t >= f.t1 ? 1 : 0;
    const ang = (-side * f.angle * k * Math.PI) / 180;
    return (out[i] = mul(at(f.parent), rotAbout(a, u, ang)));
  };
  for (let i = 0; i < m.faces.length; i++) at(i);
  return out;
}

/** Applies a matrix to a blank point (z = 0). */
export function apply(mat: Mat4, q: Pt): [number, number, number] {
  return [mat[0] * q.x + mat[4] * q.y + mat[12], mat[1] * q.x + mat[5] * q.y + mat[13], mat[2] * q.x + mat[6] * q.y + mat[14]];
}
