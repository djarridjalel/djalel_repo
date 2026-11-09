import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { generate, DEFAULT_PARAMS } from "../dieline";
import { STYLE_NAMES, titleRows } from "../dieline/export/common";
import { LAYERS } from "../dieline/layers";
import { CODING_PRESETS } from "../dieline/pharma";
import type { CartonParams, StyleId } from "../dieline/types";
import { translate } from ".";

const ar = (s: string) => translate("ar", s);
const arabic = /[؀-ۿ]/;

/** Every t("…") and tr("…") literal in the components. */
function literals() {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".tsx")) for (const m of fs.readFileSync(p, "utf8").matchAll(/\btr?\("((?:[^"\\]|\\.)*)"\)/g)) out.add(m[1]);
    }
  };
  walk(path.join(__dirname, "../../components"));
  return [...out];
}

describe("Arabic", () => {
  it("translates every interface string", () => {
    const missing = literals().filter((s) => !arabic.test(ar(s)) && !/^[A-Z0-9 ()]+$/.test(s) && s !== "3D");
    expect(missing).toEqual([]);
  });

  it("translates styles, layers, presets", () => {
    const all = [...Object.values(STYLE_NAMES).map((s) => s.name), ...Object.values(LAYERS).map((l) => l.label), ...Object.values(CODING_PRESETS).map((c) => c.label)];
    expect(all.filter((s) => !arabic.test(ar(s)))).toEqual([]);
  });

  it("translates what the generator says: panels, labels, checks and issues", () => {
    const styles: StyleId[] = ["rte", "ste", "crash", "snap", "srp", "srpSnap", "gable", "mailer", "display", "doorbox"];
    const variants: Partial<CartonParams>[] = [
      {},
      { L: 40, W: 80, H: 120 },
      { L: 30, W: 30, H: 60, tuckDepth: 40, glueWidth: 50, slitLength: 30, tuckRadius: 30 },
      { L: 300, W: 20, H: 15, caliper: 2 },
      { braille: { ...DEFAULT_PARAMS.braille, enabled: true, text: "Paracétamol 1000 mg comprimés pelliculés" , panel: "sideA" }, window: { ...DEFAULT_PARAMS.window, enabled: true, width: 80, height: 200 } },
      { codingWindow: { ...DEFAULT_PARAMS.codingWindow, enabled: true, preset: "custom", width: 90, height: 90 }, pharmacode: { ...DEFAULT_PARAMS.pharmacode, enabled: true, width: 90 } },
      { gable: { ...DEFAULT_PARAMS.gable, handleHeight: 12 }, bottomExtension: 40, glueWidth: 6 },
    ];
    const missing = new Set<string>();
    for (const style of styles)
      for (const v of variants) {
        const d = generate({ ...DEFAULT_PARAMS, ...v, style });
        const strings = [
          ...d.panels.map((p) => p.name),
          ...d.texts.map((t) => t.text).filter((t) => !/^[\d.]+$/.test(t)),
          ...d.issues.map((i) => i.message),
          ...d.issues.flatMap((i) => (i.fix ? [i.fix.label] : [])),
          ...d.fold.checks.flatMap((c) => [c.closure, c.label, c.detail]),
          ...d.fold.views.flatMap((w) => [w.title, ...(w.note ? [w.note] : [])]),
          ...titleRows(d, { projectName: "Untitled carton" }, "ar").flat().filter((s) => /[A-Za-z]{3}/.test(s) && !/GC|SBS|GD|FBB|DataMatrix|v\d/.test(s)),
        ];
        for (const s of strings) if (!arabic.test(ar(s))) missing.add(s);
      }
    expect([...missing]).toEqual([]);
  });
});
