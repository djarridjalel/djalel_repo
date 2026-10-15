// Planar geometry for dielines. Units are millimetres, y grows downward
// (screen/SVG convention). Arcs carry `ccw` in the mathematical sense of the
// (x, y) frame they live in, so a mirror transform flips it.

export interface Pt {
  x: number;
  y: number;
}

export interface LineSeg {
  kind: "line";
  a: Pt;
  b: Pt;
}

export interface ArcSeg {
  kind: "arc";
  c: Pt;
  r: number;
  a: Pt;
  b: Pt;
  ccw: boolean;
}

export type Seg = LineSeg | ArcSeg;

export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (p: Pt, q: Pt): Pt => pt(p.x + q.x, p.y + q.y);
export const sub = (p: Pt, q: Pt): Pt => pt(p.x - q.x, p.y - q.y);
export const scale = (p: Pt, k: number): Pt => pt(p.x * k, p.y * k);
export const dot = (p: Pt, q: Pt) => p.x * q.x + p.y * q.y;
export const cross = (p: Pt, q: Pt) => p.x * q.y - p.y * q.x;
export const len = (p: Pt) => Math.hypot(p.x, p.y);
export const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y);
export const unit = (p: Pt): Pt => {
  const l = len(p);
  return l === 0 ? pt(0, 0) : pt(p.x / l, p.y / l);
};
export const lerp = (p: Pt, q: Pt, t: number): Pt =>
  pt(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t);

export const line = (a: Pt, b: Pt): LineSeg => ({ kind: "line", a, b });
export const arc = (c: Pt, r: number, a: Pt, b: Pt, ccw: boolean): ArcSeg => ({
  kind: "arc",
  c,
  r,
  a,
  b,
  ccw,
});

const TAU = Math.PI * 2;

/** Angle swept from a to b around the arc's centre, always positive. */
export function arcSweep(s: ArcSeg): number {
  const a0 = Math.atan2(s.a.y - s.c.y, s.a.x - s.c.x);
  const a1 = Math.atan2(s.b.y - s.c.y, s.b.x - s.c.x);
  let d = s.ccw ? a1 - a0 : a0 - a1;
  while (d <= 1e-9) d += TAU;
  while (d > TAU + 1e-9) d -= TAU;
  return d;
}

export function segLength(s: Seg): number {
  return s.kind === "line" ? dist(s.a, s.b) : s.r * arcSweep(s);
}

export function reverseSeg(s: Seg): Seg {
  return s.kind === "line" ? line(s.b, s.a) : arc(s.c, s.r, s.b, s.a, !s.ccw);
}

export function reversePath(segs: Seg[]): Seg[] {
  return segs.slice().reverse().map(reverseSeg);
}

/** Affine transform [a c e; b d f] applied as x' = a x + c y + e, y' = b x + d y + f. */
export interface Xf {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const xfApply = (m: Xf, p: Pt): Pt =>
  pt(m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);

export function xfSeg(m: Xf, s: Seg): Seg {
  if (s.kind === "line") return line(xfApply(m, s.a), xfApply(m, s.b));
  const det = m.a * m.d - m.b * m.c;
  const k = Math.sqrt(Math.abs(det));
  return arc(xfApply(m, s.c), s.r * k, xfApply(m, s.a), xfApply(m, s.b), det < 0 ? !s.ccw : s.ccw);
}

export const translateXf = (dx: number, dy: number): Xf => ({ a: 1, b: 0, c: 0, d: 1, e: dx, f: dy });

/** Points along a segment, end point included, start point excluded. */
export function sampleSeg(s: Seg, maxStep = 0.5): Pt[] {
  if (s.kind === "line") return [s.b];
  const sweep = arcSweep(s);
  const n = Math.max(2, Math.ceil((s.r * sweep) / maxStep));
  const a0 = Math.atan2(s.a.y - s.c.y, s.a.x - s.c.x);
  const dir = s.ccw ? 1 : -1;
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = a0 + (dir * sweep * i) / n;
    out.push(pt(s.c.x + s.r * Math.cos(t), s.c.y + s.r * Math.sin(t)));
  }
  out[out.length - 1] = s.b;
  return out;
}

export function samplePath(segs: Seg[], maxStep = 0.5): Pt[] {
  if (!segs.length) return [];
  const out: Pt[] = [segs[0].a];
  for (const s of segs) out.push(...sampleSeg(s, maxStep));
  return out;
}

/** Shoelace area; positive when the polygon winds counter-clockwise in (x, y). */
export function signedArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boxOf(points: Pt[]): Box {
  const b: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const p of points) {
    if (p.x < b.minX) b.minX = p.x;
    if (p.y < b.minY) b.minY = p.y;
    if (p.x > b.maxX) b.maxX = p.x;
    if (p.y > b.maxY) b.maxY = p.y;
  }
  return b;
}

