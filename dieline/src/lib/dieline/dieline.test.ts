import { describe, expect, it } from "vitest";
import { textToBraille, wrapCells } from "./braille";
import { buildBlank } from "./carton";
import { snapHookPiece } from "./closures";
import { foldTube } from "./fold";
import { apply, pose, removedFaces } from "./fold3d";
import { dist, pointInPolygon, samplePath, findSelfIntersection, translateXf, xfSeg } from "./geom";
import { DEFAULT_PARAMS, generate } from "./index";
import { resolve } from "./resolve";
import { DEFAULT_CONTENTS, sizeFromContents } from "./sizing";
import type { CartonParams, StyleId } from "./types";

// Fixtures keep the original test baseline (inside sizes, automatic flaps) so they do not move with the editor defaults.
const make = (over: Partial<CartonParams>): CartonParams => ({ ...DEFAULT_PARAMS, dimMode: "inside", L: 60, W: 25, H: 110, dustDepth: null, glueWidth: null, ...over });

describe("carton geometry", () => {
  it("starts from the studio's default carton", () => {
    const d = generate(DEFAULT_PARAMS);
    const p = d.params;
    expect([p.style, p.dimMode, p.L, p.W, p.H, p.boardId, p.caliper, p.gsm, p.grain, p.lock, p.lockTab]).toEqual(["rte", "outside", 40, 40, 120, "gc1-300", 0.47, 300, "horizontal", "slit", false]);
    expect([p.tuckDepth, p.tuckRadius, p.slitLength, p.dustDepth, p.glueWidth, p.glueAngle]).toEqual([null, null, null, null, 10, null]);
    expect([d.resolved.tuckDepth, d.resolved.glueAngle]).toEqual([13, 35]);
    expect(d.issues.filter((x) => x.severity !== "info")).toEqual([]);
  });

  it("applies thickness allowances to crease-to-crease widths", () => {
    const d = generate(make({ style: "ste", L: 120.6, W: 60.6, H: 161.1, caliper: 0.46 }));
    expect(d.resolved.panelWidths.map((v) => +v.toFixed(2))).toEqual([121.06, 61.06, 121.06, 60.6]);
    // Reverse tuck end: the glue flap sits on the front, which is the short panel.
    const rte = generate(make({ style: "rte", L: 120.6, W: 60.6, H: 161.1, caliper: 0.46 }));
    expect(rte.resolved.panelWidths.map((v) => +v.toFixed(2))).toEqual([120.6, 61.06, 121.06, 61.06]);
    expect(+d.resolved.bodyHeight.toFixed(2)).toBe(161.56);
  });

  it("converts outside dimensions to inside", () => {
    const d = generate(make({ dimMode: "outside", L: 61, W: 26, H: 111, caliper: 0.5 }));
    expect(d.resolved.Li).toBeCloseTo(60);
    expect(d.resolved.Wi).toBeCloseTo(25);
    expect(d.resolved.Hi).toBeCloseTo(110);
  });

  const styles: StyleId[] = ["rte", "ste", "crash", "snap"];
  const sizes = [
    [40, 20, 80],
    [60, 25, 110],
    [90, 30, 60],
    [120.6, 60.6, 161.1],
    [150, 50, 200],
    [200, 120, 60],
  ];

  for (const style of styles) {
    for (const [L, W, H] of sizes) {
      it(`${style} ${L}×${W}×${H}: closed outline without overlaps`, () => {
        for (const lock of ["slit", "friction"] as const) {
          for (const tamper of ["none", "glueTuck", "tearStrip"] as const) {
            const d = generate(make({ style, L, W, H, lock, tamper }));
            const o = d.outline;
            expect(dist(o[0].a, o[o.length - 1].b)).toBeLessThan(1e-6);
            for (let i = 1; i < o.length; i++) expect(dist(o[i - 1].b, o[i].a)).toBeLessThan(1e-6);
            expect(findSelfIntersection(samplePath(o, 1))).toBeNull();
            expect(d.issues.filter((x) => x.severity === "error")).toEqual([]);
            expect(d.stats.cutLength).toBeGreaterThan(0);
            expect(d.stats.utilization).toBeGreaterThan(40);
            expect(d.stats.utilization).toBeLessThan(100);
          }
        }
      });
    }
  }

  it("keeps outlines clean with every carton option switched on", () => {
    for (const style of ["rte", "ste", "crash", "snap"] as StyleId[]) {
      for (const [L, W, H] of [[60, 25, 110], [120.6, 60.6, 161.1], [90, 30, 80]]) {
        for (const slot of ["euro", "round"] as const) {
          const d = generate(
            make({
              style, L, W, H,
              hangTab: { enabled: true, height: 25, slot },
              window: { ...DEFAULT_PARAMS.window, enabled: true, width: 20, height: 25, panel: "back" },
              zipStrip: { enabled: true, fromTop: 15, width: 6 },
              dispenser: { ...DEFAULT_PARAMS.dispenser, enabled: true, width: 20, height: 18, panel: "front" },
            }),
          );
          const o = d.outline;
          for (let i = 1; i < o.length; i++) expect(dist(o[i - 1].b, o[i].a)).toBeLessThan(1e-6);
          expect(dist(o[0].a, o[o.length - 1].b)).toBeLessThan(1e-6);
          expect(findSelfIntersection(samplePath(o, 1))).toBeNull();
          expect(d.issues.filter((x) => x.severity === "error")).toEqual([]);
          expect(d.strokes.some((s) => s.layer === "perf")).toBe(true);
          expect(d.bbox.minY).toBeLessThan(-49);
        }
      }
    }
  });

  it("keeps outlines clean for every style, with and without the lock tab", () => {
    const sizes: Record<string, number[][]> = {
      rte: [[60, 25, 110], [80, 60, 150]],
      ste: [[60, 25, 110], [80, 30, 120]],
      crash: [[120.6, 60.6, 161.1], [90, 30, 80]],
      snap: [[120.6, 60.6, 161.1], [90, 30, 80], [40, 40, 120], [482, 426, 300], [162, 182, 120]],
      srp: [[150, 100, 80], [200, 120, 100], [90, 60, 60]],
      srpSnap: [[150, 100, 80], [200, 120, 100], [90, 60, 60], [162, 182, 120]],
      gable: [[120, 80, 100], [310, 250, 190], [90, 60, 70]],
      mailer: [[220, 160, 60], [330, 205, 63], [150, 120, 40]],
      display: [[200, 120, 40], [300, 200, 60], [120, 80, 30]],
      doorbox: [[60, 60, 150], [45, 30, 90], [90, 40, 200], [120, 120, 60]],
    };
    for (const [style, list] of Object.entries(sizes)) {
      for (const [L, W, H] of list) {
        for (const lockTab of [false, true]) {
          const caliper = style === "mailer" ? 1.5 : 0.46;
          const d = generate(make({ style: style as StyleId, L, W, H, lockTab, caliper, gable: { handleHeight: 40, holeWidth: 70, holeHeight: 24 } }));
          const o = d.outline;
          const at = `${style} ${L}×${W}×${H}${lockTab ? " lock tab" : ""}`;
          for (let i = 1; i < o.length; i++) expect(dist(o[i - 1].b, o[i].a), at).toBeLessThan(1e-6);
          expect(dist(o[0].a, o[o.length - 1].b), at).toBeLessThan(1e-6);
          expect(findSelfIntersection(samplePath(o, 1)), at).toBeNull();
          expect(d.issues.filter((x) => x.severity === "error"), at).toEqual([]);
          expect(d.stats.blankArea, at).toBeGreaterThan(0);
        }
      }
    }
  });

  it("puts the glue flap on the far left of every tube", () => {
    for (const style of ["rte", "ste", "crash", "snap", "srp", "srpSnap", "gable"] as StyleId[]) {
      const d = generate(make({ style, L: 120, W: 80, H: 100 }));
      const glue = d.panels.find((q) => q.id === "glueFlap")!;
      expect(glue.x, style).toBeLessThan(0);
      expect(Math.min(...d.panels.filter((q) => q.id !== "glueFlap").map((q) => q.x)), style).toBeGreaterThanOrEqual(-1e-6);
      // The reverse tuck end keeps the standard layout with the front next to the glue flap.
      const ids = style === "rte" ? ["front", "sideA", "back", "sideB"] : ["sideB", "front", "sideA", "back"];
      const order = ids.map((id) => d.panels.find((q) => q.id === id)!.x);
      expect([...order].sort((a, b) => a - b), style).toEqual(order);
    }
  });

  it("creases every fold between body panels, and the glue flap fold once", () => {
    for (const style of ["rte", "ste", "crash", "snap", "srp", "srpSnap", "gable"] as StyleId[]) {
      const d = generate(make({ style, L: 120, W: 80, H: 100 }));
      const Hp = d.resolved.bodyHeight;
      const verticals = d.strokes
        .filter((s) => s.layer === "crease" && s.seg.kind === "line" && Math.abs(s.seg.a.x - s.seg.b.x) < 1e-6 && Math.abs(Math.abs(s.seg.a.y - s.seg.b.y) - Hp) < 1e-6)
        .map((s) => +s.seg.a.x.toFixed(3));
      const body = d.panels.filter((q) => ["front", "sideA", "back", "sideB"].includes(q.id));
      const folds = body.map((q) => +q.x.toFixed(3)).filter((x) => x > 1e-6);
      expect([...verticals].sort((a, b) => a - b), style).toEqual([0, ...folds].sort((a, b) => a - b));
    }
  });

  it("keeps tear lines and the zip strip off the glue", () => {
    for (const over of [{ style: "srp" as StyleId, L: 150, W: 100, H: 80 }, { style: "rte" as StyleId, zipStrip: { enabled: true, fromTop: 30, width: 6 } }]) {
      const d = generate(make(over));
      expect(d.issues.filter((x) => /glue area/.test(x.message))).toEqual([]);
    }
  });

  it("flags a cut that crosses a glue area", () => {
    const d = generate(make({ L: 80, W: 30, H: 100, tamper: "glueTuck", tuckDepth: 20, window: { ...DEFAULT_PARAMS.window, enabled: true, panel: "topTuck", width: 6, height: 4, radius: 1 } }));
    expect(d.issues.some((x) => x.severity === "error" && /glue area/.test(x.message))).toBe(true);
  });

  it("draws the snap-lock bottom to the studio rules: tongue, two hooks with lobes, wide notch", () => {
    const d = generate(make({ style: "snap", L: 120, W: 80, H: 100 }));
    const Hp = d.resolved.bodyHeight;
    const below = d.outline.filter((s) => Math.min(s.a.y, s.b.y) >= Hp - 1e-6);
    // Two rounded hook lobes plus the tongue tab's two corner fillets.
    expect(below.filter((s) => s.kind === "arc").length).toBeGreaterThanOrEqual(4);
    // The notch is about 40 % of the length wide, not tied to Length minus Width.
    const front = d.panels.find((q) => q.id === "front")!;
    const xs = below.filter((s) => s.kind === "line" && s.a.x > front.x && s.a.x < front.x + front.w && Math.abs(s.a.y - s.b.y) < 1e-6 && s.a.y < Hp + 60).map((s) => Math.abs(s.b.x - s.a.x));
    expect(Math.max(...xs)).toBeGreaterThan(front.w * 0.35);
  });

  it("cuts the lock tab and its lid slit to match", () => {
    const d = generate(make({ style: "rte", L: 80, W: 60, H: 150, lockTab: true }));
    const plain = generate(make({ style: "rte", L: 80, W: 60, H: 150 }));
    expect(d.stats.cutLength).toBeGreaterThan(plain.stats.cutLength);
    expect(d.bbox.minY).toBeLessThan(plain.bbox.minY + 1);
  });

  it("adds the tear-away perforation to both shelf-ready trays", () => {
    for (const style of ["srp", "srpSnap"] as StyleId[]) {
      const d = generate(make({ style, L: 150, W: 100, H: 80 }));
      expect(d.stats.perfLength, style).toBeGreaterThan(150 + 2 * 100);
    }
  });

  it("gives the snap-lock tray a snap-lock bottom and no glued base corners", () => {
    const snap = generate(make({ style: "srpSnap", L: 150, W: 100, H: 80 }));
    const crash = generate(make({ style: "srp", L: 150, W: 100, H: 80 }));
    const baseGlue = (d: typeof snap) => d.regions.filter((r) => r.layer === "glue" && r.pts.every((q) => q.y > d.resolved.bodyHeight)).length;
    expect(baseGlue(crash)).toBeGreaterThan(0);
    expect(baseGlue(snap)).toBe(0);
    // Snap-lock bases close with the width larger than the length too; crash-lock bases do not.
    expect(generate(make({ style: "srpSnap", L: 162, W: 182, H: 120 })).issues.filter((x) => x.severity === "error")).toEqual([]);
    expect(generate(make({ style: "srp", L: 162, W: 182, H: 120 })).issues.some((x) => x.severity === "error")).toBe(true);
  });

  it("opens a project saved with a removed style as the default carton", () => {
    const d = generate(make({ style: "pillow" as StyleId }));
    expect(d.params.style).toBe(DEFAULT_PARAMS.style);
  });

  it("flags a window that does not fit", () => {
    const d = generate(make({ window: { ...DEFAULT_PARAMS.window, enabled: true, width: 200, height: 20 } }));
    expect(d.issues.some((x) => x.field === "window" && x.severity === "error")).toBe(true);
  });

  it("rejects lock bottoms that are wider than long", () => {
    const d = generate(make({ style: "crash", L: 40, W: 60, H: 100 }));
    expect(d.issues.some((x) => x.severity === "error")).toBe(true);
  });

  it("offers a fix for an oversized tuck", () => {
    const d = generate(make({ tuckDepth: 200 }));
    const issue = d.issues.find((x) => x.field === "tuckDepth");
    expect(issue?.fix?.field).toBe("tuckDepth");
  });

  it("clears each warning once its suggested fix is applied", () => {
    const cases: Partial<CartonParams>[] = [
      { tuckDepth: 200 },
      { tuckRadius: 99 },
      { lock: "slit", slitLength: 60 },
      { glueWidth: 80, L: 40 },
      { style: "crash", L: 120, W: 60, bottomExtension: 80 },
      { style: "snap", L: 120, W: 60, bottomExtension: 80 },
    ];
    for (const L of [40, 60, 75.3, 120.6]) {
      for (const W of [20, 25, 33.7]) {
        for (const c of cases) {
          const p = make({ L, W, H: 110, ...c });
          const d = generate(p);
          for (const issue of d.issues.filter((i) => i.fix)) {
            const fixed = generate({ ...p, [issue.fix!.field]: issue.fix!.value });
            expect(fixed.issues.some((i) => i.field === issue.field && i.severity !== "info" && i.fix?.field === issue.fix!.field)).toBe(false);
          }
        }
      }
    }
  });

  it("makes dust flaps meet at the centre of the length, whatever was saved", () => {
    for (const style of ["rte", "ste"] as StyleId[]) {
      const d = generate(make({ style, L: 60, W: 25, H: 110, dustDepth: 29.5 }));
      expect(d.resolved.dustDepth, style).toBeCloseTo(d.resolved.Li / 2, 1);
      expect(d.fold.checks.find((c) => c.id === "top.dust")?.ok, style).toBe(true);
    }
  });
});

