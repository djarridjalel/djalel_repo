// Matches an uploaded tube dieline to the app's models: for each style, builds
// the app's dieline at the measured size and flap depths, lays it over the
// uploaded one on the body, and scores how far apart the two outlines run.

import { DEFAULT_PARAMS, generate } from "../dieline";
import { foldTube, type ClosurePiece, type FoldCheck } from "../dieline/fold";
import { pt, samplePath, type Pt, type Seg } from "../dieline/geom";
import { orderFor } from "../dieline/carton";
import type { CartonParams, Dieline, StyleId } from "../dieline/types";
import { distanceField, findBody, prepare, reach, region, type Body } from "./analyse";
import type { DieSeg } from "./pdfDieline";
import { DOOR } from "../dieline/styles";

export interface Match {
  style: StyleId;
  params: CartonParams;
  dieline: Dieline;
  /** Mean distance between the two outlines, in mm. */
  score: number;
  /** The app's blank point (x, y) sits at (x + dx, y + dy) on the uploaded page (after mirroring, when mirrored). */
  dx: number;
  dy: number;
}

/** Panel order on the blank after the glue flap: 0 Front, 1 Side A, 2 Back, 3 Side B. */
const ORDER = (style: StyleId, joint: CartonParams["joint"] = "front") => orderFor(style, joint);

export function matchTube(segs: DieSeg[], body: Body, inside: (p: Pt) => boolean, caliper = DEFAULT_PARAMS.caliper): Match[] {
  const t = caliper;
  const cuts = segs.filter((s) => s.kind === "cut");
  const box = region(segs);
  const theirs = distanceField(cuts, box);
  const theirPts = cuts.flatMap((s) => {
    const n = Math.max(1, Math.ceil(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)));
    return Array.from({ length: n }, (_, k) => pt(s.a.x + ((s.b.x - s.a.x) * k) / n, s.a.y + ((s.b.y - s.a.y) * k) / n));
  });
  const H = body.bottom - body.top;
  const edges = [body.xs[0], ...body.xs.slice(1), body.right];
  const glueW = body.xs[0] - body.left;
  const out: Match[] = [];

  // A reverse tuck end can also have its glue flap on a side panel (lids then on the 2nd and 4th panels).
  const variants = familyOf(segs, body, inside).flatMap((style) => (style === "rte" ? [[style, "front"], [style, "side"]] : [[style, "front"]]) as [StyleId, CartonParams["joint"]][]);
  for (const [style, joint] of variants) {
    const order = ORDER(style, joint);
    const w = body.widths;
    // Crease-to-crease widths: rte [Li, Wi+t, Li+t, Wi+t]; others [Wi, Li+t, Wi+t, Li+t].
    const [Li, Wi] = style === "rte" && joint === "front" ? [w[0], w[1] - t] : [w[1] - t, w[0]];
    if (Li < 10 || Wi < 5) continue;
    const xOf = (panel: number) => {
      const j = order.indexOf(panel);
      return [edges[j], edges[j + 1]] as const;
    };
    const top = (panel: number) => reach(inside, ...xOf(panel), body.top, -1);
    const bot = (panel: number) => reach(inside, ...xOf(panel), body.bottom, 1);
    const lidDepth = Wi - t / 2;
    const params: CartonParams = {
      ...DEFAULT_PARAMS,
      style,
      joint,
      dimMode: "inside",
      L: Li,
      W: Wi,
      H: H - t,
      caliper: t,
      glueWidth: glueW > 2 ? glueW : null,
      dustDepth: style === "gable" ? null : Math.max(5, top(1)),
      tuckDepth: style === "gable" ? null : Math.max(6, top(2) - t - lidDepth),
      tuckRadius: null,
      slitLength: null,
      bottomExtension: null,
    };
    if (style === "rte") params.tuckDepth = Math.max(6, Math.min(params.tuckDepth ?? 99, bot(0) - t - lidDepth));
    const d = generate(params);
    const dx = body.xs[0];
    const dy = body.top;
    const mine = samplePath(d.outline, 1).map((q) => pt(q.x + dx, q.y + dy));
    const ourField = distanceField(
      mine.map((q, i) => ({ a: q, b: mine[(i + 1) % mine.length] })),
      box,
    );
    const clampD = (v: number) => Math.min(v, 20);
    const a = mine.reduce((s, q) => s + clampD(theirs(q)), 0) / mine.length;
    const b = theirPts.reduce((s, q) => s + clampD(ourField(q)), 0) / Math.max(1, theirPts.length);
    out.push({ style, params, dieline: d, score: (a + b) / 2, dx, dy });
  }
  return out.sort((p, q) => p.score - q.score);
}

