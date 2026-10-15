import type { Layer } from "./types";

export interface LayerStyle {
  /** Spot colour / layer name used in exported files. */
  name: string;
  label: string;
  color: string;
  cmyk: [number, number, number, number];
  width: number;
  dash?: number[];
  fill?: number;
  dxfColor: number;
  /** Production layers go to the die-maker; guides are for the artwork only. */
  kind: "production" | "guide";
}

export const LAYERS: Record<Layer, LayerStyle> = {
  cut: { name: "Cut", label: "Cut", color: "#E30613", cmyk: [0, 1, 1, 0], width: 0.25, dxfColor: 1, kind: "production" },
  crease: { name: "Crease", label: "Crease", color: "#00A651", cmyk: [1, 0, 1, 0], width: 0.25, dash: [3, 1.5], dxfColor: 3, kind: "production" },
  perf: { name: "Perforation", label: "Perforation", color: "#F39200", cmyk: [0, 0.5, 1, 0], width: 0.25, dash: [1.5, 0.8, 0.3, 0.8], dxfColor: 30, kind: "production" },
  bleed: { name: "Bleed", label: "Bleed", color: "#00AEEF", cmyk: [1, 0, 0, 0], width: 0.15, dxfColor: 4, kind: "guide" },
  safe: { name: "SafeArea", label: "Safe area", color: "#8C8C8C", cmyk: [0, 0, 0, 0.45], width: 0.12, dash: [1, 1], dxfColor: 8, kind: "guide" },
  glue: { name: "Glue", label: "Glue area", color: "#E0B000", cmyk: [0, 0.2, 1, 0], width: 0.12, fill: 0.3, dxfColor: 2, kind: "guide" },
  varnishFree: { name: "VarnishFree", label: "Varnish-free", color: "#8E44AD", cmyk: [0.5, 0.9, 0, 0], width: 0.15, fill: 0.16, dxfColor: 6, kind: "guide" },
  braille: { name: "Braille", label: "Braille", color: "#0057B8", cmyk: [1, 0.6, 0, 0], width: 0.1, fill: 1, dxfColor: 5, kind: "production" },
  pharmacode: { name: "Pharmacode", label: "Pharmacode", color: "#00A3A1", cmyk: [0.8, 0, 0.4, 0], width: 0.15, fill: 0.16, dxfColor: 140, kind: "guide" },
  dimension: { name: "Dimensions", label: "Dimensions", color: "#6B6B6B", cmyk: [0, 0, 0, 0.6], width: 0.12, dxfColor: 9, kind: "guide" },
  label: { name: "Info", label: "Panel names", color: "#9A9A9A", cmyk: [0, 0, 0, 0.4], width: 0.15, dxfColor: 8, kind: "guide" },
};

/** Drawing order: fills first, production lines on top. */
export const LAYER_ORDER: Layer[] = [
  "glue",
  "varnishFree",
  "pharmacode",
  "safe",
  "bleed",
  "label",
  "dimension",
  "crease",
  "perf",
  "cut",
  "braille",
];
