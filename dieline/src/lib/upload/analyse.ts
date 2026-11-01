// Turns the lines read from an uploaded dieline into a carton: the outline,
// which inner lines are folds, the four body panels and their sizes, and the
// closure flaps on each panel, so they can be matched to one of the app's
// models and checked like the app's own dielines.

import { pt, type Pt } from "../dieline/geom";
import type { DieSeg } from "./pdfDieline";

const CELL = 0.5;
/** Smallest and largest of many numbers (spreading huge arrays into Math.min overflows the stack). */
const lo = (v: number[]) => v.reduce((a, b) => (b < a ? b : a), Infinity);
const hi = (v: number[]) => v.reduce((a, b) => (b > a ? b : a), -Infinity);

/** Lines indexed by 2 mm grid cells, so "is any line near this point" stays quick on files with many lines. */
export function lineIndex(segs: { a: Pt; b: Pt }[]) {
  const G = 2;
  const cells = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (let x = Math.floor(Math.min(s.a.x, s.b.x) / G); x <= Math.floor(Math.max(s.a.x, s.b.x) / G); x++)
      for (let y = Math.floor(Math.min(s.a.y, s.b.y) / G); y <= Math.floor(Math.max(s.a.y, s.b.y) / G); y++) {
        const k = x + "," + y;
        const c = cells.get(k);
        if (c) c.push(i);
        else cells.set(k, [i]);
      }
  });
  const dist = (p: Pt, s: { a: Pt; b: Pt }) => {
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const k = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(s.a.x + k * dx - p.x, s.a.y + k * dy - p.y);
  };
  /** Indices of lines passing within r (at most 2 mm) of p. */
  return (p: Pt, r: number) => {
    const out: number[] = [];
    const cx = Math.floor(p.x / G);
    const cy = Math.floor(p.y / G);
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let y = cy - 1; y <= cy + 1; y++) for (const i of cells.get(x + "," + y) ?? []) if (!out.includes(i) && dist(p, segs[i]) < r) out.push(i);
    return out;
  };
}