/**
 * Checks the uploaded closures the way the app checks its own: each flap,
 * traced from the uploaded blank as a profile above its hinge, folded onto
 * the opening with the slots of the matched style.
 */
/** The uploaded flaps traced as profiles above their hinges: how far the blank reaches beyond the body along each panel. */
export function traceFlaps(match: Match, body: Body, inside: (p: Pt) => boolean) {
  const order = ORDER(match.style, match.params.joint);
  const edges = [body.xs[0], ...body.xs.slice(1), body.right];
  const out = { top: [null, null, null, null] as (Seg[] | null)[], bottom: [null, null, null, null] as (Seg[] | null)[], pieces: [] as ClosurePiece[] };
  for (const which of ["top", "bottom"] as const) {
    for (let panel = 0 as 0 | 1 | 2 | 3; panel < 4; panel = (panel + 1) as 0 | 1 | 2 | 3) {
      const j = order.indexOf(panel);
      const [x0, x1] = [edges[j], edges[j + 1]];
      const w = x1 - x0;
      const from = which === "top" ? body.top : body.bottom;
      const dir = which === "top" ? -1 : 1;
      const depth = (u: number) => {
        let d = 0.5;
        while (d < 1000 && inside(pt(x0 + u, from + dir * d))) d += 0.5;
        return d - 0.5;
      };
      // Near the folds a scan can run into the neighbouring flap: hold the last 2 mm at the depth found 2 mm in.
      const edgeL = depth(2);
      const edgeR = depth(w - 2);
      const pts: Pt[] = [pt(0, 0)];
      for (let u = 0.5; u <= w - 0.5; u += 0.5) pts.push(pt(u, u < 2 ? Math.min(depth(u), edgeL) : u > w - 2 ? Math.min(depth(u), edgeR) : depth(u)));
      pts.push(pt(w, 0));
      if (Math.max(...pts.map((q) => q.y)) < 1) continue;
      // Local frame matches the app's: u left to right on the blank, v away from the body.
      const outline: Seg[] = pts.slice(1).map((q, k) => ({ kind: "line" as const, a: pts[k], b: q }));
      out[which][panel] = outline;
      const slot = slotOf(match.style, which, panel);
      if (slot) out.pieces.push({ which, panel, slot, w, outline });
    }
  }
  return out;
}

/**
 * Checks the uploaded closures the way the app checks its own: each flap,
 * traced from the uploaded blank as a profile above its hinge, folded onto
 * the opening with the slots of the matched style.
 */
export function checkUploaded(match: Match, body: Body, inside: (p: Pt) => boolean): FoldCheck[] {
  const r = match.dieline.resolved;
  const pieces = traceFlaps(match, body, inside).pieces;
  // Only checks that depend on how far each flap reaches hold for a flap traced as a profile.
  const reliable = new Set(["dust", "tuck", "reach", "apart"]);
  return foldTube(pieces, { Lb: (r.panelWidths[0] + r.panelWidths[2]) / 2, Wb: (r.panelWidths[1] + r.panelWidths[3]) / 2, t: r.t, bodyHeight: r.bodyHeight }).checks.filter(
    (c) => reliable.has(c.id.split(".")[1]) && !(c.id.endsWith(".tuck") && c.label.startsWith("Hook")),
  );
}

function slotOf(style: StyleId, which: "top" | "bottom", panel: number): string | null {
  const top = ["none", "dust", "lid", "dust"];
  const table: Record<string, { top: string[]; bottom: string[] }> = {
    ste: { top, bottom: ["none", "dust", "lid", "dust"] },
    rte: { top, bottom: ["lid", "dust", "none", "dust"] },
    crash: { top, bottom: ["crashMain", "crashSide", "crashMain", "crashSide"] },
    srp: { top, bottom: ["crashMain", "crashSide", "crashMain", "crashSide"] },
    snap: { top, bottom: ["snapNotch", "snapHookL", "snapTongue", "snapHookR"] },
    srpSnap: { top, bottom: ["snapNotch", "snapHookL", "snapTongue", "snapHookR"] },
    gable: { top: ["gableRoof", "gableEnd", "gableRoof", "gableEnd"], bottom: ["snapNotch", "snapHookL", "snapTongue", "snapHookR"] },
  };
  const s = table[style]?.[which][panel];
  return s && s !== "none" ? s : null;
}

