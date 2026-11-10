// One-piece styles that are not four-panel tubes: roll-end mailer
// (FEFCO 0427) and counter display. Each builds its outline as one
// closed path, clockwise on the flat blank, like the tube builder.

import { buildLabels } from "./carton";
import { arc3, clamp, filletPolyline, insetConvex, line, polygon, pt, reversePath, roundedRect, samplePath, xfSeg, type Pt, type Seg, type Xf } from "./geom";
import type { Blank } from "./carton";
import type { FoldCheck } from "./fold";
import { FaceList, type Model3D } from "./fold3d";
import type { CartonParams, Dimension, Issue, Panel, Region, Resolved, Stroke } from "./types";

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const mm = (v: number) => fmt(v);
const mirrorX = (w: number): Xf => ({ a: -1, b: 0, c: 0, d: 1, e: w, f: 0 });

/** Chains points into line segments, with optional fillets at the inner points. */
function poly(points: Pt[], radii?: number[]): Seg[] {
  return radii ? filletPolyline(points, radii) : points.slice(1).map((q, i) => line(points[i], q));
}

/** Completes a left–right symmetric outline from its right half (top centre → bottom centre, clockwise). */
function mirrorClose(right: Seg[], w: number): Seg[] {
  return [...right, ...reversePath(right.map((s) => xfSeg(mirrorX(w), s)))];
}

function finish(p: CartonParams, outline: Seg[], strokes: Stroke[], regions: Region[], panels: Panel[], dims: Dimension[], checks: FoldCheck[] = [], model3d?: Model3D): Blank {
  return { outline, strokes, regions, panels, dims: p.showDimensions ? dims : [], texts: buildLabels(p, panels), fold: { views: [], checks }, model3d };
}

type XY = [number, number];

/** Adds a face and its mirror image (x → w − x), both given in a frame mapped onto the blank by `map`. */
function mirrored(F: FaceList, map: (x: number, y: number) => Pt, w: number) {
  return (poly: XY[], parent: [number, number], hinge: [XY, XY], angle: number, t0: number, t1: number, layer = 0): [number, number] => {
    const one = (flip: boolean, par: number) => {
      const m = ([x, y]: XY) => map(flip ? w - x : x, y);
      return F.add(poly.map(m), par, [m(hinge[0]), m(hinge[1])], angle, t0, t1, layer);
    };
    return [one(false, parent[0]), one(true, parent[1])];
  };
}

/** A closing check for builders that are not tubes. */
const check = (id: string, closure: string, label: string, ok: boolean, detail: string, severity: "error" | "warning" = "error"): FoldCheck => ({
  id,
  closure,
  label,
  ok,
  severity,
  detail,
});

/* ------------------------------------------------------------------ */
/* Roll-end tuck-front mailer, FEFCO 0427                              */
/* ------------------------------------------------------------------ */

/**
 * FEFCO 0427: base with double (rolled) side walls locked into the base by
 * tabs, single front and back walls with corner ears that tuck inside the
 * side walls, and a lid with dust flaps and a tuck-in front lip with ears.
 */