/** The blank as a filled region on a 0.5 mm grid: everything the outer cut line encloses. */
export function region(segs: DieSeg[]) {
  const xs = segs.flatMap((s) => [s.a.x, s.b.x]);
  const ys = segs.flatMap((s) => [s.a.y, s.b.y]);
  const ox = lo(xs) - 2;
  const oy = lo(ys) - 2;
  const W = Math.ceil((hi(xs) - ox + 2) / CELL) + 1;
  const H = Math.ceil((hi(ys) - oy + 2) / CELL) + 1;
  const wall = new Uint8Array(W * H);
  for (const s of segs) {
    const n = Math.max(1, Math.ceil(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) / (CELL / 2)));
    for (let k = 0; k <= n; k++) {
      const x = Math.round((s.a.x + ((s.b.x - s.a.x) * k) / n - ox) / CELL);
      const y = Math.round((s.a.y + ((s.b.y - s.a.y) * k) / n - oy) / CELL);
      if (x >= 0 && y >= 0 && x < W && y < H) wall[y * W + x] = 1;
    }
  }
  // Flood the outside from the border; whatever it cannot reach is the blank.
  const out = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  const push = (i: number) => {
    if (!out[i] && !wall[i]) {
      out[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < W; x++) {
    push(x);
    push((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    push(y * W);
    push(y * W + W - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % W;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (i >= W) push(i - W);
    if (i < W * (H - 1)) push(i + W);
  }
  const at = (p: Pt) => {
    const x = Math.round((p.x - ox) / CELL);
    const y = Math.round((p.y - oy) / CELL);
    return x >= 0 && y >= 0 && x < W && y < H ? y * W + x : -1;
  };
  /** Within the outer cut line (lines themselves count as inside). */
  const inside = (p: Pt) => {
    const i = at(p);
    return i >= 0 && !out[i];
  };
  /** Board itself: inside and not on a line. */
  const board = (p: Pt) => {
    const i = at(p);
    return i >= 0 && !out[i] && !wall[i];
  };
  let area = 0;
  for (let i = 0; i < W * H; i++) if (!out[i]) area++;
  return { inside, board, ox, oy, W, H, out, area: area * CELL * CELL };
}

/**
 * Cleans the lines of a dieline layer: sorts them into cuts and folds, then
 * drops lines that do not touch the blank, such as dimension lines and text
 * drawn on the same layer, and returns the blank bounded by what is left.
 */
export function prepare(input: DieSeg[]) {
  // Peel off outer lines that only wrap a slightly larger copy of the blank, such as a bleed line or a frame.
  let raw = input;
  for (let pass = 0; pass < 3; pass++) {
    const r = region(raw);
    const edge = new Set(raw.filter((s) => {
      const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) || 1;
      const m = pt((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2);
      const nx = (-(s.b.y - s.a.y) / len) * 1.2;
      const ny = ((s.b.x - s.a.x) / len) * 1.2;
      return !r.inside(pt(m.x + nx, m.y + ny)) || !r.inside(pt(m.x - nx, m.y - ny));
    }));
    const rest = raw.filter((s) => !edge.has(s));
    // The real outline has the folds running into it; a bleed line or frame touches nothing.
    const nearEdge = lineIndex([...edge]);
    const touched = rest.some((s) => s.kind === "crease" && (nearEdge(s.a, 0.6).length > 0 || nearEdge(s.b, 0.6).length > 0));
    if (!rest.length || touched || region(rest).area < r.area * 0.75) break;
    raw = rest;
  }
  const first = region(raw);
  const sorted = classify(raw, first.inside);
  const touches = (s: DieSeg) => {
    const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) || 1;
    const nx = -(s.b.y - s.a.y) / len;
    const ny = (s.b.x - s.a.x) / len;
    for (const k of [0.25, 0.5, 0.75]) {
      const m = pt(s.a.x + (s.b.x - s.a.x) * k, s.a.y + (s.b.y - s.a.y) * k);
      if (first.board(pt(m.x + nx * 1.2, m.y + ny * 1.2)) || first.board(pt(m.x - nx * 1.2, m.y - ny * 1.2))) return true;
    }
    return false;
  };
  const segs = dropGuides(sorted.filter(touches));
  const blank = region(segs);
  return { segs, inside: blank.inside, board: blank.inside };
}

/**
 * Lines with the blank on both sides are inner lines: folds, unless they are
 * short slits or closed holes. Lines on the edge of the blank are cuts.
 */
export function classify(segs: DieSeg[], inside: (p: Pt) => boolean): DieSeg[] {
  // When the file already tells folds apart (dashed, or in their own colour), trust it:
  // a slit between two flaps also has board on both sides but is a cut.
  if (segs.some((s) => s.kind === "crease")) return segs;
  return segs.map((s) => {
    const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
    const m = pt((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2);
    const nx = -(s.b.y - s.a.y) / (len || 1);
    const ny = (s.b.x - s.a.x) / (len || 1);
    const both = inside(pt(m.x + nx * 1.2, m.y + ny * 1.2)) && inside(pt(m.x - nx * 1.2, m.y - ny * 1.2));
    return { ...s, kind: both && (s.kind === "crease" || len > 3) ? "crease" : "cut" };
  });
}

/** Straight fold lines, joined where they continue each other. */
function lines(segs: DieSeg[], horizontal: boolean) {
  const out: { at: number; from: number; to: number }[] = [];
  for (const s of segs) {
    if (s.kind !== "crease") continue;
    const d = horizontal ? Math.abs(s.b.y - s.a.y) : Math.abs(s.b.x - s.a.x);
    const l = horizontal ? Math.abs(s.b.x - s.a.x) : Math.abs(s.b.y - s.a.y);
    if (l < 2 || d > l * 0.02) continue;
    const at = horizontal ? (s.a.y + s.b.y) / 2 : (s.a.x + s.b.x) / 2;
    const [from, to] = horizontal ? [Math.min(s.a.x, s.b.x), Math.max(s.a.x, s.b.x)] : [Math.min(s.a.y, s.b.y), Math.max(s.a.y, s.b.y)];
    out.push({ at, from, to });
  }
  // Group by position (within 0.6 mm) and sum their lengths.
  const groups: { at: number; from: number; to: number; len: number }[] = [];
  for (const l of out.sort((a, b) => a.at - b.at)) {
    const g = groups.find((q) => Math.abs(q.at - l.at) < 0.6);
    if (g) {
      g.from = Math.min(g.from, l.from);
      g.to = Math.max(g.to, l.to);
      g.len += l.to - l.from;
    } else groups.push({ ...l, len: l.to - l.from });
  }
  return groups;
}

export interface Body {
  /** Fold lines between the body panels and at the glue flap, left to right, in mm. */
  xs: number[];
  /** Left and right ends of the body (the glue-flap fold and the free edge, in some order). */
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Panel widths left to right. */
  widths: number[];
  /** Which end carries the glue flap. */
  glue: "left" | "right";
}

/**
 * The body of a tube: the two long horizontal folds that run across it (top
 * and bottom of the body) and the vertical folds between them.
 */
export function findBody(segs: DieSeg[], inside: (p: Pt) => boolean): Body | null {
  const hs = lines(segs, true).sort((a, b) => b.len - a.len);
  if (hs.length < 2) return null;
  // The top and bottom of the body: the outermost of the long horizontal folds
  // (guide boxes drawn just inside the panels are ignored this way).
  // The body is the widest pair of long horizontal folds joined by at least three panel folds
  // running exactly from one to the other (roof folds above it do not qualify).
  const long = hs.filter((h) => h.len >= hs[0].len * 0.5);
  const verticals = lines(segs, false);
  const between = (top: number, bottom: number) => verticals.filter((v) => v.from <= top + 0.8 && v.to >= bottom - 0.8 && v.from >= top - 1.5 && v.to <= bottom + 1.5);
  let best: { top: number; bottom: number; n: number } | null = null;
  for (const a of long)
    for (const b of long) {
      if (b.at - a.at < 15) continue;
      const n = between(a.at, b.at).length;
      // Guide boxes inside the panels also pair up; the body is the widest pair.
      if (n >= 3 && (!best || b.at - a.at > best.bottom - best.top)) best = { top: a.at, bottom: b.at, n };
    }
  if (!best) return null;
  const { top, bottom } = best;
  const mid = (top + bottom) / 2;
  const vs = between(top, bottom);
  const xs = vs.map((v) => v.at).sort((p, q) => p - q);
  // The body runs from the glue-flap fold to the free edge: find where the blank stops at mid-height.
  let right = xs[xs.length - 1];
  while (inside(pt(right + 0.6, mid))) right += 0.5;
  let left = xs[0];
  while (inside(pt(left - 0.6, mid))) left -= 0.5;
  // The glue flap is the narrow strip beyond the outermost fold on one side.
  const stripL = xs[0] - left;
  const stripR = right - xs[xs.length - 1];
  const glue = stripL < stripR ? "left" : "right";
  const edges = glue === "left" ? [...xs, right] : [left, ...xs];
  const widths = edges.slice(1).map((x, i) => x - edges[i]);
  return { xs, left, right, top, bottom, widths, glue };
}

/** Distance (mm) from any point to the nearest of the given lines, on a coarse grid over the region's area. */
export function distanceField(segs: { a: Pt; b: Pt }[], area: { ox: number; oy: number; W: number; H: number }, CELL = 1) {
  const ox = area.ox;
  const oy = area.oy;
  const W = Math.ceil((area.W * 0.5) / CELL) + 2;
  const H = Math.ceil((area.H * 0.5) / CELL) + 2;
  const d = new Float32Array(W * H).fill(1e9);
  const q: number[] = [];
  for (const s of segs) {
    const n = Math.max(1, Math.ceil(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) / (CELL / 2)));
    for (let k = 0; k <= n; k++) {
      const x = Math.round((s.a.x + ((s.b.x - s.a.x) * k) / n - ox) / CELL);
      const y = Math.round((s.a.y + ((s.b.y - s.a.y) * k) / n - oy) / CELL);
      if (x >= 0 && y >= 0 && x < W && y < H && d[y * W + x] !== 0) {
        d[y * W + x] = 0;
        q.push(y * W + x);
      }
    }
  }
  // Breadth-first growth with 8 neighbours: close enough to true distance for scoring.
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % W;
    const y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < H) {
          const j = ny * W + nx;
          const v = d[i] + (dx && dy ? 1.414 : 1) * CELL;
          if (v < d[j] - 1e-6) {
            if (d[j] > 1e8) q.push(j);
            d[j] = v;
          }
        }
      }
  }
  return (p: Pt) => {
    const x = Math.round((p.x - ox) / CELL);
    const y = Math.round((p.y - oy) / CELL);
    return x >= 0 && y >= 0 && x < W && y < H ? d[y * W + x] : 1e9;
  };
}

