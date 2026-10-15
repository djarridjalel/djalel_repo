import { arcSweep, type Pt, type Seg } from "../geom";
import { LAYERS, LAYER_ORDER } from "../layers";
import type { Dieline, Dimension, Layer } from "../types";
import { BRAND, DISCLAIMER, titleRows, type ExportMeta } from "./common";

const n = (v: number) => (Math.round(v * 1000) / 1000).toString();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function segsToPath(segs: Seg[]): string {
  let d = "";
  let cur: Pt | null = null;
  for (const s of segs) {
    if (!cur || Math.abs(cur.x - s.a.x) > 1e-6 || Math.abs(cur.y - s.a.y) > 1e-6) d += `M${n(s.a.x)} ${n(s.a.y)}`;
    if (s.kind === "line") d += `L${n(s.b.x)} ${n(s.b.y)}`;
    else {
      const large = arcSweep(s) > Math.PI ? 1 : 0;
      d += `A${n(s.r)} ${n(s.r)} 0 ${large} ${s.ccw ? 1 : 0} ${n(s.b.x)} ${n(s.b.y)}`;
    }
    cur = s.b;
  }
  return d;
}

export interface SvgOptions {
  layers?: Set<Layer>;
  titleBlock?: boolean;
  meta?: ExportMeta;
  /** Stroke widths scale for on-screen viewing (1 = true mm widths). */
  strokeScale?: number;
  margin?: number;
  background?: string | null;
  /** Fill the blank's outline, e.g. white paper on a grey canvas. */
  blankFill?: string | null;
}

function dimSvg(dm: Dimension, size: number): string {
  const dx = dm.b.x - dm.a.x;
  const dy = dm.b.y - dm.a.y;
  const L = Math.hypot(dx, dy);
  if (L < 1) return "";
  const ux = dx / L;
  const uy = dy / L;
  const h = Math.min(1.6, L / 6);
  const a = dm.a;
  const b = dm.b;
  const arrow = (p: Pt, dir: number) =>
    `M${n(p.x + dir * (ux * h - uy * h * 0.45))} ${n(p.y + dir * (uy * h + ux * h * 0.45))}L${n(p.x)} ${n(p.y)}L${n(p.x + dir * (ux * h + uy * h * 0.45))} ${n(p.y + dir * (uy * h - ux * h * 0.45))}`;
  let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (ang > 90) ang -= 180;
  if (ang <= -90) ang += 180;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const nx = Math.abs(ang) === 90 ? -size * 0.6 : 0;
  const ny = Math.abs(ang) === 90 ? 0 : -size * 0.45;
  return (
    `<path d="M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}${arrow(a, 1)}${arrow(b, -1)}"/>` +
    `<text x="${n(mx + nx)}" y="${n(my + ny)}" transform="rotate(${n(ang)} ${n(mx + nx)} ${n(my + ny)})" text-anchor="middle" font-size="${n(size)}" stroke="none" fill="currentColor">${esc(dm.text)}</text>`
  );
}

export function renderSvg(d: Dieline, opts: SvgOptions = {}): string {
  const on = (l: Layer) => !opts.layers || opts.layers.has(l);
  const k = opts.strokeScale ?? 1;
  const margin = opts.margin ?? 10;
  const tb = opts.titleBlock ?? false;
  const tbH = tb ? 40 : 0;
  const minX = d.bbox.minX - margin;
  const minY = d.bbox.minY - margin;
  const w = Math.max(d.bbox.maxX - d.bbox.minX + 2 * margin, tb ? 190 : 0);
  const h = d.bbox.maxY - d.bbox.minY + 2 * margin + tbH;

  const groups: string[] = [];
  if (opts.blankFill) groups.push(`<path d="${segsToPath(d.outline)}Z" fill="${opts.blankFill}" stroke="none"/>`);
  for (const layer of LAYER_ORDER) {
    if (!on(layer)) continue;
    const st = LAYERS[layer];
    const parts: string[] = [];
    const segs = d.strokes.filter((s) => s.layer === layer).map((s) => s.seg);
    if (layer === "cut") segs.unshift(...d.outline);
    if (segs.length) parts.push(`<path d="${segsToPath(segs)}" fill="none"/>`);
    for (const rg of d.regions.filter((r) => r.layer === layer)) {
      const pts = rg.pts.map((q) => `${n(q.x)},${n(q.y)}`).join(" ");
      parts.push(`<polygon points="${pts}" fill="${st.fill ? st.color : "none"}" fill-opacity="${st.fill ?? 0}"/>`);
    }
    for (const dot of d.dots.filter((q) => q.layer === layer)) {
      parts.push(`<circle cx="${n(dot.c.x)}" cy="${n(dot.c.y)}" r="${n(dot.r)}" fill="${st.color}" stroke="none"/>`);
    }
    if (layer === "dimension") for (const dm of d.dims) parts.push(dimSvg(dm, 2.6));
    for (const tx of d.texts.filter((q) => q.layer === layer)) {
      const rot = tx.rotate ? ` transform="rotate(${n(tx.rotate)} ${n(tx.at.x)} ${n(tx.at.y)})"` : "";
      parts.push(
        `<text x="${n(tx.at.x)}" y="${n(tx.at.y)}"${rot} text-anchor="${tx.anchor ?? "start"}" dominant-baseline="middle" font-size="${n(tx.size)}" stroke="none" fill="${st.color}">${esc(tx.text)}</text>`,
      );
    }
    if (!parts.length) continue;
    const dash = st.dash ? ` stroke-dasharray="${st.dash.map((v) => n(v * Math.max(1, k * 0.6))).join(" ")}"` : "";
    groups.push(
      `<g id="${st.name}" inkscape:groupmode="layer" inkscape:label="${st.label}" stroke="${st.color}" color="${st.color}" stroke-width="${n(st.width * k)}"${dash} stroke-linejoin="round" stroke-linecap="round">${parts.join("")}</g>`,
    );
  }

  if (tb) {
    const rows = titleRows(d, opts.meta ?? { projectName: "Untitled carton" });
    const x0 = d.bbox.minX;
    const y0 = d.bbox.maxY + margin + 4;
    let s = `<g id="TitleBlock" inkscape:groupmode="layer" inkscape:label="Title block" font-family="Helvetica, Arial, sans-serif" fill="#1a1a1a" stroke="none">`;
    s += `<text x="${n(x0)}" y="${n(y0 + 3)}" font-size="3.6" font-weight="700">${esc(BRAND)}</text>`;
    rows.forEach(([kk, v], i) => {
      const yy = y0 + 9 + i * 3.8;
      s += `<text x="${n(x0)}" y="${n(yy)}" font-size="2.6" fill="#666">${esc(kk)}</text><text x="${n(x0 + 24)}" y="${n(yy)}" font-size="2.6">${esc(v)}</text>`;
    });
    s += `<text x="${n(x0)}" y="${n(y0 + 9 + rows.length * 3.8 + 1)}" font-size="2.3" fill="#B00020">${esc(DISCLAIMER)}</text>`;
    s += `</g>`;
    groups.push(s);
  }

  const bg = opts.background ? `<rect x="${n(minX)}" y="${n(minY)}" width="${n(w)}" height="${n(h)}" fill="${opts.background}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${n(w)}mm" height="${n(h)}mm" viewBox="${n(minX)} ${n(minY)} ${n(w)} ${n(h)}" font-family="Helvetica, Arial, sans-serif">` +
    bg +
    groups.join("") +
    `</svg>`
  );
}
