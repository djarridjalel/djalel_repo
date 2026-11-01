// Assembles a four-panel folding carton (tube with manufacturer's joint)
// from its closure pieces.
//
// Panel order on the flat blank, left to right:
//   glue flap | Side B (W) | Front (L + t) | Side A (W + t) | Back (L + t, free edge)
// The joint closes at the corner between Back and Side B, away from the
// front and from tear lines that run down from the front. The reverse tuck
// end keeps the standard layout instead:
//   glue flap | Front (L) | Side A (W + t) | Back (L + t) | Side B (W + t, free edge) Crease-to-crease
// widths carry thickness allowances so the erected carton keeps the
// requested inside dimensions. On the folder-gluer the second and fourth
// creases (Side B | Front, Side A | Back) are folded flat.

import {
  crashMainPiece,
  classicDustPiece,
  crashSidePiece,
  dustPiece,
  gableEndPiece,
  gableRoofPiece,
  hangerPiece,
  lidPiece,
  lockTabPiece,
  mirrorPiece,
  nonePiece,
  snapHookPiece,
  snapNotchPiece,
  snapTonguePiece,
  type LocalPanel,
  type Piece,
} from "./closures";
import { area, rect, type ClosurePiece, type FoldResult } from "./fold";
import { FaceList, piecePoly, split, type Model3D } from "./fold3d";
import { arc3, clamp, insetConvex, line, pt, reversePath, sampleSeg, xfApply, xfSeg, type Pt, type Seg, type Xf } from "./geom";
import { hasTopLid, isTray, type CartonParams, type Dimension, type Panel, type Region, type Resolved, type Stroke, type TextItem } from "./types";

export interface Blank {
  outline: Seg[];
  strokes: Stroke[];
  regions: Region[];
  panels: Panel[];
  dims: Dimension[];
  texts: TextItem[];
  /** End closures in their local frames, for the closing check. */
  closures?: ClosurePiece[];
  /** Closing checks computed by builders that are not tubes. */
  fold?: FoldResult;
  /** Faces and hinges for the 3D folding view. */
  model3d?: Model3D;
}

type Slot =
  | "none"
  | "hanger"
  | "lockTab"
  | "lid"
  | "dust"
  | "crashMain"
  | "crashSide"
  | "snapNotch"
  | "snapTongue"
  | "snapHookL"
  | "snapHookR"
  | "gableRoof"
  | "gableEnd";

function slotsFor(style: CartonParams["style"]): { top: Slot[]; bottom: Slot[]; bottomLidOn: 0 | 2 | null } {
  const top: Slot[] = ["none", "dust", "lid", "dust"];
  switch (style) {
    case "ste":
      return { top, bottom: ["none", "dust", "lid", "dust"], bottomLidOn: 2 };
    case "rte":
      return { top, bottom: ["lid", "dust", "none", "dust"], bottomLidOn: 0 };
    case "crash":
    case "srp":
      return { top, bottom: ["crashMain", "crashSide", "crashMain", "crashSide"], bottomLidOn: null };
    case "snap":
    case "srpSnap":
      return { top, bottom: ["snapNotch", "snapHookL", "snapTongue", "snapHookR"], bottomLidOn: null };
    case "gable":
      return { top: ["gableRoof", "gableEnd", "gableRoof", "gableEnd"], bottom: ["snapNotch", "snapHookL", "snapTongue", "snapHookR"], bottomLidOn: null };
    default:
      return { top, bottom: ["none", "dust", "lid", "dust"], bottomLidOn: 2 };
  }
}

/**
 * Physical order of the panels (0 Front, 1 Side A, 2 Back, 3 Side B) on the
 * blank, left to right after the glue flap. The reverse tuck end keeps the
 * industry-standard layout with the glue flap on the front's edge; the other
 * tubes put Side B next to the glue flap so the joint closes at a back corner.
 */
const orderFor = (style: CartonParams["style"]): readonly number[] => (style === "rte" ? [0, 1, 2, 3] : [3, 0, 1, 2]);