describe("closing check", () => {
  const SIZES: [StyleId, number[][]][] = [
    ["rte", [[40, 40, 120], [60, 25, 110], [80, 60, 150], [30, 80, 60]]],
    ["ste", [[40, 40, 120], [80, 30, 120]]],
    ["crash", [[60, 40, 120], [90, 30, 80], [200, 150, 100]]],
    ["snap", [[40, 40, 120], [90, 30, 80], [162, 182, 120]]],
    ["srp", [[150, 100, 80], [90, 60, 60]]],
    ["srpSnap", [[150, 100, 80], [163, 183, 120]]],
    ["gable", [[120, 80, 100], [310, 250, 190]]],
    ["mailer", [[220, 160, 60], [150, 100, 40]]],
    ["display", [[200, 120, 40], [300, 200, 60]]],
    ["doorbox", [[60, 60, 150], [45, 30, 90], [90, 40, 200]]],
  ];

  it("closes and locks every style across sizes and boards", () => {
    for (const caliper of [0.355, 0.47, 0.8]) {
      for (const [style, list] of SIZES) {
        for (const [L, W, H] of list) {
          for (const base of [{ ...DEFAULT_PARAMS }, make({})]) {
            const d = generate({ ...base, caliper, style, L, W, H });
            const tag = `${style} ${L}×${W}×${H} @${caliper} ${base.dimMode}`;
            expect(d.fold.checks.length, tag).toBeGreaterThan(0);
            expect(d.fold.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`), tag).toEqual([]);
          }
        }
      }
    }
  });

  it("folds both ends of a tube and draws each one", () => {
    const d = generate(make({ style: "snap", L: 120, W: 80, H: 100 }));
    expect(d.fold.views.map((v) => v.id)).toEqual(["top", "bottom"]);
    expect(d.fold.checks.map((c) => c.id)).toEqual(expect.arrayContaining(["top.cover", "top.dust", "top.tuck", "bottom.align", "bottom.fit", "bottom.rest", "bottom.apart", "bottom.tuck"]));
  });

  it("reproduces the studio snap-lock: notch and tab line up, tab fits, hooks hold", () => {
    const d = generate({ ...DEFAULT_PARAMS, style: "srpSnap", L: 163, W: 183, H: 120 });
    const detail = (id: string) => d.fold.checks.find((c) => c.id === id)!.detail;
    expect(Number(/(\d+\.\d) mm/.exec(detail("bottom.align"))![1])).toBeLessThanOrEqual(0.6);
    expect(detail("bottom.fit")).toMatch(/Notch 66\.7 mm, tab 63\.5 mm/);
  });

  it("fails a snap-lock whose tongue misses the notch", () => {
    const p = make({ style: "snap", L: 120, W: 80, H: 100 });
    const { r } = resolve(p);
    const blank = buildBlank(p, r);
    const shifted = blank.closures!.map((c) => (c.slot === "snapTongue" ? { ...c, outline: c.outline.map((s) => xfSeg(translateXf(0, 8), s)) } : c));
    const o = { Lb: (r.panelWidths[0] + r.panelWidths[2]) / 2, Wb: (r.panelWidths[1] + r.panelWidths[3]) / 2, t: r.t, bodyHeight: r.bodyHeight };
    expect(foldTube(blank.closures!, o).checks.find((c) => c.id === "bottom.align")!.ok).toBe(true);
    expect(foldTube(shifted, o).checks.find((c) => c.id === "bottom.align")!.ok).toBe(false);
  });

  it("closes the snap-lock in order: hooks over the notch flap, lobes tucked under it", () => {
    const p = make({ style: "snap", L: 120, W: 80, H: 100 });
    const { r } = resolve(p);
    const blank = buildBlank(p, r);
    const o = { Lb: (r.panelWidths[0] + r.panelWidths[2]) / 2, Wb: (r.panelWidths[1] + r.panelWidths[3]) / 2, t: r.t, bodyHeight: r.bodyHeight };
    const ok = foldTube(blank.closures!, o).checks;
    expect(ok.filter((c) => c.id === "bottom.rest" || c.id === "bottom.apart" || c.id === "bottom.tuck").map((c) => c.ok)).toEqual([true, true, true]);
    // Move the lobes 30 mm toward the back: they no longer reach under the notch flap.
    const moved = blank.closures!.map((c) => {
      if (!c.slot.startsWith("snapHook")) return c;
      const m = c.meta!;
      const right = m.bulge > 0;
      const lobeFromNotch = (right ? c.w - m.lobeU : m.lobeU) + 30;
      const piece = snapHookPiece({ w: c.w, t: r.t, r: m.lobeR, lobeDepth: m.lobeV, lobeFromNotch, diagonal: right ? "right" : "left" });
      return { ...c, outline: piece.outline, meta: { ...m, lobeU: right ? c.w - lobeFromNotch : lobeFromNotch } };
    });
    expect(foldTube(moved, o).checks.find((c) => c.id === "bottom.tuck")!.ok).toBe(false);
  });

  it("blocks a gable whose handle is too short to hold a hand hole", () => {
    const d = generate(make({ style: "gable", L: 120, W: 80, H: 100, gable: { ...DEFAULT_PARAMS.gable, handleHeight: 15 } }));
    expect(d.fold.checks.find((c) => c.id === "top.grip")!.ok).toBe(false);
    expect(d.issues.some((i) => i.severity === "error" && i.field === "fold")).toBe(true);
  });
});

describe("Door box", () => {
  it("matches the produced carton at 60 × 60 × 150 (creases between the PDF's folds)", () => {
    const d = generate({ ...DEFAULT_PARAMS, style: "doorbox", dimMode: "inside", L: 59.6, W: 59.6, H: 149.6, caliper: 0.4, bleed: 0 });
    expect(d.issues.filter((x) => x.severity === "error")).toEqual([]);
    const vx = [...new Set(d.strokes.filter((s) => s.layer === "crease" && s.seg.kind === "line" && s.seg.a.x === s.seg.b.x).map((s) => s.seg.a.x.toFixed(1)))];
    expect(vx).toEqual(["0.0", "60.0", "120.0", "180.0", "239.6", "299.2"]);
    // The slit runs 32 mm on the inner front | side B fold; the tab is 10 × 30 mm on the door fold.
    const breaks = d.strokes.filter((s) => s.layer === "crease" && s.seg.kind === "line" && s.seg.a.x === s.seg.b.x && s.seg.b.y - s.seg.a.y < 100);
    expect(breaks.map((s) => [s.seg.a.x.toFixed(1), s.seg.a.y.toFixed(1), s.seg.b.y.toFixed(1)])).toEqual([
      ["180.0", "0.0", "60.0"],
      ["180.0", "90.0", "150.0"],
      ["299.2", "0.0", "59.0"],
      ["299.2", "91.0", "150.0"],
    ]);
    expect(d.stats.flatWidth).toBeCloseTo(369.2, 1);
    expect(d.stats.flatHeight).toBeCloseTo(299, 1);
  });
});

describe("3D folding", () => {
  const SIZES: [StyleId, number, number, number][] = [
    ["rte", 80, 40, 100],
    ["ste", 80, 40, 100],
    ["crash", 80, 40, 100],
    ["snap", 80, 40, 100],
    ["srp", 150, 100, 80],
    ["srpSnap", 163, 183, 120],
    ["gable", 120, 80, 100],
    ["mailer", 220, 160, 60],
    ["display", 200, 120, 40],
    ["doorbox", 60, 60, 150],
  ];
  const extent = (d: ReturnType<typeof generate>, t: number) => {
    const P = pose(d.model3d, t);
    const pts = d.model3d.faces.flatMap((f, i) => f.poly.map((q) => apply(P[i], q)));
    return [0, 1, 2].map((k) => Math.max(...pts.map((q) => q[k])) - Math.min(...pts.map((q) => q[k])));
  };

  it("lies flat at the start and closes to the carton's size", () => {
    for (const [style, L, W, H] of SIZES) {
      const d = generate({ ...DEFAULT_PARAMS, style, L, W, H });
      expect(d.model3d.faces.length, style).toBeGreaterThan(5);
      expect(extent(d, 0)[2], style).toBeLessThan(1e-6);
      const size = extent(d, 1).sort((a, b) => a - b);
      const want = [L, W, H].sort((a, b) => a - b);
      // Gable handles and display headers stand above the body; closed flaps are fanned a degree or so to show their order.
      if (style === "gable" || style === "display") continue;
      size.forEach((v, k) => expect(Math.abs(v - want[k]), `${style} ${size} vs ${want}`).toBeLessThan(5));
    }
  });

  it("never folds one face through another", () => {
    type V = [number, number, number];
    const edgeDist = (q: { x: number; y: number }, poly: { x: number; y: number }[]) => {
      let best = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const c = poly[(i + 1) % poly.length];
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const k = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, Math.hypot(a.x + k * dx - q.x, a.y + k * dy - q.y));
      }
      return best;
    };
    for (const [style, L, W, H] of SIZES) {
      const m = generate({ ...DEFAULT_PARAMS, style, L, W, H }).model3d;
      const gone = removedFaces(m);
      // Crossings deeper than two boards, held for more than a moment of the slider.
      const tol = 2 * (m.gap ?? 0.5) + 0.3;
      const runs = new Map<string, number>();
      const bad: string[] = [];
      for (let t = 0; t <= (m.present ? 2 : 1) + 1e-9; t += 0.01) {
        const P = pose(m, t);
        const Wd = m.faces.map((f, i) => f.poly.map((q) => apply(P[i], q) as V));
        const seen = new Set<string>();
        for (let a = 0; a < m.faces.length; a++) {
          for (let b = 0; b < m.faces.length; b++) {
            if (a === b || m.faces[a].parent === b || m.faces[b].parent === a || (t > 1.3 && (gone[a] || gone[b]))) continue;
            const B = Wd[b];
            let n: V = [0, 0, 0];
            for (let i = 0; i < B.length; i++) {
              const p = B[i];
              const q = B[(i + 1) % B.length];
              n = [n[0] + (p[1] - q[1]) * (p[2] + q[2]), n[1] + (p[2] - q[2]) * (p[0] + q[0]), n[2] + (p[0] - q[0]) * (p[1] + q[1])];
            }
            const len = Math.hypot(...n);
            n = [n[0] / len, n[1] / len, n[2] / len];
            const M = P[b];
            const flat = (x: V) => {
              const d = [x[0] - M[12], x[1] - M[13], x[2] - M[14]];
              return { x: M[0] * d[0] + M[1] * d[1] + M[2] * d[2], y: M[4] * d[0] + M[5] * d[1] + M[6] * d[2] };
            };
            // Test A's outline and spokes from its centre, so two equal panels crossing like an X are caught too.
            const A = Wd[a];
            const c: V = [0, 1, 2].map((j) => A.reduce((sum, v) => sum + v[j], 0) / A.length) as V;
            const segs: [V, V][] = A.flatMap((v, i) => [[v, A[(i + 1) % A.length]] as [V, V], [c, v] as [V, V]]);
            for (const [p, q] of segs) {
              const dp = (p[0] - B[0][0]) * n[0] + (p[1] - B[0][1]) * n[1] + (p[2] - B[0][2]) * n[2];
              const dq = (q[0] - B[0][0]) * n[0] + (q[1] - B[0][1]) * n[1] + (q[2] - B[0][2]) * n[2];
              if (!((dp > 0.05 && dq < -0.05) || (dp < -0.05 && dq > 0.05))) continue;
              const k = dp / (dp - dq);
              const f = flat([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k]);
              if (pointInPolygon(f, m.faces[b].poly) && edgeDist(f, m.faces[b].poly) > tol) {
                seen.add(`${a}>${b}`);
                break;
              }
            }
          }
        }
        for (const key of seen) {
          const run = (runs.get(key) ?? 0) + 1;
          runs.set(key, run);
          if (run > 3) bad.push(`${key} at ${t.toFixed(2)}`);
        }
        for (const key of runs.keys()) if (!seen.has(key)) runs.delete(key);
      }
      expect(bad.slice(0, 5), style).toEqual([]);
    }
  });

  it("presents a shelf-ready tray: the tear-away front comes off and the lid folds back on its middle crease", () => {
    for (const style of ["srp", "srpSnap"] as StyleId[]) {
      const d = generate({ ...DEFAULT_PARAMS, style, L: 150, W: 100, H: 80 });
      const m = d.model3d;
      expect(m.present, style).toBe("On shelf");
      const gone = removedFaces(m);
      // Front above the tear, both side triangles and the dust flaps on them.
      expect(gone.filter(Boolean).length, style).toBe(5);
      const P = pose(m, 2);
      const kept = m.faces.flatMap((f, i) => (gone[i] ? [] : f.poly.map((q) => apply(P[i], q))));
      const span = [0, 1, 2].map((k) => Math.max(...kept.map((q) => q[k])) - Math.min(...kept.map((q) => q[k])));
      expect(span[0], style).toBeLessThan(150 + 3);
      expect(span[2], style).toBeLessThan(100 + 3);
      // Nothing else moves without a presentation step.
      expect(generate({ ...DEFAULT_PARAMS, style: "crash", L: 80, W: 40, H: 100 }).model3d.present).toBeUndefined();
    }
  });
});

describe("braille", () => {
  it("translates letters, accents and numbers", () => {
    const { cells, unsupported } = textToBraille("Paracétamol 500 mg");
    expect(unsupported).toEqual([]);
    // p a r a c é t a m o l _ #e j j _ m g
    expect(cells[0]).toEqual([1, 2, 3, 4]);
    expect(cells[5]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(cells[12]).toEqual([3, 4, 5, 6]);
    expect(cells[13]).toEqual([1, 5]);
    expect(cells.length).toBe(19);
  });

  it("wraps at word boundaries", () => {
    const { cells } = textToBraille("abc defg hi");
    const lines = wrapCells(cells, 8);
    expect(lines.map((l) => l.length)).toEqual([8, 2]);
  });

  it("places dots on the chosen panel", () => {
    const d = generate(make({ L: 120, W: 60, H: 160, braille: { ...DEFAULT_PARAMS.braille, enabled: true, text: "Doliprane 1000", panel: "front" } }));
    const front = d.panels.find((p) => p.id === "front")!;
    expect(d.dots.length).toBeGreaterThan(20);
    for (const dot of d.dots) {
      expect(dot.c.x).toBeGreaterThan(front.x);
      expect(dot.c.x).toBeLessThan(front.x + front.w);
      expect(dot.c.y).toBeGreaterThan(front.y);
      expect(dot.c.y).toBeLessThan(front.y + front.h);
    }
  });
});

describe("size from contents", () => {
  it("adds clearances and rounds up to 0.5 mm", () => {
    expect(sizeFromContents(DEFAULT_CONTENTS)).toEqual({ L: 51.5, W: 12, H: 97 });
  });
});
