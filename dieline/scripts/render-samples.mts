import { writeFileSync, mkdirSync } from "node:fs";
import { generate, DEFAULT_PARAMS } from "../src/lib/dieline/index";
import { renderSvg } from "../src/lib/dieline/export/svg";
import type { CartonParams } from "../src/lib/dieline/types";

const out = process.argv[2] ?? "/tmp/dieline-samples";
mkdirSync(out, { recursive: true });
const cases: [string, Partial<CartonParams>][] = [
  ["rte", { style: "rte", L: 120.6, W: 60.6, H: 161.1, caliper: 0.46, tuckDepth: 20, tuckRadius: 15, glueWidth: 16, dustDepth: 36 }],
  ["ste", { style: "ste" }],
  ["crash", { style: "crash", L: 120.6, W: 60.6, H: 161.1, caliper: 0.46 }],
  ["snap", { style: "snap", L: 120.6, W: 60.6, H: 161.1, caliper: 0.46 }],
  ["pharma", { style: "rte", tamper: "glueTuck", braille: { ...DEFAULT_PARAMS.braille, enabled: true, text: "Paracétamol 500 mg" }, codingWindow: { ...DEFAULT_PARAMS.codingWindow, enabled: true, preset: "gs1" }, pharmacode: { ...DEFAULT_PARAMS.pharmacode, enabled: true } }],
  ["tear", { style: "ste", tamper: "tearStrip", lock: "friction" }],
];
for (const [name, over] of cases) {
  const d = generate({ ...DEFAULT_PARAMS, ...over } as CartonParams);
  writeFileSync(`${out}/${name}.svg`, renderSvg(d, { titleBlock: true, meta: { projectName: name }, background: "#fff" }));
  console.log(name, JSON.stringify(d.stats), d.issues.map((i) => `${i.severity}: ${i.message}`).join(" | "));
}