export function buildBlank(p: CartonParams, r: Resolved): Blank {
  const { t, panelWidths: pw, bodyHeight: Hp } = r;
  const ORDER = orderFor(p.style);
  // X[i]: left edge of panel i on the blank.
  const X = [0, 0, 0, 0];
  let total = 0;
  for (const i of ORDER) {
    X[i] = total;
    total += pw[i];
  }
  const { top, bottom, bottomLidOn } = slotsFor(p.style);
  if (p.hangTab.enabled && hasTopLid(p.style)) top[0] = "hanger";
  // Lock tab on the panel that receives each tuck.
  const tabTop = p.lockTab && top[0] === "none";
  if (tabTop) top[0] = "lockTab";
  const bottomRecv = bottomLidOn === 0 ? 2 : bottomLidOn === 2 ? 0 : -1;
  const tabBottom = p.lockTab && bottomRecv >= 0 && bottom[bottomRecv] === "none";
  if (tabBottom) bottom[bottomRecv] = "lockTab";
  const tabW = clamp(pw[0] * 0.44, 12, 50);
  const tabStrip = clamp(r.tuckDepth * 0.8, 6, Hp * 0.3);
  const tabTongue = clamp(Math.min(tabW * 0.23, tabStrip - 3), 3, 10);
  const c = r.Wi / 2 + t / 2;
  // Gable top: roofs slope up at 35° from the front and back walls to the
  // ridge, resting on the gable ends; the handle stands up from the ridge.
  const gableRun = Math.max(5, r.Wi / 2 - t / 2);
  const gableRise = gableRun * Math.tan((35 * Math.PI) / 180);
  const gableRoofLen = Math.hypot(gableRun, gableRise);
  // Snap-lock proportions: the front and back flaps reach past the centre
  // line by the base lock reach, which is also the notch depth and the tab
  // length, so the tongue narrows to its tab exactly where the notch begins.
  // Each hook flap stops just short of the centre; its lobe sits on the
  // notch's inner edge, from the notch's near corner to the hook's tip.
  const snapLb = pw[0];
  const snapE = r.bottomExtension;
  const snapNotchW = clamp(snapLb * 0.4, 8, snapLb - 8);
  const snapTabW = snapNotchW - 2 * Math.max(t, 0.75);
  const snapHookD = snapLb / 2 - Math.max(1.5, 2 * t);
  const snapBarb = snapLb / 2 - snapNotchW / 2 - t;
  const snapR = Math.max(2, (snapHookD - snapBarb) / 2);
  const snap = {
    D: c + snapE,
    notchW: snapNotchW,
    notchD: snapE,
    tabW: snapTabW,
    r: snapR,
    lobeDepth: snapHookD - snapR,
    lobeFromNotch: c,
  };

  // Dust flaps lock on the edge facing the panel that receives the tuck.
  // Side A sits between Front (left) and Back (right); Side B between Back
  // (left) and, through the joint, Front (right).
  const lockSideFor = (panel: 1 | 3, lidOn: 0 | 2): "left" | "right" => {
    const receiving = lidOn === 2 ? 0 : 2;
    if (panel === 1) return receiving === 0 ? "left" : "right";
    return receiving === 0 ? "right" : "left";
  };

  const makePiece = (slot: Slot, i: number, which: "top" | "bottom"): Piece => {
    const w = pw[i];
    switch (slot) {
      case "none":
        return nonePiece(w);
      case "hanger":
        return hangerPiece(w, r.hangerHeight, p.hangTab.slot);
      case "lockTab":
        return lockTabPiece({ w, t, width: tabW, height: Math.max(8, r.tuckDepth - 1), strip: tabStrip, tongue: tabTongue });
      case "gableRoof":
        return gableRoofPiece({ w, roof: gableRoofLen, handle: p.gable.handleHeight, holeW: p.gable.holeWidth, holeH: p.gable.holeHeight, glue: i === 2 });
      case "gableEnd":
        return gableEndPiece({ w, apex: gableRise + t });
      case "lid":
        return lidPiece({
          w,
          t,
          lidDepth: r.lidDepth,
          tuckDepth: r.tuckDepth,
          tuckRadius: r.tuckRadius,
          lock: p.lock,
          slitLength: r.slitLength,
          slitOffset: r.slitOffset,
          sideClear: r.sideClear,
          tamper: which === "top" ? p.tamper : "none",
          which,
          tabSlit: (which === "top" ? tabTop : tabBottom) ? { width: tabW + 0.4, hole: tabTongue } : undefined,
          middleFold: which === "top" && isTray(p.style) ? { thumb: clamp(pw[2] * 0.35, 0, 60) } : undefined,
        });
      case "dust": {
        const lidOn = which === "top" ? 2 : (bottomLidOn ?? 2);
        const spec = { w, depth: r.dustDepth, lockSide: lockSideFor(i as 1 | 3, lidOn), lock: p.lock, slitLength: r.slitLength };
        return p.style === "rte" ? classicDustPiece(spec) : dustPiece(spec);
      }
      // Mirrored so the glued corners sit on the creases folded flat on the gluer.
      case "crashMain":
        return mirrorPiece(crashMainPiece({ w, t, c, e: r.bottomExtension }), w);
      case "crashSide":
        return mirrorPiece(crashSidePiece(w, c), w);
      case "snapNotch":
        return snapNotchPiece({ w, t, D: snap.D, notchW: snap.notchW, notchD: snap.notchD });
      case "snapTongue":
        return snapTonguePiece({ w, shoulder: c, D: snap.D, tabW: snap.tabW });
      case "snapHookL":
      case "snapHookR":
        return snapHookPiece({ w, t, r: snap.r, lobeDepth: snap.lobeDepth, lobeFromNotch: snap.lobeFromNotch, diagonal: slot === "snapHookL" ? "left" : "right" });
    }
  };

  const topXf = (x0: number): Xf => ({ a: 1, b: 0, c: 0, d: -1, e: x0, f: 0 });
  const botXf = (x0: number): Xf => ({ a: 1, b: 0, c: 0, d: 1, e: x0, f: Hp });

  const outline: Seg[] = [];
  const strokes: Stroke[] = [];
  const regions: Region[] = [];
  const panels: Panel[] = [];

  const place = (piece: Piece, m: Xf, x0: number, which: "top" | "bottom") => {
    for (const s of piece.strokes) strokes.push({ layer: s.layer, seg: xfSeg(m, s.seg) });
    for (const rg of piece.regions) regions.push({ ...rg, pts: rg.pts.map((q) => xfApply(m, q)) });
    for (const lp of piece.panels) panels.push(localToPanel(lp, x0, which, Hp));
  };

  const topPieces = top.map((s, i) => makePiece(s, i, "top"));
  const botPieces = bottom.map((s, i) => makePiece(s, i, "bottom"));
  const handle = p.gable.handleHeight;
  const metaFor = (slot: Slot, i: number): Record<string, number> | undefined =>
    slot === "lid"
      ? { tuckDepth: r.tuckDepth }
      : slot === "crashMain"
        ? // Mirrored pieces: the glued triangle lies beyond the 45° crease u = v.
          { glueBeyondUeqV: 1 }
      : slot === "gableRoof"
        ? { roof: gableRoofLen, rise: gableRise, handle, holeW: Math.min(p.gable.holeWidth, pw[i] - 2 * clamp(pw[i] * 0.19, Math.min(3, handle * 0.035) + 4, pw[i] / 2 - 8) - 4), holeH: Math.min(p.gable.holeHeight, handle * 0.6) }
        : slot === "gableEnd"
          ? { apex: gableRise + t }
          : slot === "snapHookL" || slot === "snapHookR"
            ? // The rounded lobe, as drawn: centre, radius and the side it bulges to.
              slot === "snapHookR"
              ? { lobeU: pw[i] - snap.lobeFromNotch, lobeV: snap.lobeDepth, lobeR: snap.r, bulge: 1 }
              : { lobeU: snap.lobeFromNotch, lobeV: snap.lobeDepth, lobeR: snap.r, bulge: -1 }
            : undefined;
  const closures: ClosurePiece[] = [
    ...top.map((slot, i) => ({ which: "top" as const, panel: i as 0 | 1 | 2 | 3, slot, w: pw[i], outline: topPieces[i].outline, meta: metaFor(slot, i) })),
    ...bottom.map((slot, i) => ({ which: "bottom" as const, panel: i as 0 | 1 | 2 | 3, slot, w: pw[i], outline: botPieces[i].outline, meta: metaFor(slot, i) })),
  ];

  for (const i of ORDER) {
    outline.push(...topPieces[i].outline.map((s) => xfSeg(topXf(X[i]), s)));
    place(topPieces[i], topXf(X[i]), X[i], "top");
  }
  // Free edge of the back panel.
  outline.push(line(pt(total, 0), pt(total, Hp)));
  for (const i of [...ORDER].reverse()) {
    outline.push(...reversePath(botPieces[i].outline.map((s) => xfSeg(botXf(X[i]), s))));
    place(botPieces[i], botXf(X[i]), X[i], "bottom");
  }

  // Glue flap on the left of Side B, glued inside the back panel's free edge.
  const g = r.glueWidth;
  const taper = Math.min(g * Math.tan((r.glueAngle * Math.PI) / 180), Hp / 3);
  outline.push(line(pt(0, Hp), pt(-g, Hp - taper)), line(pt(-g, Hp - taper), pt(-g, taper)), line(pt(-g, taper), pt(0, 0)));
  strokes.push({ layer: "crease", seg: line(pt(0, 0), pt(0, Hp)) });
  panels.push({ id: "glueFlap", name: "Glue flap", x: -g, y: 0, w: g, h: Hp, printable: false });
  /** Left edge of the glue flap at height y. */
  const glueEdge = (y: number) => -g * (taper > 0 ? Math.min(1, y / taper, (Hp - y) / taper) : 1);
  /** Glue area between two heights, kept 1.5 mm inside the flap. */
  const glueBand = (ya: number, yb: number) => {
    if (yb - ya < 6 || g <= 4) return;
    const pts = [pt(0, ya), pt(0, yb), pt(glueEdge(yb), yb)];
    if (Hp - taper < yb && Hp - taper > ya) pts.push(pt(-g, Hp - taper));
    if (taper < yb && taper > ya) pts.push(pt(-g, taper));
    pts.push(pt(glueEdge(ya), ya));
    const clean = pts.filter((q, i) => {
      const n = pts[(i + 1) % pts.length];
      return Math.hypot(q.x - n.x, q.y - n.y) > 1e-6;
    });
    regions.push({ layer: "glue", pts: insetConvex(clean, 1.5), label: "Glue" });
  };

  const perf = (seg: Seg) => strokes.push({ layer: "perf", seg });
  if (p.zipStrip.enabled) {
    // Zip strip: two perforations right round the body and across the glue
    // flap, which is left unglued where the strip passes. It is opened from
    // a thumb tab cut into the strip near the front's left corner.
    const y1 = r.zipFromTop;
    const y2 = y1 + r.zipWidth;
    for (const y of [y1, y2]) perf(line(pt(glueEdge(y), y), pt(total, y)));
    glueBand(0, y1 - 1.5);
    glueBand(y2 + 1.5, Hp);
    const m = Math.min(0.6, r.zipWidth * 0.1);
    const rr = r.zipWidth / 2 - m;
    const cx = X[0] + clamp(pw[0] * 0.15, rr + 4, 15);
    strokes.push({ layer: "cut", seg: arc3(pt(cx, y1 + m), pt(cx - rr, (y1 + y2) / 2), pt(cx, y2 - m)) });
  } else glueBand(0, Hp);

  // Tear-away front of a shelf-ready tray: depth on the front, finger-hole width and its dip.
  const tear = (() => {
    const d = clamp(p.srp.tearDepth > 0 ? p.srp.tearDepth : Math.round(Hp / 2), 10, Math.max(10, Hp - 10));
    const fw = Math.min(p.srp.fingerWidth, pw[0] * 0.6);
    const sg = Math.min(fw * 0.375, Hp - d - 8);
    return { d, fw, sg, finger: fw >= 10 && sg >= 4 };
  })();
  if (isTray(p.style)) {
    // Tear-away front: across the front, then down both sides from the back
    // corners. The joint sits at a back corner, so the tear never crosses it.
    const { d, fw, sg } = tear;
    const x0 = X[0];
    const x1 = X[0] + pw[0];
    const cx = (x0 + x1) / 2;
    if (tear.finger) {
      perf(line(pt(x0, d), pt(cx - fw / 2, d)));
      perf(arc3(pt(cx - fw / 2, d), pt(cx, d + sg), pt(cx + fw / 2, d)));
      perf(line(pt(cx + fw / 2, d), pt(x1, d)));
    } else perf(line(pt(x0, d), pt(x1, d)));
    perf(line(pt(X[1], d), pt(X[1] + pw[1], 0)));
    perf(line(pt(X[3], 0), pt(X[3] + pw[3], d)));
  }

  // Folds between neighbouring panels, in their order on the blank.
  for (const i of ORDER.slice(1)) strokes.push({ layer: "crease", seg: line(pt(X[i], 0), pt(X[i], Hp)) });

  const names = ["Front", "Side A", "Back", "Side B"];
  const ids = ["front", "sideA", "back", "sideB"] as const;
  for (let i = 3; i >= 0; i--) panels.unshift({ id: ids[i], name: names[i], x: X[i], y: 0, w: pw[i], h: Hp, printable: true });

  const dims = buildDims(p, r, X, panels);
  const texts = buildLabels(p, panels);
  strokes.push(...grainArrow(p, panels));
  const model3d = tubeModel();
  return { outline, strokes, regions, panels, dims, texts, closures, model3d };

  /** The tube folded in 3D: glue flap, body wrapped round, then the bottom and the top closed in their working order. */
  function tubeModel(): Model3D {
    const F = new FaceList();
    const body: number[] = [];
    /** Face that carries panel i's top closure: the tear-away part on a tray's front and sides. */
    const topOf: number[] = [];
    const tray = isTray(p.style);
    const panelRect = (i: number) => [pt(X[i], 0), pt(X[i] + pw[i], 0), pt(X[i] + pw[i], Hp), pt(X[i], Hp)];
    // On a tray, the part above the tear line is a separate face that comes away when the tray goes on the shelf.
    const tearLine = (i: number): Pt[] => {
      const { d, fw, sg, finger } = tear;
      const x0 = X[i];
      const x1 = X[i] + pw[i];
      if (i === 0) {
        const cx = (x0 + x1) / 2;
        const dip = finger ? sampleSeg(arc3(pt(cx - fw / 2, d), pt(cx, d + sg), pt(cx + fw / 2, d)), 1) : [];
        return [pt(x0, d), ...dip, pt(x1, d)];
      }
      return i === 1 ? [pt(x0, d), pt(x1, 0)] : i === 3 ? [pt(x0, 0), pt(x1, d)] : [];
    };
    const addPanel = (i: number, parent: number, hinge: [Pt, Pt] | null) => {
      const line = tray ? tearLine(i) : [];
      if (!line.length) return (body[i] = topOf[i] = F.add(panelRect(i), parent, hinge, hinge ? 90 : 0, 0.12, 0.4));
      const x0 = X[i];
      const x1 = X[i] + pw[i];
      const lower = [...line, pt(x1, Hp), pt(x0, Hp)];
      body[i] = F.add(lower, parent, hinge, hinge ? 90 : 0, 0.12, 0.4);
      const upper = [pt(x0, 0), pt(x1, 0), ...[...line].reverse()].filter((q, k, a) => k === 0 || Math.hypot(q.x - a[k - 1].x, q.y - a[k - 1].y) > 1e-6);
      topOf[i] = F.add(upper, body[i], [line[0], line[line.length - 1]], 0, 0, 0, 0);
      if (topOf[i] >= 0) F.faces[topOf[i]].remove = true;
      else topOf[i] = body[i];
      return body[i];
    };
    const rootPos = ORDER.indexOf(0);
    addPanel(0, -1, null);
    for (const dir of [1, -1]) {
      for (let j = rootPos + dir; j >= 0 && j < 4; j += dir) {
        const i = ORDER[j];
        const parent = ORDER[j - dir];
        const x = dir > 0 ? X[i] : X[parent];
        addPanel(i, body[parent], [pt(x, 0), pt(x, Hp)]);
      }
    }
    F.add([pt(0, 0), pt(-g, taper), pt(-g, Hp - taper), pt(0, Hp)], body[ORDER[0]], [pt(0, 0), pt(0, Hp)], 90, 0, 0.14);

    for (const which of ["bottom", "top"] as const) {
      const slots = which === "top" ? top : bottom;
      const pieces = which === "top" ? topPieces : botPieces;
      const [a, b] = which === "bottom" ? [0.42, 0.7] : [0.72, 1];
      const stage = (k: number, n: number): [number, number] => [a + ((b - a) * k) / n, Math.min(b, a + ((b - a) * (k + 1.3)) / n)];
      const map = (i: number) => (q: { x: number; y: number }) => (which === "top" ? pt(X[i] + q.x, -q.y) : pt(X[i] + q.x, Hp + q.y));
      const tuck = slots.includes("lid");
      const snapEnd = slots.includes("snapNotch");
      const n = tuck || snapEnd ? 3 : 2;
      for (let i = 0; i < 4; i++) {
        const slot = slots[i];
        const m = map(i);
        const local = piecePoly(pieces[i].outline);
        const hinge: [Pt, Pt] = [m(pt(0, 0)), m(pt(pw[i], 0))];
        const bodyFace = which === "top" ? (topOf[i] ?? body[i]) : body[i];
        const add = (poly: Pt[], parent: number, h: [Pt, Pt], angle: number, win: [number, number], layer: number) => F.add(poly.map(m), parent, [m(h[0]), m(h[1])], angle, win[0], win[1], layer);
        if (slot === "none") continue;
        if (slot === "hanger" || slot === "lockTab" || slot === "gableEnd") {
          F.add(local.map(m), bodyFace, hinge, 0);
          continue;
        }
        if (slot === "lid") {
          const vT = t + r.lidDepth;
          const parts = split(local, rect(-1, -1, pw[i] + 1, vT));
          let lid = -1;
          // Shelf-ready tray lid: a crease across the middle, broken by a half-round thumb cut whose tab stays with the front half.
          const thumbR = Math.min(clamp(pw[i] * 0.35, 0, 60) / 2, r.lidDepth / 2 - 3);
          if (which === "top" && isTray(p.style) && thumbR > 3 && parts.inside[0]) {
            const vm = t + r.lidDepth / 2;
            const disc = Array.from({ length: 48 }, (_, k) => pt(pw[i] / 2 + thumbR * Math.cos((k * Math.PI) / 24), vm + thumbR * Math.sin((k * Math.PI) / 24)));
            const back = split(rect(-1, -1, pw[i] + 1, vm), disc).outside;
            const halves = split(parts.inside[0], back[0] ?? []);
            const byArea = (ps: Pt[][]) => ps.sort((a, b) => area([b]) - area([a]))[0];
            const inner = add(byArea(halves.inside), bodyFace, [pt(0, 0), pt(pw[i], 0)], 89.4, stage(1, n), 2);
            lid = add(byArea(halves.outside), inner, [pt(0, vm), pt(pw[i], vm)], 0, stage(1, n), 2);
            // On the shelf, once the front has come away: the lid stands up above the back wall, its front half folds down
            // over the middle crease on the tray side so the thumb tab stands at the top, and the tuck goes down inside the back wall.
            if (inner >= 0) Object.assign(F.faces[inner], { angle2: -89.4, p0: 0.5, p1: 0.75 });
            if (lid >= 0) Object.assign(F.faces[lid], { angle2: -178, p0: 0.55, p1: 0.85 });
          } else if (parts.inside[0]) lid = add(parts.inside[0], bodyFace, [pt(0, 0), pt(pw[i], 0)], 89.4, stage(1, n), 2);
          for (const q of parts.outside) {
            const tk = add(q, lid, [pt(0, vT), pt(pw[i], vT)], 90, stage(1.6, n), 1);
            if (tk >= 0 && lid >= 0 && F.faces[lid].angle2) Object.assign(F.faces[tk], { angle2: -88, p0: 0.6, p1: 0.95 });
          }
          continue;
        }
        if (slot === "dust") {
          add(local, bodyFace, [pt(0, 0), pt(pw[i], 0)], 90, stage(0, n), 0);
          continue;
        }
        if (slot === "gableRoof") {
          // Slope 35°: the roof turns in by 55° from the wall, the handle back up by the same.
          const roof = gableRoofLen;
          const turn = 90 - (Math.atan2(gableRise, gableRun) * 180) / Math.PI;
          const parts = split(local, rect(-1, -1, pw[i] + 1, roof));
          const rf = parts.inside[0] ? add(parts.inside[0], bodyFace, [pt(0, 0), pt(pw[i], 0)], turn, stage(0, n), i === 2 ? 1 : 0) : -1;
          for (const q of parts.outside) add(q, rf, [pt(0, roof), pt(pw[i], roof)], -turn, stage(0.8, n), 0);
          continue;
        }
        if (slot === "crashMain") {
          // The glued triangle beyond the 45° crease is folded onto the side flap on the gluer.
          const parts = split(local, [pt(-1, -1), pt(1e4, -1), pt(1e4, 1e4)]);
          const main = parts.inside[0] ? add(parts.inside[0], bodyFace, [pt(0, 0), pt(pw[i], 0)], 89.5, stage(0, n), 1) : -1;
          for (const q of parts.outside) add(q, main, [pt(0, 0), pt(1, 1)], -180, [0, 0.12], 1);
          continue;
        }
        if (slot === "crashSide") {
          add(local, bodyFace, [pt(0, 0), pt(pw[i], 0)], 90, stage(0, n), 0);
          continue;
        }
        if (slot === "snapNotch") {
          add(local, bodyFace, [pt(0, 0), pt(pw[i], 0)], 90, stage(0, n), 1);
          continue;
        }
        if (slot === "snapTongue") {
          // The tongue lies over everything; its tab dips under the notch flap.
          const parts = split(local, rect(-1, -1, pw[i] + 1, c));
          const tongue = parts.inside[0] ? add(parts.inside[0], bodyFace, [pt(0, 0), pt(pw[i], 0)], 88.8, stage(2, n), 3) : -1;
          for (const q of parts.outside) add(q, tongue, [pt(0, c), pt(pw[i], c)], 3, stage(2.5, n), 0);
          continue;
        }
        if (slot === "snapHookL" || slot === "snapHookR") {
          // The hook lies over the notch flap; its round lobe dips under it.
          const mm = metaFor(slot, i)!;
          const disc = Array.from({ length: 48 }, (_, k) => pt(mm.lobeU + mm.lobeR * Math.cos((k * Math.PI) / 24), mm.lobeV + mm.lobeR * Math.sin((k * Math.PI) / 24)));
          const halfPlane = mm.bulge > 0 ? rect(mm.lobeU, -1e3, 1e4, 1e4) : rect(-1e4, -1e3, mm.lobeU, 1e4);
          const lobe = split(split(local, disc).inside[0] ?? [], halfPlane).inside;
          const rest = lobe.length ? split(local, lobe[0]).outside : [local];
          const hook = add(rest.sort((p1, p2) => area([p2]) - area([p1]))[0], bodyFace, [pt(0, 0), pt(pw[i], 0)], 89.4, stage(1, n), 2);
          for (const q of lobe) add(q, hook, [pt(mm.lobeU, 0), pt(mm.lobeU, 1)], 4, stage(1.6, n), 0);
        }
      }
    }
    const tall = Math.max(Hp, pw[0], pw[1]);
    return tray ? { faces: F.faces, present: "On shelf", away: { x: 0, y: -0.35 * tall, z: 1.4 * tall } } : { faces: F.faces };
  }
}

