import { describe, expect, it } from "vitest";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { DEFAULT_PARAMS, generate } from "../dieline";
import { renderPdf } from "../dieline/export/pdf";
import type { StyleId } from "../dieline/types";
import { analyseTube } from "./match";
import { readPdfDieline } from "./pdfDieline";

const read = async (bytes: Uint8Array) => {
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  return readPdfDieline(doc, pdfjs.OPS as unknown as Record<string, number>);
};

describe("uploaded dielines", () => {
  // The app's own PDFs: cuts, folds, bleed and safe areas on layers of their own.
  const CASES: [StyleId, number, number, number][] = [
    ["rte", 60, 25, 110],
    ["ste", 60, 25, 110],
    ["crash", 80, 40, 100],
    ["snap", 80, 40, 100],
    ["srp", 150, 100, 80],
    ["srpSnap", 150, 100, 80],
    ["gable", 120, 80, 100],
  ];

  it("reads back the style and size of every tube from its exported PDF", async () => {
    for (const [style, L, W, H] of CASES) {
      const d = generate({ ...DEFAULT_PARAMS, style, dimMode: "inside", L, W, H });
      const r = await read(await renderPdf(d, { meta: { projectName: "t", version: null, author: null } }));
      const a = analyseTube(r.segs, r.width, r.height);
      expect(a?.matches[0].style, style).toBe(style);
      const p = a!.matches[0].params;
      expect([Math.abs(p.L - L), Math.abs(p.W - W), Math.abs(p.H - H)].every((v) => v < 1), `${style} ${p.L} ${p.W} ${p.H}`).toBe(true);
      expect(a!.checks.filter((c) => !c.ok).map((c) => c.id), style).toEqual([]);
    }
  }, 60000);

  it("finds the dieline when it is drawn upside down or mirrored", async () => {
    const d = generate({ ...DEFAULT_PARAMS, style: "rte", dimMode: "inside", L: 60, W: 25, H: 110 });
    const r = await read(await renderPdf(d, { meta: { projectName: "t", version: null, author: null } }));
    for (const [sx, sy] of [[-1, 1], [1, -1], [-1, -1]]) {
      const segs = r.segs.map((s) => ({ ...s, a: { x: sx > 0 ? s.a.x : r.width - s.a.x, y: sy > 0 ? s.a.y : r.height - s.a.y }, b: { x: sx > 0 ? s.b.x : r.width - s.b.x, y: sy > 0 ? s.b.y : r.height - s.b.y } }));
      const a = analyseTube(segs, r.width, r.height);
      expect(a?.matches[0].style, `${sx},${sy}`).toBe("rte");
    }
  }, 30000);

  it("passes the app's own snap-lock bottom: hook flaps stop short of each other", async () => {
    const d = generate({ ...DEFAULT_PARAMS, style: "snap", dimMode: "inside", L: 80, W: 40, H: 100 });
    const r = await read(await renderPdf(d, { meta: { projectName: "t", version: null, author: null } }));
    const a = analyseTube(r.segs, r.width, r.height)!;
    expect(a.checks.find((c) => c.id === "bottom.apart")?.ok).toBe(true);
  }, 30000);

  it("reads back the door box, only for the accounts that have it", async () => {
    const d = generate({ ...DEFAULT_PARAMS, style: "doorbox", dimMode: "inside", L: 59.6, W: 59.6, H: 149.6, caliper: 0.4 });
    const r = await read(await renderPdf(d, { meta: { projectName: "t", version: null, author: null } }));
    expect(analyseTube(r.segs, r.width, r.height)).toBeNull();
    const a = analyseTube(r.segs, r.width, r.height, ["doorbox"])!;
    expect(a.matches[0].style).toBe("doorbox");
    const p = a.matches[0].params;
    expect([p.L, p.W, p.H, p.caliper].map((v) => Math.round(v * 10) / 10)).toEqual([59.6, 59.6, 149.6, 0.4]);
    expect(a.matches[0].score).toBeLessThan(2);
    expect(a.checks.filter((c) => !c.ok)).toEqual([]);
  }, 30000);

  it("reads a reverse tuck end with its glue flap on a side panel (lids on the 2nd and 4th panels)", async () => {
    const d = generate({ ...DEFAULT_PARAMS, style: "rte", joint: "side", dimMode: "inside", L: 52, W: 52, H: 160 });
    const r = await read(await renderPdf(d, { meta: { projectName: "t", version: null, author: null } }));
    const a = analyseTube(r.segs, r.width, r.height)!;
    expect([a.matches[0].style, a.matches[0].params.joint]).toEqual(["rte", "side"]);
  }, 30000);
});

