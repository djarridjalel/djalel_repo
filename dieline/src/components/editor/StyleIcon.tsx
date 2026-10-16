import { DEFAULT_PARAMS, generate } from "@/lib/dieline";
import { segsToPath } from "@/lib/dieline/export/svg";
import type { CartonParams, StyleId } from "@/lib/dieline/types";

// Each icon is the style's real flat blank, drawn by the same generator as the
// preview, so it always matches what the style produces.

const ICON_SIZES: Record<StyleId, Partial<CartonParams>> = {
  rte: { L: 60, W: 30, H: 90 },
  ste: { L: 60, W: 30, H: 90 },
  crash: { L: 60, W: 30, H: 90 },
  snap: { L: 60, W: 30, H: 90 },
  srp: { L: 150, W: 100, H: 80 },
  gable: { L: 120, W: 80, H: 100, gable: { handleHeight: 40, holeWidth: 60, holeHeight: 20 } },
  mailer: { L: 220, W: 160, H: 60, caliper: 1.5 },
  display: { L: 200, W: 120, H: 40 },
};

interface IconData {
  viewBox: string;
  cut: string;
  crease: string;
  perf: string;
  scale: number;
}

const cache = new Map<StyleId, IconData>();

function iconData(style: StyleId): IconData {
  const hit = cache.get(style);
  if (hit) return hit;
  const d = generate({ ...DEFAULT_PARAMS, ...ICON_SIZES[style], style, bleed: 0, showDimensions: false });
  const pick = (layer: string) => d.strokes.filter((s) => s.layer === layer).map((s) => s.seg);
  const { minX, minY, maxX, maxY } = d.bbox;
  const pad = Math.max(maxX - minX, maxY - minY) * 0.03;
  const data: IconData = {
    viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`,
    cut: segsToPath([...d.outline, ...pick("cut")]),
    crease: segsToPath(pick("crease")),
    perf: segsToPath(pick("perf")),
    scale: Math.max(maxX - minX, maxY - minY),
  };
  cache.set(style, data);
  return data;
}

export function StyleIcon({ style }: { style: StyleId }) {
  const ic = iconData(style);
  const dash = (k: number) => `${(ic.scale * k).toFixed(2)} ${(ic.scale * k * 0.7).toFixed(2)}`;
  return (
    <svg viewBox={ic.viewBox} className="h-14 w-20" fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d={ic.crease} strokeWidth={0.7} vectorEffect="non-scaling-stroke" opacity={0.45} />
      <path d={ic.perf} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray={dash(0.018)} />
      <path d={ic.cut} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