export function segBox(s: Seg): Box {
  return boxOf([s.a, ...sampleSeg(s, 1)]);
}

/**
 * A polyline whose interior corners may be rounded. `r[i]` is the fillet radius
 * at vertex i (ignored for the first and last vertex). Radii that do not fit
 * are reduced so each fillet uses at most half of its neighbouring edges.
 */
export function filletPolyline(points: Pt[], r: number[] = []): Seg[] {
  const segs: Seg[] = [];
  let cursor = points[0];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const rad = i < points.length - 1 ? r[i] ?? 0 : 0;
    if (rad <= 0) {
      if (dist(cursor, p) > 1e-9) segs.push(line(cursor, p));
      cursor = p;
      continue;
    }
    const prev = points[i - 1];
    const next = points[i + 1];
    const d1 = unit(sub(prev, p));
    const d2 = unit(sub(next, p));
    const cosT = Math.max(-1, Math.min(1, dot(d1, d2)));
    const theta = Math.acos(cosT);
    if (theta < 1e-6 || Math.PI - theta < 1e-6) {
      if (dist(cursor, p) > 1e-9) segs.push(line(cursor, p));
      cursor = p;
      continue;
    }
    const maxTd = Math.min(dist(prev, p), dist(next, p)) / 2;
    let td = rad / Math.tan(theta / 2);
    let rr = rad;
    if (td > maxTd) {
      td = maxTd;
      rr = td * Math.tan(theta / 2);
    }
    const t1 = add(p, scale(d1, td));
    const t2 = add(p, scale(d2, td));
    const bis = unit(add(d1, d2));
    const c = add(p, scale(bis, rr / Math.sin(theta / 2)));
    if (dist(cursor, t1) > 1e-9) segs.push(line(cursor, t1));
    segs.push(arc(c, rr, t1, t2, cross(sub(t1, c), sub(t2, c)) > 0));
    cursor = t2;
  }
  return segs;
}

/** Inward offset of a convex polygon (any winding) by `d`. */
export function insetConvex(poly: Pt[], d: number): Pt[] {
  const ccw = signedArea(poly) > 0;
  const n = poly.length;
  const lines: { p: Pt; dir: Pt }[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const dir = unit(sub(b, a));
    // Left normal for ccw polygons points inward.
    const nrm = ccw ? pt(-dir.y, dir.x) : pt(dir.y, -dir.x);
    lines.push({ p: add(a, scale(nrm, d)), dir });
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n];
    const l2 = lines[i];
    const den = cross(l1.dir, l2.dir);
    if (Math.abs(den) < 1e-12) {
      out.push(l2.p);
      continue;
    }
    const t = cross(sub(l2.p, l1.p), l2.dir) / den;
    out.push(add(l1.p, scale(l1.dir, t)));
  }
  return out;
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function segsCross(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const d1 = cross(sub(p2, p1), sub(q1, p1));
  const d2 = cross(sub(p2, p1), sub(q2, p1));
  const d3 = cross(sub(q2, q1), sub(p1, q1));
  const d4 = cross(sub(q2, q1), sub(p2, q1));
  const eps = 1e-7;
  return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
}

/** Returns a point where a closed polygon crosses itself, or null. */
export function findSelfIntersection(poly: Pt[]): Pt | null {
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a1 = poly[i];
    const a2 = poly[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const b1 = poly[j];
      const b2 = poly[(j + 1) % n];
      if (segsCross(a1, a2, b1, b2)) return lerp(a1, a2, 0.5);
    }
  }
  return null;
}

/** Cubic Bézier approximation of an arc, split into pieces of at most 90°. */
export function arcToBeziers(s: ArcSeg): [Pt, Pt, Pt, Pt][] {
  const sweep = arcSweep(s);
  const pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
  const step = (sweep / pieces) * (s.ccw ? 1 : -1);
  const a0 = Math.atan2(s.a.y - s.c.y, s.a.x - s.c.x);
  const k = (4 / 3) * Math.tan(step / 4);
  const out: [Pt, Pt, Pt, Pt][] = [];
  for (let i = 0; i < pieces; i++) {
    const t0 = a0 + step * i;
    const t1 = t0 + step;
    const p0 = pt(s.c.x + s.r * Math.cos(t0), s.c.y + s.r * Math.sin(t0));
    const p3 = pt(s.c.x + s.r * Math.cos(t1), s.c.y + s.r * Math.sin(t1));
    const c1 = pt(p0.x - k * s.r * Math.sin(t0), p0.y + k * s.r * Math.cos(t0));
    const c2 = pt(p3.x + k * s.r * Math.sin(t1), p3.y - k * s.r * Math.cos(t1));
    out.push([i === 0 ? s.a : p0, c1, c2, i === pieces - 1 ? s.b : p3]);
  }
  return out;
}

