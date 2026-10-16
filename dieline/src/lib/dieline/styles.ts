// One-piece styles that are not four-panel tubes: roll-end mailer
// (FEFCO 0427) and counter display. Each builds its outline as one
// closed path, clockwise on the flat blank, like the tube builder.

import { buildLabels } from "./carton";
import { arc3, clamp, filletPolyline, insetConvex, line, polygon, pt, reversePath, roundedRect, xfSeg, type Pt, type Seg, type Xf } from "./geom";
import type { Blank } from "./carton";
import type { CartonParams, Dimension, Issue, Panel, Region, Resolved, Stroke } from "./types";

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const mirrorX = (w: number): Xf => ({ a: -1, b: 0, c: 0, d: 1, e: w, f: 0 });

/** Chains points into line segments, with optional fillets at the inner points. */
function poly(points: Pt[], radii?: number[]): Seg[] {
  return radii ? filletPolyline(points, radii) : points.slice(1).map((q, i) => line(points[i], q));
}

/** Completes a left–right symmetric outline from its right half (top centre → bottom centre, clockwise). */
function mirrorClose(right: Seg[], w: number): Seg[] {
  return [...right, ...reversePath(right.map((s) => xfSeg(mirrorX(w), s)))];
}

function finish(p: CartonParams, outline: Seg[], strokes: Stroke[], regions: Region[], panels: Panel[], dims: Dimension[]): Blank {
  return { outline, strokes, regions, panels, dims: p.showDimensions ? dims : [], texts: buildLabels(p, panels) };
}

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
    for (const seg of polygon(Ms([[0, y0], [3.5 * t, y0], [3.5 * t, y1], [0, y1]]))) half.push({ layer: "cut", seg });
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
    rect("base", "Base", 3.5 * t, t / 2, bl - 3.5 * t, bw - t / 2, false),
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
  return finish(p, outline, strokes, [], panels, dims);
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
  return finish(p, outline, strokes, regions, panels, dims);
}