function localToPanel(lp: LocalPanel, x0: number, which: "top" | "bottom", Hp: number): Panel {
  return {
    id: lp.id,
    name: lp.name,
    x: x0 + lp.u,
    y: which === "top" ? -(lp.v + lp.h) : Hp + lp.v,
    w: lp.w,
    h: lp.h,
    printable: lp.printable,
  };
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

function buildDims(p: CartonParams, r: Resolved, X: number[], panels: Panel[]): Dimension[] {
  if (!p.showDimensions) return [];
  const Hp = r.bodyHeight;
  const pw = r.panelWidths;
  const y = Hp - Math.min(14, Hp * 0.12);
  const dims: Dimension[] = [];
  for (let i = 0; i < 4; i++) dims.push({ a: pt(X[i], y), b: pt(X[i] + pw[i], y), offset: 0, text: fmt(pw[i]) });
  const first = X.indexOf(0);
  const hx = Math.min(10, pw[first] * 0.15);
  dims.push({ a: pt(hx, 0), b: pt(hx, Hp), offset: 0, text: fmt(Hp) });
  dims.push({ a: pt(-r.glueWidth, Hp / 2), b: pt(0, Hp / 2), offset: 0, text: fmt(r.glueWidth) });
  const lid = panels.find((q) => q.id === "topLid");
  if (lid) {
    const lx = lid.x + Math.min(12, lid.w * 0.15);
    dims.push({ a: pt(lx, lid.y + lid.h), b: pt(lx, lid.y), offset: 0, text: fmt(lid.h) });
    const tuck = panels.find((q) => q.id === "topTuck");
    if (tuck) dims.push({ a: pt(lid.x + lid.w - Math.min(14, lid.w * 0.2), tuck.y + tuck.h), b: pt(lid.x + lid.w - Math.min(14, lid.w * 0.2), tuck.y), offset: 0, text: fmt(tuck.h) });
  }
  const dx = X[1] + pw[1] / 2;
  dims.push({ a: pt(dx, 0), b: pt(dx, -r.dustDepth), offset: 0, text: fmt(r.dustDepth) });
  return dims;
}

export function buildLabels(p: CartonParams, panels: Panel[]): TextItem[] {
  const out: TextItem[] = [];
  for (const q of panels) {
    if (q.w < 8 || q.h < 8) continue;
    const size = clamp(Math.min(q.w, q.h) * 0.09, 2.2, 5);
    const vertical = q.id === "glueFlap";
    out.push({
      // The hanger's centre holds the slot, so its name sits near the body.
      at: pt(q.x + q.w / 2, q.id === "hanger" ? q.y + q.h - 3 : q.id === "handle" ? q.y + Math.min(5, q.h * 0.15) + size / 2 : q.y + q.h / 2),
      text: q.name.toUpperCase(),
      size,
      layer: "label",
      anchor: "middle",
      rotate: vertical ? -90 : 0,
    });
  }
  return out;
}

export function grainArrow(p: CartonParams, panels: Panel[]): Stroke[] {
  const back = panels.find((q) => q.id === "back");
  if (!back) return [];
  const cx = back.x + back.w / 2;
  const cy = back.y + back.h * 0.32;
  const half = Math.min(back.w, back.h) * 0.18;
  const h = Math.min(3, half * 0.3);
  const segs: Seg[] =
    p.grain === "horizontal"
      ? [
          line(pt(cx - half, cy), pt(cx + half, cy)),
          line(pt(cx + half, cy), pt(cx + half - h, cy - h * 0.6)),
          line(pt(cx + half, cy), pt(cx + half - h, cy + h * 0.6)),
          line(pt(cx - half, cy), pt(cx - half + h, cy - h * 0.6)),
          line(pt(cx - half, cy), pt(cx - half + h, cy + h * 0.6)),
        ]
      : [
          line(pt(cx, cy - half), pt(cx, cy + half)),
          line(pt(cx, cy - half), pt(cx - h * 0.6, cy - half + h)),
          line(pt(cx, cy - half), pt(cx + h * 0.6, cy - half + h)),
          line(pt(cx, cy + half), pt(cx - h * 0.6, cy + half - h)),
          line(pt(cx, cy + half), pt(cx + h * 0.6, cy + half - h)),
        ];
  return segs.map((seg) => ({ seg, layer: "label" as const }));
}
