// Closing check: folds each end closure of a tube flat onto its opening and
// measures whether it closes and locks. Pieces are mapped from their local
// frame (u along the hinge as drawn on the blank, v away from the body) to the
// opening seen end-on: X from Side B (0) to Side A (Lb), Y from the front (0)
// to the back (Wb). The same frame serves the top and the bottom; one of them
// is seen mirrored, which no check depends on.

import ClipperLib from "clipper-lib";
import { pt, samplePath, type Pt, type Seg } from "./geom";

export type FlapKind = "lid" | "dust" | "main" | "side" | "notch" | "tongue" | "hook" | "roof";

export interface ClosurePiece {
  which: "top" | "bottom";
  /** 0 Front, 1 Side A, 2 Back, 3 Side B. */
  panel: 0 | 1 | 2 | 3;
  slot: string;
  w: number;
  outline: Seg[];
  meta?: Record<string, number>;
}

export interface FoldView {
  id: string;
  title: string;
  Lb: number;
  Wb: number;
  flaps: { kind: FlapKind; poly: Pt[] }[];
  marks: { kind: "centre" | "tab" | "hidden"; pts: Pt[] }[];
  /** How the closure is folded, in order. */
  note?: string;
}

export interface FoldCheck {
  id: string;
  closure: string;
  label: string;
  ok: boolean;
  severity: "error" | "warning";
  detail: string;
}

export interface FoldResult {
  views: FoldView[];
  checks: FoldCheck[];
}


const r1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/* ---------- polygon helpers ---------- */

const SC = 1000;
type CP = { X: number; Y: number }[];
const toC = (p: Pt[]): CP => p.map((q) => ({ X: Math.round(q.x * SC), Y: Math.round(q.y * SC) }));
const fromC = (p: CP): Pt[] => p.map((q) => pt(q.X / SC, q.Y / SC));

function clip(subject: Pt[][], clipBy: Pt[][], type: number): Pt[][] {
  const c = new ClipperLib.Clipper();
  for (const p of subject) if (p.length > 2) c.AddPath(toC(p), ClipperLib.PolyType.ptSubject, true);
  for (const p of clipBy) if (p.length > 2) c.AddPath(toC(p), ClipperLib.PolyType.ptClip, true);
  const out: CP[] = [];
  c.Execute(type, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return out.map(fromC);
}
const inter = (a: Pt[][], b: Pt[][]) => clip(a, b, ClipperLib.ClipType.ctIntersection);
const diff = (a: Pt[][], b: Pt[][]) => clip(a, b, ClipperLib.ClipType.ctDifference);
const union = (a: Pt[][]) => clip(a, [], ClipperLib.ClipType.ctUnion);
const area = (ps: Pt[][]) => ps.reduce((s, p) => s + Math.abs(ClipperLib.Clipper.Area(toC(p))) / (SC * SC), 0);
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];
function bounds(ps: Pt[][]) {
  const all = ps.flat();
  if (!all.length) return null;
  return { x0: Math.min(...all.map((q) => q.x)), x1: Math.max(...all.map((q) => q.x)), y0: Math.min(...all.map((q) => q.y)), y1: Math.max(...all.map((q) => q.y)) };
}

/** Intervals where a polygon crosses the horizontal line y (or vertical line x when vertical). */
function crossings(poly: Pt[], at: number, vertical = false): [number, number][] {
  const xs: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const [ay, by, ax, bx] = vertical ? [a.x, b.x, a.y, b.y] : [a.y, b.y, a.x, b.x];
    if ((ay <= at && by > at) || (by <= at && ay > at)) xs.push(ax + ((at - ay) / (by - ay)) * (bx - ax));
  }
  xs.sort((m, n) => m - n);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}
const extent = (iv: [number, number][]) => (iv.length ? iv[iv.length - 1][1] - iv[0][0] : 0);

/* ---------- folding ---------- */

function localPoly(piece: ClosurePiece, maxV?: number): Pt[] {
  const pts = samplePath(piece.outline, 0.4);
  let poly = [...pts];
  if (poly.length && (poly[0].x !== 0 || poly[0].y !== 0)) poly.unshift(pt(0, 0));
  // A crash-lock base flap's glued triangle folds back onto the side flap along
  // its 45° crease, so it is not part of the flap once the carton is erected.
  if (piece.meta?.glueBeyondUeqV) poly = inter([poly], [[pt(-1, -1), pt(1e4, -1), pt(1e4, 1e4)]])[0] ?? [];
  if (maxV == null) return poly;
  return inter([poly], [rect(-1, -1, piece.w + 1, maxV)])[0] ?? [];
}