export function buildMailer(p: CartonParams, r: Resolved, issues: Issue[]): Blank {
  const t = r.t;
  const bl = r.Li + 6 * t;
  const bw = r.Wi + 2 * t;
  const H = r.Hi + t;
  if (H > bw / 2 - 3 * t) issues.push({ severity: "error", field: "H", message: `The corner ears need a height below half the width: keep the height under ${fmt(bw / 2 - 4 * t)} mm or widen the box.` });
  if (r.Li < 2 * H) issues.push({ severity: "warning", field: "L", message: "Mailers shorter than twice their height make a deep lid lip; check the lid closes." });
  if (t < 0.8) issues.push({ severity: "info", field: "caliper", message: "Mailers are normally cut from corrugated board (E or B flute). Check the caliper." });

  const Hd = H - t / 2;
  const E = bw / 2 - 2.5 * t;
  const xi = H + 3 * t + (H - t / 2);
  const tp = Math.max(1.5, 1.6 * t);
  // Base slots: 3.5 boards wide, and never narrower than the tab plus a board of play.
  const sd = Math.max(3.5 * t, tp + t);
  const tc = tp / 2;
  const yLid = bw + H - t / 2;
  const yA = bw + H + t / 2;
  const yT = yLid + bw;
  // Reference frame: x across, y upward from the front edge of the base; M maps it to the blank.
  const M = (x: number, y: number) => pt(bl - x, bw - y);
  const Ms = (pts: [number, number][]) => pts.map(([x, y]) => M(x, y));

  // Lip ear: arc about the lip hinge corner.
  const R = H - t / 2;
  const ex = 2 * t - H;
  const ey = yT + Math.sqrt(Math.max(0, R * R - (H - t) ** 2));
  const am = (Math.PI / 2 + Math.atan2(ey - yT, ex - t)) / 2;
  const right: Seg[] = [];
  right.push(...poly(Ms([[bl / 2, yT + H], [t, yT + H], [t, yT + H - t / 2]])));
  right.push(arc3(M(t, yT + H - t / 2), M(t + R * Math.cos(am), yT + R * Math.sin(am)), M(ex, ey)));
  right.push(...poly(Ms([[ex, ey], [2.7 * t, yT + 1.05 * t], [2.83 * t, yT - 1.7 * t]])));
  right.push(...poly(Ms([[2.83 * t, yT - 1.7 * t], [4 * t - Hd, yT - 1.7 * t - 0.16 * Hd], [4 * t - Hd, yA], [4 * t, yA]]), [0, Hd / 2, Hd / 2, 0]));
  right.push(
    ...poly(
      Ms([
        [4 * t, yA],
        [4 * t, yLid],
        [t, bw + H - t],
        [-E, bw + H - t],
        [-E, bw + 4.72 * t],
        [-H, bw + t],
        [-H, bw],
        [-(H + 3 * t), bw - t],
        [-xi, bw - t],
        [-xi, 0.8 * bw],
        [-xi - tp, 0.8 * bw - tc],
        [-xi - tp, 0.6 * bw + tc],
        [-xi, 0.6 * bw],
        [-xi, 0.4 * bw],
        [-xi - tp, 0.4 * bw - tc],
        [-xi - tp, 0.2 * bw + tc],
        [-xi, 0.2 * bw],
        [-xi, t],
        [-(H + 3 * t), t],
        [-H, 0],
        [-H, -t],
        [-E, -4.72 * t],
        [-E, -(H - t)],
        [2 * t, -(H - t)],
        [bl / 2, -(H - t)],
      ]),
    ),
  );
  const outline = mirrorClose(right, bl);

  // Internal lines, drawn for the right side and mirrored.
  const half: Stroke[] = [];
  const C = (a: [number, number], b: [number, number]) => half.push({ layer: "crease", seg: line(M(...a), M(...b)) });
  const K = (a: [number, number], b: [number, number]) => half.push({ layer: "cut", seg: line(M(...a), M(...b)) });
  C([0, 0], [0, 0.2 * bw]);
  C([0, 0.4 * bw], [0, 0.6 * bw]);
  C([0, 0.8 * bw], [0, bw]);
  C([-H, 0], [-H, bw]);
  C([-(H + 3 * t), t], [-(H + 3 * t), bw - t]);
  C([2 * t, -(H - t)], [2 * t, t / 2]);
  C([t, bw - t / 2], [t, bw + H - t]);
  C([4 * t, yA], [4 * t, yT]);
  const hingeY = yT + 1.05 * t + ((2.7 * t - t) / (2.7 * t - ex)) * (ey - yT - 1.05 * t);
  C([t, hingeY], [t, yT + H - t / 2]);
  K([0, 0], [-H, 0]);
  K([0, 0], [2 * t, t / 2]);
  K([0, bw], [-H, bw]);
  K([0, bw], [t, bw - t / 2]);
  for (const [y0, y1] of [
    [0.2 * bw, 0.4 * bw],
    [0.6 * bw, 0.8 * bw],
  ]) {
    for (const seg of polygon(Ms([[0, y0], [sd, y0], [sd, y1], [0, y1]]))) half.push({ layer: "cut", seg });
  }
  const strokes: Stroke[] = [...half, ...half.map((s) => ({ ...s, seg: xfSeg(mirrorX(bl), s.seg) }))];
  strokes.push({ layer: "crease", seg: line(M(2 * t, t / 2), M(bl - 2 * t, t / 2)) });
  strokes.push({ layer: "crease", seg: line(M(t, bw - t / 2), M(bl - t, bw - t / 2)) });
  strokes.push({ layer: "crease", seg: line(M(4 * t, yLid), M(bl - 4 * t, yLid)) });
  strokes.push({ layer: "crease", seg: line(M(4 * t, yT), M(bl - 4 * t, yT)) });

  const rect = (id: Panel["id"], name: string, x0: number, y0: number, x1: number, y1: number, printable = true): Panel => {
    const a = M(x0, y0);
    const b = M(x1, y1);
    return { id, name, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y), printable };
  };
  const panels: Panel[] = [
    rect("topLid", "Lid", 4 * t, yLid, bl - 4 * t, yT),
    rect("topTuck", "Lid front", t, yT, bl - t, yT + H),
    rect("back", "Back", t, bw - t / 2, bl - t, bw + H - t),
    rect("base", "Base", sd, t / 2, bl - sd, bw - t / 2, false),
    rect("front", "Front", 2 * t, -(H - t), bl - 2 * t, t / 2),
    rect("sideA", "Side A", bl, 0, bl + H, bw),
    rect("sideB", "Side B", -H, 0, 0, bw),
  ];
  const lid = panels[0];
  const base = panels[3];
  const side = panels[5];
  const dims: Dimension[] = [
    { a: pt(0, base.y + base.h * 0.3), b: pt(bl, base.y + base.h * 0.3), offset: 0, text: fmt(bl) },
    { a: pt(bl / 2 + Math.min(30, bl * 0.2), 0), b: pt(bl / 2 + Math.min(30, bl * 0.2), bw), offset: 0, text: fmt(bw) },
    { a: pt(side.x, side.y + side.h * 0.3), b: pt(side.x + side.w, side.y + side.h * 0.3), offset: 0, text: fmt(H) },
    { a: pt(lid.x + Math.min(12, lid.w * 0.1), lid.y), b: pt(lid.x + Math.min(12, lid.w * 0.1), lid.y + lid.h), offset: 0, text: fmt(lid.h) },
  ];
  // Closing checks: what happens when the walls roll in and the lid closes.
  const earGap = bw - 2 * E;
  const tabLen = 0.2 * bw - 2 * tc;
  const dustRun = yT - 1.7 * t - 0.16 * Hd - yA - Hd;
  const checks = [
    check("ears", "Walls", "Front and back corner ears clear each other", earGap >= 2 * t, `${mm(earGap)} mm between the ears inside each side wall.`),
    check("tabs", "Walls", "Side wall tabs fit the base slots", 0.2 * bw - tabLen >= 1 && sd >= tp + t * 0.5, `Tabs ${mm(tabLen)} × ${mm(tp)} mm into slots ${mm(0.2 * bw)} × ${mm(sd)} mm.`),
    check("inner", "Walls", "Inner side walls reach the base", H - t / 2 >= H - 1.5 * t, `Inner wall ${mm(H - t / 2)} mm in an outer wall of ${mm(H)} mm.`),
    check("dust", "Lid", "Lid dust flaps have room along the lid", dustRun >= 0, dustRun >= 0 ? `${mm(dustRun)} mm of straight edge between the rounded corners.` : `The rounded corners overlap by ${mm(-dustRun)} mm; the box is too tall for its width.`),
  ];
  // 3D: walls up with their ears tucked in, side walls rolled over, then the fLid with its dust flaps and fFront lip.
  const F = new FaceList();
  const both = mirrored(F, M, bl);
  const one = (poly: XY[], parent: number, hinge: [XY, XY], angle: number, t0: number, t1: number, layer = 0) =>
    F.add(poly.map(([x, y]) => M(x, y)), parent, [M(...hinge[0]), M(...hinge[1])], angle, t0, t1, layer);
  const fBase = one([[0, 0], [bl, 0], [bl, bw], [0, bw]], -1, [[0, 0], [1, 0]], 0, 0, 0);
  const fFront = one([[2 * t, -(H - t)], [bl - 2 * t, -(H - t)], [bl - 2 * t, t / 2], [2 * t, t / 2]], fBase, [[2 * t, t / 2], [bl - 2 * t, t / 2]], 90, 0.05, 0.3);
  both([[2 * t, t / 2], [0, 0], [-H, 0], [-H, -t], [-E, -4.72 * t], [-E, -(H - t)], [2 * t, -(H - t)]], [fFront, fFront], [[2 * t, t / 2], [2 * t, -(H - t)]], 90, 0.05, 0.3);
  const fBack = one([[t, bw - t / 2], [bl - t, bw - t / 2], [bl - t, bw + H - t], [bl - 4 * t, yLid], [4 * t, yLid], [t, bw + H - t]], fBase, [[t, bw - t / 2], [bl - t, bw - t / 2]], 90, 0.05, 0.3);
  both([[t, bw - t / 2], [0, bw], [-H, bw], [-H, bw + t], [-E, bw + 4.72 * t], [-E, bw + H - t], [t, bw + H - t]], [fBack, fBack], [[t, bw - t / 2], [t, bw + H - t]], 90, 0.05, 0.3);
  const outer = both([[0, 0], [0, bw], [-H, bw], [-H, 0]], [fBase, fBase], [[0, 0], [0, bw]], 90, 0.32, 0.47);
  const strip = both([[-H, 0], [-H, bw], [-(H + 3 * t), bw - t], [-(H + 3 * t), t]], outer, [[-H, 0], [-H, bw]], 90, 0.47, 0.57);
  both([[-(H + 3 * t), t], [-(H + 3 * t), bw - t], [-xi, bw - t], [-xi, t]], strip, [[-(H + 3 * t), t], [-(H + 3 * t), bw - t]], 90, 0.5, 0.62);
  const fLid = one([[4 * t, yLid], [bl - 4 * t, yLid], [bl - 4 * t, yT], [4 * t, yT]], fBack, [[4 * t, yLid], [bl - 4 * t, yLid]], 90, 0.7, 0.84, 1);
  // Lid dust flaps with their rounded corners, folded in before the lid comes over so they drop inside the walls.
  const dustEdge = samplePath(poly([pt(2.83 * t, yT - 1.7 * t), pt(4 * t - Hd, yT - 1.7 * t - 0.16 * Hd), pt(4 * t - Hd, yA), pt(4 * t, yA)], [0, Hd / 2, Hd / 2, 0]), 1);
  both([[4 * t, yT - 1.7 * t], ...dustEdge.map((q): XY => [q.x, q.y])], [fLid, fLid], [[4 * t, yA], [4 * t, yT]], 90, 0.6, 0.68);
  const lip = one([[t, yT], [bl - t, yT], [bl - t, yT + H], [t, yT + H]], fLid, [[4 * t, yT], [bl - 4 * t, yT]], 90, 0.9, 0.99, 0);
  both([[t, hingeY], [t, yT + H - t / 2], [ex, ey], [2.7 * t, yT + 1.05 * t]], [lip, lip], [[t, hingeY], [t, yT + H - t / 2]], 90, 0.84, 0.9);

  return finish(p, outline, strokes, [], panels, dims, checks, { faces: F.faces, root: "base", gap: 0.15 });
}