/** How far the blank reaches beyond the body's top (dir -1) or bottom (dir 1) across a panel, in mm. */
export function reach(board: (p: Pt) => boolean, x0: number, x1: number, from: number, dir: 1 | -1): number {
  let best = 0;
  for (let k = 1; k < 10; k++) {
    const x = x0 + ((x1 - x0) * k) / 10;
    let d = 0.5;
    while (d < 1000 && board(pt(x, from + dir * d))) d += 0.5;
    best = Math.max(best, d - 0.5);
  }
  return best;
}

/**
 * Removes guide boxes: groups of fold lines that join only each other into
 * closed loops and never reach a cut, such as safe-area or text boxes.
 * Real folds always run into the outline or another fold.
 */
export function dropGuides(segs: DieSeg[]): DieSeg[] {
  const folds = segs.map((s, i) => ({ s, i })).filter((x) => x.s.kind === "crease");
  const cuts = segs.filter((s) => s.kind === "cut");
  const same = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y) < 0.3;
  const nearCut = lineIndex(cuts);
  const onCut = (p: Pt) => nearCut(p, 0.6).length > 0;
  // Join folds that share an end into groups, looking only at ends close by.
  const group = folds.map((_, k) => k);
  const find = (k: number): number => (group[k] === k ? k : (group[k] = find(group[k])));
  const ends = new Map<string, number[]>();
  const key = (p: Pt) => Math.round(p.x / 0.3) + "," + Math.round(p.y / 0.3);
  folds.forEach((f, k) => {
    for (const p of [f.s.a, f.s.b]) {
      const kk = key(p);
      ends.set(kk, [...(ends.get(kk) ?? []), k]);
    }
  });
  folds.forEach((f, k) => {
    for (const p of [f.s.a, f.s.b]) {
      const [x, y] = key(p).split(",").map(Number);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const j of ends.get(x + dx + "," + (y + dy)) ?? []) {
            const B = folds[j].s;
            if (j !== k && (same(p, B.a) || same(p, B.b))) group[find(k)] = find(j);
          }
    }
  });
  const drop = new Set<number>();
  const members = new Map<number, number[]>();
  folds.forEach((_, k) => members.set(find(k), [...(members.get(find(k)) ?? []), k]));
  for (const ks of members.values()) {
    if (ks.length < 3 || ks.length > 400) continue;
    const ends = ks.flatMap((k) => [folds[k].s.a, folds[k].s.b]);
    // Closed: every end meets another end of the group. Free: no end lies on a cut.
    const closed = ends.every((p, i) => ends.some((q, j) => j !== i && same(p, q)));
    if (closed && !ends.some(onCut)) for (const k of ks) drop.add(folds[k].i);
  }
  return segs.filter((_, i) => !drop.has(i));
}
