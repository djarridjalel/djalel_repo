"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { renderSvg } from "@/lib/dieline/export/svg";
import { LAYERS, LAYER_ORDER } from "@/lib/dieline/layers";
import type { Dieline, Layer } from "@/lib/dieline/types";

type VB = { x: number; y: number; w: number; h: number };

export function Preview({ d, layers, onToggleLayer }: { d: Dieline; layers: Set<Layer>; onToggleLayer: (l: Layer) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const vb = useRef<VB | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; vb: VB; cx: number; cy: number } | null>(null);

  const svg = useMemo(() => renderSvg(d, { layers, margin: 6, blankFill: "#ffffff" }), [d, layers]);

  const fitBox = useCallback((): VB => {
    const m = 12;
    return { x: d.bbox.minX - m, y: d.bbox.minY - m, w: d.bbox.maxX - d.bbox.minX + 2 * m, h: d.bbox.maxY - d.bbox.minY + 2 * m };
  }, [d.bbox]);

  const apply = useCallback(() => {
    const s = svgRef.current;
    const v = vb.current;
    if (s && v) s.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
  }, []);

  const fit = useCallback(() => {
    vb.current = fitBox();
    apply();
  }, [fitBox, apply]);

  // The drawing is written imperatively so re-renders never reset the view;
  // the view is kept unless the blank changed size a lot.
  const lastSize = useRef<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = svg;
    const s = el.querySelector("svg");
    if (!s) return;
    s.setAttribute("width", "100%");
    s.setAttribute("height", "100%");
    s.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgRef.current = s;
    const size = { w: d.bbox.maxX - d.bbox.minX, h: d.bbox.maxY - d.bbox.minY };
    const prev = lastSize.current;
    if (!vb.current || !prev || Math.abs(prev.w - size.w) > prev.w * 0.25 || Math.abs(prev.h - size.h) > prev.h * 0.25) vb.current = fitBox();
    lastSize.current = size;
    apply();
  }, [svg, d.bbox, fitBox, apply]);

  const unitsPerPx = () => {
    const el = host.current!;
    const v = vb.current!;
    return 1 / Math.min(el.clientWidth / v.w, el.clientHeight / v.h);
  };

  const toUnits = (clientX: number, clientY: number) => {
    const el = host.current!;
    const r = el.getBoundingClientRect();
    const v = vb.current!;
    const k = unitsPerPx();
    const ox = (el.clientWidth * k - v.w) / 2;
    const oy = (el.clientHeight * k - v.h) / 2;
    return { x: v.x - ox + (clientX - r.left) * k, y: v.y - oy + (clientY - r.top) * k };
  };

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const v = vb.current;
    if (!v) return;
    const p = toUnits(clientX, clientY);
    const fb = fitBox();
    const w = Math.min(fb.w * 4, Math.max(8, v.w / factor));
    const f = v.w / w;
    const h = v.h / f;
    vb.current = { x: p.x - (p.x - v.x) / f, y: p.y - (p.y - v.y) / f, w, h };
    apply();
  };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), vb: { ...vb.current! }, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !vb.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      const k = unitsPerPx();
      vb.current = { ...vb.current, x: vb.current.x - (e.clientX - prev.x) * k, y: vb.current.y - (e.clientY - prev.y) * k };
      apply();
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const start = pinch.current;
      vb.current = { ...start.vb };
      zoomAt(start.cx, start.cy, dist / start.dist);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const center = () => {
    const r = host.current!.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2] as const;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-rule bg-paper/60 px-3 py-2">
        {LAYER_ORDER.filter((l) => hasContent(d, l)).map((l) => {
          const st = LAYERS[l];
          const onL = layers.has(l);
          return (
            <button
              key={l}
              type="button"
              onClick={() => onToggleLayer(l)}
              className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition ${onL ? "border-rule bg-paper text-ink" : "border-transparent text-mute line-through opacity-60"}`}
              aria-pressed={onL}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
              {st.label}
            </button>
          );
        })}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={host}
          className="dieline-preview absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={fit}
        />
        <div className="absolute bottom-3 right-3 flex overflow-hidden rounded-md border border-rule bg-paper shadow-sm">
          <ZoomBtn label="Zoom out" onClick={() => zoomAt(...center(), 1 / 1.4)}>−</ZoomBtn>
          <ZoomBtn label="Fit" onClick={fit}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" />
            </svg>
          </ZoomBtn>
          <ZoomBtn label="Zoom in" onClick={() => zoomAt(...center(), 1.4)}>+</ZoomBtn>
        </div>
      </div>
    </div>
  );
}

function ZoomBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center text-[18px] text-ink hover:bg-bone">
      {children}
    </button>
  );
}

function hasContent(d: Dieline, l: Layer) {
  if (l === "cut") return true;
  if (l === "dimension") return d.dims.length > 0;
  return d.strokes.some((s) => s.layer === l) || d.regions.some((r) => r.layer === l) || d.dots.some((q) => q.layer === l) || d.texts.some((q) => q.layer === l);
}