/* ------------------------------------------------------------------ */
/* Counter display                                                     */
/* ------------------------------------------------------------------ */

/**
 * Counter display tray: base, double front wall locked into the base,
 * side walls that slope up from the front height H to H + rise at the back,
 * and a back wall that carries the header. Corner flaps on the side walls
 * are glued inside the front and back walls.
 */
export function buildDisplay(p: CartonParams, r: Resolved, issues: Issue[]): Blank {
  const t = r.t;
  const L = r.Li + t;
  const W = r.Wi + t;
  const Hf = r.Hi + t / 2;
  const rise = Math.max(0, p.display.rise);
  const Hs = Hf + rise;
  const header = Math.max(0, p.display.header);
  const Hb = Hs + header;
  const g = clamp(Math.min(W, Hf) * 0.35, 6, 25);
  const tp = Math.max(1.5, 1.6 * t);
  const fr = clamp(Math.min(L, header || Hs) * 0.08, 2, 12);
  if (g > W / 2 - 2) issues.push({ severity: "error", field: "W", message: "The display is too shallow for its corner flaps. Increase the depth." });
  if (rise > W * 1.5) issues.push({ severity: "warning", field: "display", message: "The side walls slope very steeply; products may fall out of the front." });
  if (Hf < 15) issues.push({ severity: "warning", field: "H", message: "A front wall under 15 mm holds products poorly." });

  const Hi2 = Hf - t;
  const ins = 1.5 * t;
  const tabs: [number, number][] = [
    [0.2 * L, 0.35 * L],
    [0.65 * L, 0.8 * L],
  ];
  // Right half, clockwise from the top of the header to the bottom of the inner front wall.
  const right: Seg[] = [];
  right.push(...poly([pt(L / 2, -Hb), pt(L, -Hb), pt(L, -g + 1)], [0, header > 0 ? fr : 0, 0]));
  right.push(
    ...poly([
      pt(L, -g + 1),
      pt(L + 1.5, -g),
      pt(L + Hs - 2, -g),
      pt(L + Hs, -2),
      pt(L + Hs, 0),
      pt(L + Hf, W),
      pt(L + Hf, W + 2),
      pt(L + Hf - 2, W + g),
      pt(L + 1.5, W + g),
      pt(L, W + g - 1),
      pt(L, W + Hf),
    ]),
  );
  // Inner front wall, folded over a 2t strip and locked into the base by two tabs.
  const yI = W + Hf;
  const yJ = yI + 2 * t;
  const yE = yJ + Hi2;
  const innerRight: Pt[] = [pt(L, yI), pt(L - ins, yI), pt(L - ins, yE)];
  for (const [a, b] of [...tabs].reverse()) {
    innerRight.push(pt(L - a, yE), pt(L - a - tp * 0.5, yE + tp), pt(L - b + tp * 0.5, yE + tp), pt(L - b, yE));
  }
  innerRight.push(pt(L / 2, yE));
  right.push(...poly(innerRight));
  const outline = mirrorClose(right, L);

  const strokes: Stroke[] = [];
  const both = (seg: Seg, layer: Stroke["layer"]) => {
    strokes.push({ layer, seg });
    strokes.push({ layer, seg: xfSeg(mirrorX(L), seg) });
  };
  both(line(pt(L, 0), pt(L, W)), "crease");
  both(line(pt(L, 0), pt(L + Hs, 0)), "crease");
  both(line(pt(L, W), pt(L + Hf, W)), "crease");
  both(line(pt(L, 0), pt(L, -g + 1)), "cut");
  both(line(pt(L, W), pt(L, W + g - 1)), "cut");
  strokes.push({ layer: "crease", seg: line(pt(0, 0), pt(L, 0)) });
  strokes.push({ layer: "crease", seg: line(pt(0, W), pt(L, W)) });
  strokes.push({ layer: "crease", seg: line(pt(ins, yI), pt(L - ins, yI)) });
  strokes.push({ layer: "crease", seg: line(pt(ins, yJ), pt(L - ins, yJ)) });
  for (const [a, b] of tabs) for (const seg of polygon([pt(a, W - 4 * t), pt(b, W - 4 * t), pt(b, W - 0.5 * t), pt(a, W - 0.5 * t)])) strokes.push({ layer: "cut", seg });
  if (header > 20 && L > 60) {
    const hw = clamp(L * 0.3, 20, 60);
    for (const seg of roundedRect(L / 2 - hw / 2, -Hb + Math.min(10, header * 0.2), hw, Math.min(8, header * 0.15), 2)) strokes.push({ layer: "cut", seg });
  }

  const regions: Region[] = [];
  for (const [x0, x1] of [
    [L + 2, L + Hs - 3],
    [-Hs + 3, -2],
  ]) {
    regions.push({ layer: "glue", pts: insetConvex([pt(x0, -g + 1.5), pt(x1, -g + 1.5), pt(x1, -1.5), pt(x0, -1.5)], 1.5), label: "Glue" });
  }
  for (const [x0, x1] of [
    [L + 2, L + Hf - 3],
    [-Hf + 3, -2],
  ]) {
    regions.push({ layer: "glue", pts: insetConvex([pt(x0, W + 1.5), pt(x1, W + 1.5), pt(x1, W + g - 1.5), pt(x0, W + g - 1.5)], 1.5), label: "Glue" });
  }

  const panels: Panel[] = [
    { id: "header", name: "Header", x: 0, y: -Hb, w: L, h: header, printable: header > 0 },
    { id: "back", name: "Back", x: 0, y: -Hs, w: L, h: Hs, printable: true },
    { id: "base", name: "Base", x: 0, y: 0, w: L, h: W, printable: false },
    { id: "front", name: "Front", x: 0, y: W, w: L, h: Hf, printable: true },
    { id: "sideA", name: "Side A", x: L, y: 0, w: Hf, h: W, printable: true },
    { id: "sideB", name: "Side B", x: -Hf, y: 0, w: Hf, h: W, printable: true },
  ].filter((q) => q.h > 0) as Panel[];
  const dims: Dimension[] = [
    { a: pt(0, W * 0.3), b: pt(L, W * 0.3), offset: 0, text: fmt(L) },
    { a: pt(L * 0.75, 0), b: pt(L * 0.75, W), offset: 0, text: fmt(W) },
    { a: pt(L * 0.25, W), b: pt(L * 0.25, W + Hf), offset: 0, text: fmt(Hf) },
    { a: pt(L * 0.25, -Hb), b: pt(L * 0.25, 0), offset: 0, text: fmt(Hb) },
  ];
  // Closing checks: corner flaps folded onto the front and back walls, and the inner front wall into its slots.
  const flapGap = L - 2 * g;
  const foot = 2 * t;
  const checks = [
    check("front", "Walls", "Corner flaps on the front wall clear each other", flapGap >= 2, `${mm(flapGap)} mm between the two corner flaps.`),
    check("back", "Walls", "Corner flaps on the back wall clear each other", flapGap >= 2, `${mm(flapGap)} mm between the two corner flaps.`),
    check("height", "Walls", "Corner flaps fit within the wall heights", g <= Hf && Hb >= Hs, `Flaps ${mm(g)} mm wide on a ${mm(Hf)} mm front wall; back wall ${mm(Hb)} mm for ${mm(Hs)} mm sides.`),
    check("lock", "Front", "Inner front wall lands in the base slots", foot >= 0.5 * t && foot <= 4 * t, `Its foot sits ${mm(foot)} mm from the fold, inside slots ${mm(0.5 * t)}–${mm(4 * t)} mm.`),
  ];
  // 3D: back, fFront and sloped sides up together, corner flaps glued inside, then the inner fFront wall rolled over into the fBase.
  const F = new FaceList();
  const pair = mirrored(F, (x, y) => pt(x, y), L);
  const fBase = F.add([pt(0, 0), pt(L, 0), pt(L, W), pt(0, W)], -1, null);
  F.add([pt(0, -Hb), pt(L, -Hb), pt(L, 0), pt(0, 0)], fBase, [pt(0, 0), pt(L, 0)], 90, 0.05, 0.3, 1);
  const fFront = F.add([pt(0, W), pt(L, W), pt(L, W + Hf), pt(0, W + Hf)], fBase, [pt(0, W), pt(L, W)], 90, 0.05, 0.3, 1);
  const fSide = pair([[L, 0], [L + Hs, 0], [L + Hf, W], [L, W]], [fBase, fBase], [[L, 0], [L, W]], 90, 0.42, 0.62);
  pair([[L, 0], [L + Hs, 0], [L + Hs, -2], [L + Hs - 2, -g], [L + 1.5, -g], [L, -g + 1]], fSide, [[L, 0], [L + Hs, 0]], 90, 0.3, 0.42, -1);
  pair([[L, W], [L + Hf, W], [L + Hf, W + 2], [L + Hf - 2, W + g], [L + 1.5, W + g], [L, W + g - 1]], fSide, [[L, W], [L + Hf, W]], 90, 0.3, 0.42, -1);
  const strip = F.add([pt(ins, yI), pt(L - ins, yI), pt(L - ins, yJ), pt(ins, yJ)], fFront, [pt(ins, yI), pt(L - ins, yI)], 90, 0.65, 0.78);
  F.add([pt(ins, yJ), pt(L - ins, yJ), pt(L - ins, yE), pt(ins, yE)], strip, [pt(ins, yJ), pt(L - ins, yJ)], 90, 0.72, 0.95);

  return finish(p, outline, strokes, regions, panels, dims, checks, { faces: F.faces, root: "base", gap: 0.15 });
}

