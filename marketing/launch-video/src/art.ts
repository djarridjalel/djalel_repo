// A made-up product's print, laid out on the blank's own panels, for the
// carton in the film: white board, a deep blue band, the studio's yellow.

import type { Dieline } from "../../../dieline/src/lib/dieline/types";

export const PX = 10; // pixels per millimetre
export const PAD = 6;

export function paintArt(d: Dieline): HTMLCanvasElement {
  const x0 = d.bbox.minX - PAD;
  const y0 = d.bbox.minY - PAD;
  const W = d.bbox.maxX - d.bbox.minX + 2 * PAD;
  const H = d.bbox.maxY - d.bbox.minY + 2 * PAD;
  const c = document.createElement("canvas");
  c.width = Math.round(W * PX);
  c.height = Math.round(H * PX);
  const g = c.getContext("2d")!;
  g.scale(PX, PX);
  g.translate(-x0, -y0);
  g.fillStyle = "#f7f5ef";
  g.fillRect(x0, y0, W, H);

  const panel = (id: string) => d.panels.find((p) => p.id === id);
  const band = (p: { x: number; y: number; w: number; h: number }, top: number, h: number) => {
    const grad = g.createLinearGradient(p.x, p.y + top, p.x + p.w, p.y + top + h);
    grad.addColorStop(0, "#0b2a52");
    grad.addColorStop(1, "#1f5aa6");
    g.fillStyle = grad;
    g.fillRect(p.x - 0.5, p.y + top, p.w + 1, h);
  };
  const text = (s: string, x: number, y: number, size: number, opts: { font?: string; weight?: number; color?: string; align?: CanvasTextAlign; rotate?: number; track?: number } = {}) => {
    g.save();
    g.translate(x, y);
    if (opts.rotate) g.rotate(opts.rotate);
    g.font = `${opts.weight ?? 500} ${size}px ${opts.font ?? "'Inter Tight Variable', sans-serif"}`;
    g.fillStyle = opts.color ?? "#0b2a52";
    g.textAlign = opts.align ?? "center";
    g.textBaseline = "middle";
    if (opts.track) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${opts.track}px`;
    g.fillText(s, 0, 0);
    g.restore();
  };

  // Front and back: the brand face.
  for (const id of ["front", "back"]) {
    const p = panel(id);
    if (!p) continue;
    band(p, p.h * 0.52, p.h * 0.48);
    g.fillStyle = "#ffce00";
    g.fillRect(p.x - 0.5, p.y + p.h * 0.52 - 2.2, p.w + 1, 2.2);
    text("NOVA", p.x + p.w / 2, p.y + p.h * 0.2, p.w * 0.26, { font: "'Fraunces Variable', serif", weight: 700, track: 0.6 });
    text("PARACETAMOL", p.x + p.w / 2, p.y + p.h * 0.3, p.w * 0.075, { weight: 600, track: 0.5, color: "#1f5aa6" });
    text("500 mg", p.x + p.w / 2, p.y + p.h * 0.66, p.w * 0.2, { weight: 700, color: "#ffffff" });
    text("16 film-coated tablets", p.x + p.w / 2, p.y + p.h * 0.76, p.w * 0.07, { weight: 400, color: "#d6e4f7" });
    // A few soft circles: the brand's mark.
    g.globalAlpha = 0.16;
    g.fillStyle = "#ffffff";
    for (const [cx, cy, r] of [
      [0.82, 0.9, 0.22],
      [0.12, 0.62, 0.1],
    ])
      g.beginPath(), g.arc(p.x + p.w * cx, p.y + p.h * cy, p.w * r, 0, Math.PI * 2), g.fill();
    g.globalAlpha = 1;
  }
  // Sides: information, set like a leaflet column.
  for (const id of ["sideA", "sideB"]) {
    const p = panel(id);
    if (!p) continue;
    band(p, p.h * 0.88, p.h * 0.12);
    text("NOVA 500", p.x + p.w / 2, p.y + p.h * 0.1, p.w * 0.16, { font: "'Fraunces Variable', serif", weight: 700 });
    g.fillStyle = "#9fb3cc";
    for (let k = 0; k < 14; k++) {
      const w = p.w * (0.55 + 0.3 * Math.abs(Math.sin(k * 1.7 + (id === "sideA" ? 0 : 2))));
      g.fillRect(p.x + p.w * 0.12, p.y + p.h * 0.2 + k * p.h * 0.034, w * 0.85, p.h * 0.012);
    }
    if (id === "sideB") {
      // Barcode.
      g.fillStyle = "#0b2a52";
      let x = p.x + p.w * 0.18;
      for (let k = 0; k < 38; k++) {
        const bw = [0.35, 0.7, 0.35, 1.05][(k * 7) % 4] * (p.w / 60);
        if (k % 2 === 0) g.fillRect(x, p.y + p.h * 0.72, bw, p.h * 0.1);
        x += bw + p.w / 120;
      }
    }
  }
  // Lids and tucks: the name again, to be read from above.
  for (const id of ["topLid", "bottomLid"]) {
    const p = panel(id);
    if (!p) continue;
    band(p, 0, p.h);
    text("NOVA", p.x + p.w / 2, p.y + p.h / 2, Math.min(p.w * 0.22, p.h * 0.5), { font: "'Fraunces Variable', serif", weight: 700, color: "#ffffff", rotate: id === "topLid" ? Math.PI : 0 });
  }
  const glue = panel("glueFlap");
  if (glue) {
    g.fillStyle = "#f7f5ef";
    g.fillRect(glue.x, glue.y, glue.w, glue.h);
  }
  return c;
}