export const round = (v: number, d = 2) => {
  const k = 10 ** d;
  return Math.round(v * k) / k;
};

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Closed rounded rectangle as lines and arcs (y down). */
export function roundedRect(x: number, y: number, w: number, h: number, r: number): Seg[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const A = (cx: number, cy: number, a: Pt, b: Pt) => arc(pt(cx, cy), rr, a, b, true);
  if (rr < 1e-6) {
    return [line(pt(x, y), pt(x + w, y)), line(pt(x + w, y), pt(x + w, y + h)), line(pt(x + w, y + h), pt(x, y + h)), line(pt(x, y + h), pt(x, y))];
  }
  return [
    line(pt(x + rr, y), pt(x + w - rr, y)),
    A(x + w - rr, y + rr, pt(x + w - rr, y), pt(x + w, y + rr)),
    line(pt(x + w, y + rr), pt(x + w, y + h - rr)),
    A(x + w - rr, y + h - rr, pt(x + w, y + h - rr), pt(x + w - rr, y + h)),
    line(pt(x + w - rr, y + h), pt(x + rr, y + h)),
    A(x + rr, y + h - rr, pt(x + rr, y + h), pt(x, y + h - rr)),
    line(pt(x, y + h - rr), pt(x, y + rr)),
    A(x + rr, y + rr, pt(x, y + rr), pt(x + rr, y)),
  ];
}

export function circle(c: Pt, r: number): Seg[] {
  return [arc(c, r, pt(c.x + r, c.y), pt(c.x - r, c.y), true), arc(c, r, pt(c.x - r, c.y), pt(c.x + r, c.y), true)];
}

/**
 * Euro hang slot: a slot with round ends and a round bump on one long side
 * for the hook. `dir` is +1 for a bump toward +y, -1 toward -y.
 */
export function euroSlot(cx: number, cy: number, width: number, height: number, bump: number, dir: 1 | -1): Seg[] {
  const r = height / 2;
  const x0 = cx - width / 2 + r;
  const x1 = cx + width / 2 - r;
  const yT = cy - r;
  const yB = cy + r;
  const b = Math.min(bump, (x1 - x0) / 2 - 0.5);
  const segs: Seg[] = [];
  if (dir === -1) {
    segs.push(line(pt(x0, yT), pt(cx - b, yT)), arc(pt(cx, yT), b, pt(cx - b, yT), pt(cx + b, yT), true), line(pt(cx + b, yT), pt(x1, yT)));
  } else segs.push(line(pt(x0, yT), pt(x1, yT)));
  segs.push(arc(pt(x1, cy), r, pt(x1, yT), pt(x1, yB), true));
  if (dir === 1) {
    segs.push(line(pt(x1, yB), pt(cx + b, yB)), arc(pt(cx, yB), b, pt(cx + b, yB), pt(cx - b, yB), true), line(pt(cx - b, yB), pt(x0, yB)));
  } else segs.push(line(pt(x1, yB), pt(x0, yB)));
  segs.push(arc(pt(x0, cy), r, pt(x0, yB), pt(x0, yT), true));
  return segs;
}

/** Circular arc from a to b through m. Falls back to a straight line when the points are collinear. */
export function arc3(a: Pt, m: Pt, b: Pt): Seg {
  const d = 2 * (a.x * (m.y - b.y) + m.x * (b.y - a.y) + b.x * (a.y - m.y));
  if (Math.abs(d) < 1e-9) return line(a, b);
  const a2 = a.x * a.x + a.y * a.y;
  const m2 = m.x * m.x + m.y * m.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c = pt((a2 * (m.y - b.y) + m2 * (b.y - a.y) + b2 * (a.y - m.y)) / d, (a2 * (b.x - m.x) + m2 * (a.x - b.x) + b2 * (m.x - a.x)) / d);
  return arc(c, dist(c, a), a, b, cross(sub(m, a), sub(b, m)) > 0);
}

/** Arc from a to b whose midpoint sits `s` to the left of a→b (negative: to the right), in the y-down frame. */
export function bulge(a: Pt, b: Pt, s: number): Seg {
  const mid = lerp(a, b, 0.5);
  const n = unit(pt(a.y - b.y, b.x - a.x));
  return arc3(a, add(mid, scale(n, -s)), b);
}

/** Closed polyline as line segments. */
export function polygon(points: Pt[]): Seg[] {
  return points.map((q, i) => line(q, points[(i + 1) % points.length]));
}