/* ------------------------------------------------------------------ */
/* Door box (double-layer door, reverse tuck)                          */
/* ------------------------------------------------------------------ */

/** Points along a cubic Bézier, without the first point. */
function bezier(a: Pt, b: Pt, c: Pt, d: Pt, n = 16): Pt[] {
  const out: Pt[] = [];
  for (let k = 1; k <= n; k++) {
    const s = k / n;
    const u = 1 - s;
    out.push(pt(u * u * u * a.x + 3 * u * u * s * b.x + 3 * u * s * s * c.x + s * s * s * d.x, u * u * u * a.y + 3 * u * u * s * b.y + 3 * u * s * s * c.y + s * s * s * d.y));
  }
  return out;
}

/** Fixed parts of the door box, in mm, as on the produced carton. */
export const DOOR = {
  notchR: 7.366,
  notchDrop: 0.756,
  tabW: 10,
  tabH: 30,
  tabR: 4.483,
  moonR: 7.366,
  slit: 32,
  tuck: 14.5,
  /** Dust flap depth, as a share of the door panel width. */
  dust: 0.625,
};

/**
 * Door box: one sheet, printed on one side. Left to right: glue flap, back
 * (thumb notch, bottom lid), side A, door outer, door inner, inner front
 * (top lid), side B. The door's two layers are glued back to back (3 | 4 folds
 * 180°); the inner front folds back the other way (4 | 5, reverse fold), so the
 * printed faces of door inner and inner front open as one spread. A tab on the
 * door's free edge locks into a slit at the inner front | side B corner.
 */