export interface Orientation {
  /** The drawing turned on its side (x and y swapped) first, for blanks laid out across the page. */
  swap: boolean;
  /** Then -1 mirrors that axis about the (turned) page centre. */
  sx: 1 | -1;
  sy: 1 | -1;
}

export interface UploadAnalysis {
  orientation: Orientation;
  body: Body;
  segs: DieSeg[];
  matches: Match[];
  checks: FoldCheck[];
  /** The matched style at the uploaded size, folded with the upload's own flaps. */
  drawn: Dieline;
}

/**
 * Tries the dieline as drawn, mirrored, upside down and turned round, and
 * keeps the way it matches one of the app's models best.
 */
export function analyseTube(raw: DieSeg[], pageW: number, pageH: number, extraStyles: StyleId[] = []): UploadAnalysis | null {
  let best: UploadAnalysis | null = null;
  for (const [swap, sx, sy] of [false, true].flatMap((sw) => [[sw, 1, 1], [sw, -1, 1], [sw, 1, -1], [sw, -1, -1]] as const)) {
    const [w, h] = swap ? [pageH, pageW] : [pageW, pageH];
    const f = (q: Pt) => {
      const p = swap ? pt(q.y, q.x) : q;
      return pt(sx > 0 ? p.x : w - p.x, sy > 0 ? p.y : h - p.y);
    };
    const segs0 = raw.map((s) => ({ ...s, a: f(s.a), b: f(s.b) }));
    const { segs, board } = prepare(segs0);
    const body = findBody(segs, board);
    if (!body || body.glue !== "left") continue;
    if (body.widths.length === 6 && extraStyles.includes("doorbox")) {
      const m = matchDoorBox(segs, body, board);
      if (m && (!best || m.score < best.matches[0].score)) best = { orientation: { swap, sx, sy }, body, segs, matches: [m], checks: m.dieline.fold.checks, drawn: m.dieline };
      continue;
    }
    if (body.widths.length !== 4) continue;
    const matches = matchTube(segs, body, board);
    if (!matches.length) continue;
    if (!best || matches[0].score < best.matches[0].score) {
      const flaps = traceFlaps(matches[0], body, board);
      best = { orientation: { swap, sx, sy }, body, segs, matches, checks: checkUploaded(matches[0], body, board), drawn: generate(matches[0].params, { top: flaps.top, bottom: flaps.bottom }) };
    }
  }
  return best;
}

/**
 * Which of the app's tubes an uploaded dieline can be, from its folds: a
 * crash-lock bottom has diagonal folds, a tuck-end bottom a fold across its
 * lid, a snap-lock none; a shelf-ready tray has tear lines across the body.
 */
export function familyOf(segs: DieSeg[], body: Body, board?: (p: Pt) => boolean): StyleId[] {
  const folds = segs.filter((s) => s.kind === "crease");
  const angle = (s: DieSeg) => (Math.abs(Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x)) * 180) / Math.PI;
  const flat = (s: DieSeg) => angle(s) < 8 || angle(s) > 172;
  const len = (s: DieSeg) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
  const diag = (s: DieSeg) => !flat(s) && Math.abs(angle(s) - 90) > 8 && len(s) > 8;
  const below = folds.filter((s) => Math.min(s.a.y, s.b.y) > body.bottom + 1);
  // Every style closes its top with a lid folded across: with no such fold above the body, the blank is upside down.
  if (!folds.some((s) => Math.max(s.a.y, s.b.y) < body.top - 1 && flat(s) && len(s) > 8)) return [];
  // Tear lines run from fold to fold across the body; guide boxes drawn inside a panel do not.
  const atFold = (p: Pt) => [...body.xs, body.right].some((x) => Math.abs(p.x - x) < 1);
  const within = folds.filter((s) => Math.min(s.a.y, s.b.y) > body.top + 2 && Math.max(s.a.y, s.b.y) < body.bottom - 2 && (diag(s) || flat(s)) && len(s) > 8 && (atFold(s.a) || atFold(s.b)));
  const tray = within.length > 0;
  // A tuck-end bottom leaves one panel without a flap (opposite its lid); a snap-lock has a flap on every panel.
  const edges = [body.xs[0], ...body.xs.slice(1), body.right];
  const bare = board ? edges.slice(0, -1).some((x, j) => reach(board, x, edges[j + 1], body.bottom, 1) < 2) : false;
  const bottom = below.some(diag) ? "crash" : bare || below.some((f) => flat(f) && len(f) > 8) ? "tuck" : "snap";
  if (bottom === "crash") return tray ? ["srp", "crash"] : ["crash", "srp"];
  if (bottom === "snap") return tray ? ["srpSnap", "snap", "gable"] : ["snap", "gable", "srpSnap"];
  return ["rte", "ste"];
}