function foldPoly(poly: Pt[], piece: ClosurePiece, Lb: number, Wb: number): Pt[] {
  const w = piece.w;
  const map: Record<number, (q: Pt) => Pt> = {
    0: (q) => pt(q.x, q.y),
    1: (q) => pt(Lb - q.y, q.x),
    2: (q) => pt(Lb - q.x, Wb - q.y),
    3: (q) => pt(q.y, w - q.x),
  };
  return poly.map(map[piece.panel]);
}

/* ---------- checks ---------- */

export function foldTube(pieces: ClosurePiece[], o: { Lb: number; Wb: number; t: number; bodyHeight: number }): FoldResult {
  const { Lb, Wb, t } = o;
  const opening = rect(0, 0, Lb, Wb);
  const views: FoldView[] = [];
  const checks: FoldCheck[] = [];

  for (const which of ["top", "bottom"] as const) {
    const end = pieces.filter((p) => p.which === which);
    const slots = end.map((p) => p.slot);
    const name = which === "top" ? "Top" : "Bottom";
    const add = (id: string, label: string, ok: boolean, detail: string, severity: "error" | "warning" = "error") =>
      checks.push({ id: `${which}.${id}`, closure: name, label, ok, severity, detail });
    const flapOf = (slot: string | ((s: string) => boolean), maxV?: number) => {
      const p = end.find((q) => (typeof slot === "string" ? q.slot === slot : slot(q.slot)));
      return p ? { piece: p, poly: inter([foldPoly(localPoly(p, maxV), p, Lb, Wb)], [opening])[0] ?? [] } : null;
    };
    const view: FoldView = { id: which, title: `${name} closed, seen end-on`, Lb, Wb, flaps: [], marks: [] };
    const show = (kind: FlapKind, poly: Pt[]) => poly.length > 2 && view.flaps.push({ kind, poly });

    if (slots.includes("snapNotch")) {
      const notch = flapOf("snapNotch")!;
      const tongue = flapOf("snapTongue")!;
      // Each hook's rounded lobe: the half disc on the side it bulges to.
      const hooks = end
        .filter((p) => p.slot.startsWith("snapHook"))
        .map((p) => {
          const local = localPoly(p);
          const m = p.meta ?? {};
          const disc = Array.from({ length: 72 }, (_, k) => pt((m.lobeU ?? 0) + (m.lobeR ?? 0) * Math.cos((k * Math.PI) / 36), (m.lobeV ?? 0) + (m.lobeR ?? 0) * Math.sin((k * Math.PI) / 36)));
          const side = (m.bulge ?? 1) > 0 ? rect(m.lobeU ?? 0, -1e3, 1e4, 1e4) : rect(-1e4, -1e3, m.lobeU ?? 0, 1e4);
          const lobeLocal = inter(inter([local], [disc]), [side]);
          const fold = (ps: Pt[][]) => inter(ps.map((q) => foldPoly(q, p, Lb, Wb)), [opening]);
          return { body: fold(diff([local], lobeLocal)), lobe: fold(lobeLocal) };
        });
      // Closing order: notch flap, hooks over it with their lobes tucked under it, tongue over everything.
      show("notch", notch.poly);
      hooks.forEach((h) => h.body.forEach((b) => show("hook", b)));
      show("tongue", tongue.poly);
      hooks.forEach((h) => h.lobe.forEach((l) => view.marks.push({ kind: "hidden", pts: l })));
      view.note = "Fold the notch flap first, then the two hook flaps over it with their round lobes tucked under it, then the tongue flap over everything with its tab tucked under the notch flap.";
      const cx = Lb / 2;
      // Notch: the front flap is solid from its hinge to the notch's inner edge.
      const nSpans = crossings(notch.poly, cx, true);
      const notchInner = nSpans.length ? nSpans[0][1] : 0;
      const notchEnd = bounds([notch.poly])!.y1;
      const yMid = (notchInner + notchEnd) / 2;
      const nIv = crossings(notch.poly, yMid);
      const gapAt = nIv.findIndex((iv) => iv[0] > cx);
      const notchW = gapAt > 0 ? nIv[gapAt][0] - nIv[gapAt - 1][1] : 0;
      // Tongue: tab tip, straight-sided tab width, and where it widens again (the shoulder).
      const tSpans = crossings(tongue.poly, cx, true);
      const tabTip = tSpans.length ? tSpans[0][0] : Wb;
      let tabW = 0;
      let shoulder = tabTip;
      let prev = 0;
      for (let y = tabTip + 0.5; y < Wb; y += 0.25) {
        const w = extent(crossings(tongue.poly, y));
        if (!tabW) {
          if (prev && Math.abs(w - prev) < 0.02) tabW = w;
          prev = w;
          continue;
        }
        if (w > tabW + 0.6) {
          // Shallow shoulders widen slowly: trace them back to where they leave the tab.
          const slope = (extent(crossings(tongue.poly, y + 1)) - w) / 1;
          shoulder = slope > 0.01 ? y - (w - tabW) / slope : y;
          break;
        }
      }
      const tab = rect(cx - tabW / 2, tabTip, cx + tabW / 2, shoulder);
      view.marks.push({ kind: "tab", pts: tab }, { kind: "centre", pts: [pt(0, Wb / 2), pt(Lb, Wb / 2)] });

      const align = shoulder - notchInner;
      const tolA = Math.max(1.5, 3 * t);
      add("align", "Tongue meets the notch", Math.abs(align) <= tolA, `The tongue narrows to its tab ${r1(Math.abs(align))} mm ${align >= 0 ? "behind" : "in front of"} the notch's inner edge (allowed ${r1(tolA)} mm).`);
      const clear = notchW - tabW;
      add("fit", "Tab fits the notch", clear >= 2 * t, `Notch ${r1(notchW)} mm, tab ${r1(tabW)} mm: ${r1(clear)} mm clearance (needs at least ${r1(2 * t)} mm).`);
      if (clear > 8) add("loose", "Tab is not loose in the notch", false, `${r1(clear)} mm of play between tab and notch; the bottom will rattle.`, "warning");
      const tabLen = shoulder - tabTip;
      const notchD = notchEnd - notchInner;
      add("length", "Tab is as long as the notch is deep", Math.abs(tabLen - notchD) <= 3, `Tab ${r1(tabLen)} mm long, notch ${r1(notchD)} mm deep.`, "warning");
      // The hooks lie on the notch flap beside the notch; their lobes slide under it past the notch's inner edge.
      const ears = inter([notch.poly], [rect(-1, notchInner + 0.5, Lb + 1, Wb + 1)]);
      const rest = hooks.map((h) => area(inter(h.body, ears)));
      add("rest", "Hook flaps lie over the notch flap", rest.every((a) => a >= 1), `Each hook overlaps the notch flap beside the notch by ${rest.map((a) => r1(a / 100)).join(" and ")} cm².`);
      const tucks = hooks.map((h) => {
        const a = area(h.lobe);
        const b = bounds(h.lobe);
        return { a, under: a ? area(inter(h.lobe, [notch.poly])) / a : 0, past: b ? notchInner - b.y0 : 0 };
      });
      const tucked = tucks.every((k) => k.a > 1 && k.under >= 0.95 && k.past >= 3);
      add("tuck", "Hook lobes tuck under the notch flap", tucked, tucked ? `Each round lobe slides ${tucks.map((k) => r1(k.past)).join(" and ")} mm under the notch flap, past the notch's inner edge.` : `The lobes are ${tucks.map((k) => r1(k.under * 100)).join(" % and ")} % under the notch flap and reach ${tucks.map((k) => r1(k.past)).join(" and ")} mm past its inner edge; each must be fully under it and at least 3 mm past the edge.`);
    } else if (slots.includes("crashMain")) {
      const mains = end.filter((p) => p.slot === "crashMain").map((p) => ({ p, poly: inter([foldPoly(localPoly(p), p, Lb, Wb)], [opening])[0] ?? [] }));
      const sides = end.filter((p) => p.slot === "crashSide").map((p) => inter([foldPoly(localPoly(p), p, Lb, Wb)], [opening])[0] ?? []);
      sides.forEach((s) => show("side", s));
      mains.forEach((m) => show("main", m.poly));
      view.marks.push({ kind: "centre", pts: [pt(0, Wb / 2), pt(Lb, Wb / 2)] });
      const front = mains.find((m) => m.p.panel === 0)!.poly;
      const back = mains.find((m) => m.p.panel === 2)!.poly;
      const c = Wb / 2;
      const reachF = Math.max(...[0.15, 0.3, 0.5, 0.7, 0.85].map((f) => Math.max(0, ...crossings(front, Lb * f, true).map((iv) => iv[1]))));
      const reachB = Math.min(...[0.15, 0.3, 0.5, 0.7, 0.85].map((f) => Math.min(Wb, ...crossings(back, Lb * f, true).map((iv) => iv[0]))));
      add("reach", "Base flaps lock past the centre", reachF >= c + 2 && reachB <= c - 2, `The front flap reaches ${r1(reachF - c)} mm and the back flap ${r1(c - reachB)} mm past the centre line (needs 2 mm).`);
      const fT = bounds(inter([front], [rect(-1, c + 0.5, Lb + 1, Wb + 1)]));
      const bT = bounds(inter([back], [rect(-1, -1, Lb + 1, c - 0.5)]));
      const overlap = fT && bT ? Math.min(fT.x1, bT.x1) - Math.max(fT.x0, bT.x0) : 0;
      add("tongues", "Locking tongues pass side by side", overlap <= 1, overlap <= 1 ? `The tongues sit ${r1(Math.max(0, -overlap))} mm apart.` : `The tongues overlap by ${r1(overlap)} mm and collide.`);
      const hole = area(diff([opening], union([...mains.map((m) => m.poly), ...sides]))) / (Lb * Wb);
      add("cover", "Base fully closed", hole <= 0.005, hole <= 0.005 ? "No gaps in the base." : `${r1(hole * 100)} % of the base is left open.`);
    } else if (slots.includes("lid")) {
      const lid = flapOf("lid")!;
      const dusts = end.filter((p) => p.slot === "dust").map((p) => ({ p, poly: inter([foldPoly(localPoly(p), p, Lb, Wb)], [opening])[0] ?? [] }));
      dusts.forEach((d) => show("dust", d.poly));
      show("lid", lid.poly);
      const cover = area(inter([opening], [lid.poly])) / (Lb * Wb);
      add("cover", "Lid covers the opening", cover >= 0.985, `The lid covers ${r1(cover * 100)} % of the opening.`);
      const reach = dusts.map((d) => {
        const b = bounds([d.poly]);
        return !b ? 0 : d.p.panel === 3 ? b.x1 : Lb - b.x0;
      });
      const gap = Lb - reach.reduce((a, b) => a + b, 0);
      add("dust", "Dust flaps clear each other", gap >= 0, gap >= 0 ? `${r1(gap)} mm between the dust flap tips.` : `The dust flaps overlap by ${r1(-gap)} mm and collide.`);
      const tuck = lid.piece.meta?.tuckDepth ?? 0;
      add("tuck", "Tuck fits inside the carton", tuck <= o.bodyHeight - 3, `Tuck ${r1(tuck)} mm deep in a ${r1(o.bodyHeight)} mm body.`);
    } else if (slots.includes("gableRoof")) {
      const roofs = end.filter((p) => p.slot === "gableRoof").map((p) => inter([foldPoly(localPoly(p, p.meta?.roof), p, Lb, Wb)], [opening])[0] ?? []);
      roofs.forEach((r) => show("roof", r));
      view.marks.push({ kind: "centre", pts: [pt(0, Wb / 2), pt(Lb, Wb / 2)] });
      const roof = end.find((p) => p.slot === "gableRoof")!.meta ?? {};
      const endP = end.find((p) => p.slot === "gableEnd")?.meta ?? {};
      const gap = Wb - 2 * (roof.roof ?? 0);
      const max = 3 * t + 1.5;
      add("meet", "Roofs meet at the ridge", gap >= -0.5 && gap <= max, gap < -0.5 ? `The roofs overlap by ${r1(-gap)} mm.` : `${r1(gap)} mm between the roofs for the two handle layers (up to ${r1(max)} mm).`);
      const slotOk = (endP.slotH ?? 0) >= (roof.handleEnd ?? 0) + 2;
      add("slot", "Handle ends fit the gable slots", slotOk, `Slot ${r1(endP.slotH ?? 0)} mm high for a handle end of ${r1(roof.handleEnd ?? 0)} mm.`);
      add("slotw", "Slots take both handle layers", (endP.slotW ?? 0) >= 2 * t, `Slot ${r1(endP.slotW ?? 0)} mm wide for 2 × ${r1(t)} mm of board.`);
    } else continue;

    if (view.flaps.length) views.push(view);
  }
  return { views, checks };
}