export function buildDoorBox(p: CartonParams, r: Resolved, issues: Issue[]): Blank {
  const t = r.t;
  const A = r.Li + t;
  const B = r.Wi + t;
  const Hp = r.bodyHeight;
  const D = B;
  const T = clamp(p.tuckDepth ?? DOOR.tuck, 8, Math.max(8, D - 5));
  const g = clamp(p.glueWidth ?? 10, 6, 20);
  const taper = Math.min(5, Hp / 4);
  const X = [0, A, A + B, 2 * A + B, 3 * A + B - t, 4 * A + B - 2 * t, 4 * A + 2 * B - 2 * t];
  const cy = Hp / 2;
  const h = DOOR.dust * A;
  const s = 3 + (6.72 / 31.5) * (h - 6);
  const { notchR, notchDrop, tabW, tabH, tabR, moonR } = DOOR;
  const sl = DOOR.slit / 2;
  const cx = A / 2;

  if (A - t < 2 * 15.5 + 2) issues.push({ severity: "error", field: "L", message: `The tuck needs a lid at least 33 mm wide: make the length at least ${fmt(33 + 2 * t)} mm.` });
  if (B < s + 6) issues.push({ severity: "error", field: "W", message: "The side panels are too narrow for their dust flaps. Increase the width." });
  if (cy - sl < 10) issues.push({ severity: "error", field: "H", message: `The door tab and its slit need more height: keep the height above ${fmt(2 * (sl + 10) - t)} mm.` });
  if (A < 2 * notchR + 8) issues.push({ severity: "warning", field: "L", message: "The thumb notch leaves little board either side on so narrow a back panel." });
  if (T > D - 5) issues.push({ severity: "warning", field: "tuckDepth", message: `Tuck depth is limited to ${fmt(D - 5)} mm by the lid depth.` });

  // Tuck lid from its hinge outwards: `dir` is −1 for the top, +1 for the bottom; x0..x1 the panel.
  const lidRun = (x0: number, x1: number, y0: number, dir: 1 | -1, fromLeft: boolean): Pt[] => {
    const yE = y0 + dir * D;
    const yT = yE + dir * T;
    const left = [pt(x0, y0), pt(x0, yE), pt(x0 + 0.5, yE), ...bezier(pt(x0 + 0.5, yE), pt(x0 + 0.5, yE + (dir * T * 2) / 3), pt(x0 + 5.5, yT), pt(x0 + 15.5, yT))];
    const right = [pt(x1 - 15.5, yT), ...bezier(pt(x1 - 15.5, yT), pt(x1 - 5.5, yT), pt(x1 - 0.5, yE + (dir * T * 2) / 3), pt(x1 - 0.5, yE)), pt(x1, yE), pt(x1, y0)];
    const run = [...left, ...right];
    return fromLeft ? run : run.reverse();
  };
  // Dust flaps, from the panel's left fold xa.
  const dustA = (xa: number, y0: number, dir: 1 | -1): Pt[] => [pt(xa + 1, y0 + dir), pt(xa + 4, y0 + dir * h), pt(xa + B - s, y0 + dir * h), pt(xa + B - 3, y0 + dir * 6), pt(xa + B - 1, y0 + dir * 4), pt(xa + B - 1, y0)];
  const dustB = (xa: number, y0: number, dir: 1 | -1): Pt[] => [pt(xa + 1, y0), pt(xa + 1, y0 + dir * 4), pt(xa + 3, y0 + dir * 6), pt(xa + s, y0 + dir * h), pt(xa + B - 4, y0 + dir * h), pt(xa + B - 1, y0 + dir)];

  const notchA = pt(cx - notchR, notchDrop);
  const notchB = pt(cx + notchR, notchDrop);
  const outline: Seg[] = [
    ...poly([pt(0, 0), pt(cx - notchR, 0), notchA]),
    arc3(notchA, pt(cx, notchDrop + notchR), notchB),
    ...poly([
      notchB,
      pt(cx + notchR, 0),
      pt(X[1], 0),
      ...dustA(X[1], 0, -1),
      ...lidRun(X[4], X[5], 0, -1, true),
      ...dustB(X[5], 0, -1),
      pt(X[6], 0),
      pt(X[6], Hp),
      ...[...dustA(X[5], Hp, 1)].reverse(),
      pt(X[5], Hp),
      pt(X[2], Hp),
      ...[...dustB(X[1], Hp, 1)].reverse(),
      pt(X[1], Hp),
      ...lidRun(0, X[1], Hp, 1, false),
      pt(-g, Hp - taper),
      pt(-g, taper),
      pt(0, 0),
    ].filter((q, k, a) => k === 0 || Math.hypot(q.x - a[k - 1].x, q.y - a[k - 1].y) > 1e-6)),
  ];

  const strokes: Stroke[] = [];
  const C = (a: Pt, b: Pt) => strokes.push({ layer: "crease", seg: line(a, b) });
  const K = (a: Pt, b: Pt) => strokes.push({ layer: "cut", seg: line(a, b) });
  C(pt(0, 0), pt(0, Hp));
  C(pt(X[1], 0), pt(X[1], Hp));
  C(pt(X[2], 0), pt(X[2], Hp));
  C(pt(X[3], 0), pt(X[3], cy - tabH / 2));
  C(pt(X[3], cy + tabH / 2), pt(X[3], Hp));
  C(pt(X[4], 0), pt(X[4], Hp));
  C(pt(X[5], 0), pt(X[5], cy - sl));
  C(pt(X[5], cy + sl), pt(X[5], Hp));
  C(pt(X[4], 0), pt(X[5], 0));
  C(pt(0, Hp), pt(X[1], Hp));
  for (const [xa, xb] of [
    [X[1], X[2]],
    [X[5], X[6]],
  ]) {
    C(pt(xa + 1, 0), pt(xb - 1, 0));
    C(pt(xa + 1, Hp), pt(xb - 1, Hp));
  }
  // Tuck creases 0.5 mm in from the lid end, with short slits at each side.
  for (const [x0, x1, yE, dir] of [
    [X[4], X[5], -D, 1],
    [0, X[1], Hp + D, -1],
  ] as const) {
    const yc = yE + dir * 0.5;
    C(pt(x0 + 4, yc), pt(x1 - 4, yc));
    for (const [xa, xb] of [
      [x0 + 0.5, x0 + 4],
      [x1 - 0.5, x1 - 4],
    ]) {
      K(pt(xa, yE), pt(xb, yE));
      K(pt(xb, yE), pt(xb, yc));
    }
  }
  // Door tab: cut in the door inner panel, left attached to the door outer.
  const tabPts = [pt(X[3], cy - tabH / 2), pt(X[3] + tabW, cy - tabH / 2), pt(X[3] + tabW, cy + tabH / 2), pt(X[3], cy + tabH / 2)];
  for (const seg of filletPolyline(tabPts, [0, tabR, tabR, 0])) strokes.push({ layer: "cut", seg });
  // Slit on the inner front | side B fold, through a half-moon for the finger.
  K(pt(X[5], cy - sl), pt(X[5], cy - moonR));
  strokes.push({ layer: "cut", seg: arc3(pt(X[5], cy - moonR), pt(X[5] + moonR, cy), pt(X[5], cy + moonR)) });
  K(pt(X[5], cy + moonR), pt(X[5], cy + sl));

  const regions: Region[] = [
    { layer: "glue", pts: insetConvex([pt(-g, taper), pt(0, 0), pt(0, Hp), pt(-g, Hp - taper)], 1.5), label: "Glue" },
    { layer: "glue", pts: [pt(X[3] + tabW + 3, 3), pt(X[4] - 3, 3), pt(X[4] - 3, Hp - 3), pt(X[3] + tabW + 3, Hp - 3)], label: "Glue" },
  ];

  const panels: Panel[] = [
    { id: "back", name: "Back", x: 0, y: 0, w: A, h: Hp, printable: true },
    { id: "sideA", name: "Side A", x: X[1], y: 0, w: B, h: Hp, printable: true },
    { id: "front", name: "Door outer", x: X[2], y: 0, w: A, h: Hp, printable: true },
    { id: "doorInner", name: "Door inner", x: X[3], y: 0, w: A - t, h: Hp, printable: true },
    { id: "innerFront", name: "Inner front", x: X[4], y: 0, w: A - t, h: Hp, printable: true },
    { id: "sideB", name: "Side B", x: X[5], y: 0, w: B, h: Hp, printable: true },
    { id: "topLid", name: "Top lid", x: X[4], y: -D, w: A - t, h: D, printable: true },
    { id: "topTuck", name: "Top tuck", x: X[4] + 0.5, y: -D - T, w: A - t - 1, h: T, printable: true },
    { id: "bottomLid", name: "Bottom lid", x: 0, y: Hp, w: A, h: D, printable: true },
    { id: "bottomTuck", name: "Bottom tuck", x: 0.5, y: Hp + D, w: A - 1, h: T, printable: true },
    { id: "glueFlap", name: "Glue flap", x: -g, y: 0, w: g, h: Hp, printable: false },
  ];
  const dims: Dimension[] = [
    { a: pt(0, Hp * 0.3), b: pt(A, Hp * 0.3), offset: 0, text: fmt(A) },
    { a: pt(X[1], Hp * 0.3), b: pt(X[2], Hp * 0.3), offset: 0, text: fmt(B) },
    { a: pt(X[4], Hp * 0.3), b: pt(X[5], Hp * 0.3), offset: 0, text: fmt(A - t) },
    { a: pt(X[1] + B * 0.25, 0), b: pt(X[1] + B * 0.25, Hp), offset: 0, text: fmt(Hp) },
    { a: pt(X[4] + (A - t) * 0.25, -D), b: pt(X[4] + (A - t) * 0.25, 0), offset: 0, text: fmt(D) },
  ];

  // Closing checks.
  const checks = [
    check("door-tab", "Door", "The door tab fits its slit", tabH <= 2 * sl - 1 && cy - sl >= 10, `Tab ${mm(tabH)} mm into a ${mm(2 * sl)} mm slit, ${mm(cy - sl)} mm from the lids.`),
    check("door-wrap", "Door", "The door's two layers and the inner front close flush", Math.abs(X[3] - X[2] - (X[5] - X[4]) - t) < 1e-6, `Door outer ${mm(A)} mm, door inner and inner front ${mm(A - t)} mm each (one caliper less).`),
    check("tuck", "Lids", "The tucks reach inside the walls", T >= 8 && A - t >= 33, `Tuck ${mm(T)} mm on lids ${mm(A - t)} and ${mm(A)} mm wide.`),
    check("dust", "Lids", "Dust flaps meet under the lid without hitting the far wall", h < A - 2 && 2 * h - A >= 0, `Dust flaps ${mm(h)} mm deep in a ${mm(A)} mm opening: they overlap ${mm(2 * h - A)} mm.`),
  ];

  // 3D: door layers glued and reverse-folded flat first, glue flap, the walls round, bottom then top, the tab last.
  const F = new FaceList();
  const P = (pts: [number, number][]) => pts.map(([x, y]) => pt(x, y));
  const vh = (x: number): [Pt, Pt] => [pt(x, 0), pt(x, Hp)];
  const notch = [pt(cx - notchR, 0), notchA, ...samplePath([arc3(notchA, pt(cx, notchDrop + notchR), notchB)], 1).slice(1), pt(cx + notchR, 0)];
  const f1 = F.add([pt(0, 0), ...notch, pt(A, 0), pt(A, Hp), pt(0, Hp)], -1, null);
  F.add(P([[0, 0], [-g, taper], [-g, Hp - taper], [0, Hp]]), f1, vh(0), 90, 0.16, 0.24, -1);
  const f2 = F.add(P([[X[1], 0], [X[2], 0], [X[2], Hp], [X[1], Hp]]), f1, vh(X[1]), 90, 0.24, 0.42);
  // The door (outer and inner layers) hangs from side A and closes last, so unfolding opens it first.
  // The inner front follows the walls as if hung from the door's folds, without moving when the door opens.
  const f3 = F.add(P([[X[2], 0], [X[3], 0], [X[3], Hp], [X[2], Hp]]), f2, vh(X[2]), 90, 0.86, 0.95);
  // The tab with its rounded corners, as on the dieline (from its base at the door fold, round and back).
  const tabShape = samplePath(filletPolyline(tabPts, [0, tabR, tabR, 0]), 0.6);
  const f4 = F.add([pt(X[3], 0), pt(X[4], 0), pt(X[4], Hp), pt(X[3], Hp), ...[...tabShape].reverse()], f3, vh(X[3]), 180, 0, 0.08, 1);
  // The half-moon disc bends with side B, leaving the finger hole at the corner.
  const f5 = F.add(P([[X[4], 0], [X[5], 0], [X[5], Hp], [X[4], Hp]]), f2, vh(X[4]), -180, 0.08, 0.16, -1);
  F.faces[f5].via = [
    { hinge: vh(X[2]), angle: 90, t0: 0.24, t1: 0.42, ref: f3, lift: 0 },
    { hinge: vh(X[3]), angle: 180, t0: 0, t1: 0.08, ref: f4, lift: 1 },
  ];
  const f6 = F.add(P([[X[5], 0], [X[6], 0], [X[6], Hp], [X[5], Hp]]), f5, vh(X[5]), 90, 0.24, 0.42, -1);
  const tab = F.add(tabShape, f3, [pt(X[3], cy - tabH / 2), pt(X[3], cy + tabH / 2)], 90, 0.95, 1, -1);
  // The door's own slider: the door swings open with its tab still bent, and the tab straightens only once it is fully open.
  if (f3 >= 0) F.faces[f3].open = { angle: 90, e0: 0, e1: 0.85 };
  if (tab >= 0) F.faces[tab].open = { angle: 90, e0: 0.85, e1: 1 };
  // Dust flaps overlap under the lid: side A's goes in first, side B's over it.
  for (const [face, xa, flap, y0, win, layer] of [
    [f2, X[1], dustA, 0, [0.42, 0.47], 0],
    [f6, X[5], dustB, 0, [0.46, 0.51], 0],
    [f2, X[1], dustB, Hp, [0.66, 0.71], 0],
    [f6, X[5], dustA, Hp, [0.7, 0.75], 0],
  ] as const) {
    const pts = y0 === 0 ? flap(xa, 0, -1) : flap(xa, Hp, 1);
    F.add([pt(xa, y0), ...pts, pt(xa + B, y0)], face, [pt(xa, y0), pt(xa + B, y0)], 90, win[0], win[1], layer);
  }
  // Lids and their tucks, split at the tuck crease.
  for (const [face, x0, x1, y0, dir, win, layer] of [
    // The inner front's end closes first; the back's lid closes last, so unfolding opens it first.
    [f5, X[4], X[5], 0, -1, [0.51, 0.64], 1],
    [f1, 0, X[1], Hp, 1, [0.75, 0.85], 2],
  ] as const) {
    const yc = y0 + dir * (D - 0.5);
    const run = lidRun(x0, x1, y0, dir, true);
    const tuckPts = [pt(x0 + 0.5, yc), ...run.filter((q) => dir * (q.y - yc) > 1e-6), pt(x1 - 0.5, yc)];
    // The tuck is bent in first and held at an angle while the lid comes over (it opens the same way, tuck still bent).
    const lid = F.add([pt(x0, y0), pt(x0, yc), pt(x1, yc), pt(x1, y0)], face, [pt(x0, y0), pt(x1, y0)], 90, win[0] + (win[1] - win[0]) * 0.35, win[1], layer);
    const tuck = F.add(tuckPts, lid, [pt(x0 + 4, yc), pt(x1 - 4, yc)], 135, win[0], win[0] + (win[1] - win[0]) * 0.4, layer - 2);
    if (tuck >= 0 && lid >= 0) F.faces[tuck].cap = { face: lid, sum: 180 };
  }

  return finish(p, outline, strokes, regions, panels, dims, checks, { faces: F.faces, root: "wall", gap: Math.max(0.15, t * 0.5), opener: "Door" });
}