/** Mean distance between the app's outline (placed at dx, dy) and the uploaded cuts, in mm. */
function outlineScore(segs: DieSeg[], d: Dieline, dx: number, dy: number) {
  const cuts = segs.filter((s) => s.kind === "cut");
  const box = region(segs);
  const theirs = distanceField(cuts, box);
  const theirPts = cuts.flatMap((s) => {
    const n = Math.max(1, Math.ceil(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)));
    return Array.from({ length: n }, (_, k) => pt(s.a.x + ((s.b.x - s.a.x) * k) / n, s.a.y + ((s.b.y - s.a.y) * k) / n));
  });
  const mine = samplePath(d.outline, 1).map((q) => pt(q.x + dx, q.y + dy));
  const ours = distanceField(
    mine.map((q, i) => ({ a: q, b: mine[(i + 1) % mine.length] })),
    box,
  );
  const c = (v: number) => Math.min(v, 20);
  const a = mine.reduce((s, q) => s + c(theirs(q)), 0) / mine.length;
  const b = theirPts.reduce((s, q) => s + c(ours(q)), 0) / Math.max(1, theirPts.length);
  return (a + b) / 2;
}

/**
 * The door box: six body panels after the glue flap, back | side A | door outer |
 * door inner | inner front | side B, the door inner and inner front one caliper
 * narrower than the back and door outer.
 */
export function matchDoorBox(segs: DieSeg[], body: Body, board: (p: Pt) => boolean): Match | null {
  const [a1, b1, a2, a3, a4, b2] = body.widths;
  const A = (a1 + a2) / 2;
  // Side A sits between two folds; side B ends at the free edge, found on a 0.5 mm grid.
  const B = b1;
  const t0 = A - (a3 + a4) / 2;
  // Side B ends at the free edge, which the scan can overrun by a few mm where other lines touch it.
  if (Math.abs(a1 - a2) > 1.5 || Math.abs(b1 - b2) > 5 || Math.abs(a3 - a4) > 1.5 || t0 < -0.3 || t0 > 1.5) return null;
  const t = Math.min(1.5, Math.max(0.15, t0 || DEFAULT_PARAMS.caliper));
  const H = body.bottom - body.top;
  const glueW = body.xs[0] - body.left;
  // The top lid sits on the inner front: lid depth B, then the tuck.
  const x4 = body.xs[4];
  const lidReach = reach(board, x4 + (a4 * 0.3), x4 + (a4 * 0.7), body.top, -1);
  const params: CartonParams = {
    ...DEFAULT_PARAMS,
    style: "doorbox",
    dimMode: "inside",
    L: A - t,
    W: B - t,
    H: H - t,
    caliper: t,
    glueWidth: glueW > 2 ? glueW : null,
    // The reach is found on a 0.5 mm grid: keep the standard tuck when it is within that.
    tuckDepth: lidReach > B + 6 && Math.abs(lidReach - B - DOOR.tuck) > 0.75 ? Math.round((lidReach - B) * 10) / 10 : null,
  };
  const d = generate(params);
  const dx = body.xs[0];
  const dy = body.top;
  return { style: "doorbox", params, dieline: d, score: outlineScore(segs, d, dx, dy), dx, dy };
}
