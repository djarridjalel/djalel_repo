import { writeFileSync, mkdirSync } from "node:fs";
import { generate, DEFAULT_PARAMS } from "../src/lib/dieline/index";
import { renderPdf } from "../src/lib/dieline/export/pdf";
import { renderDxf } from "../src/lib/dieline/export/dxf";
import { renderSvg } from "../src/lib/dieline/export/svg";
import type { CartonParams } from "../src/lib/dieline/types";

const out = process.argv[2] ?? "/tmp/dieline-exports";
mkdirSync(out, { recursive: true });
const p = { ...DEFAULT_PARAMS, style: "rte", L: 60, W: 25, H: 110, tamper: "glueTuck",
  braille: { ...DEFAULT_PARAMS.braille, enabled: true, text: "Paracétamol 500 mg", panel: "front" },
  codingWindow: { ...DEFAULT_PARAMS.codingWindow, enabled: true, preset: "batchExpiry", panel: "front", align: "bottom" },
  pharmacode: { ...DEFAULT_PARAMS.pharmacode, enabled: true, panel: "back" } } as CartonParams;
const d = generate(p);
const meta = { projectName: "Paracetamol 500 mg x16", version: 3, author: "Djalel" };
writeFileSync(`${out}/sample.pdf`, await renderPdf(d, { meta }));
writeFileSync(`${out}/sample.dxf`, renderDxf(d, { meta }));
writeFileSync(`${out}/sample.svg`, renderSvg(d, { titleBlock: true, meta }));
console.log(d.issues);
