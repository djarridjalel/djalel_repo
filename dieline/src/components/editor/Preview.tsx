"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { renderSvg } from "@/lib/dieline/export/svg";
import { LAYERS, LAYER_ORDER } from "@/lib/dieline/layers";
import type { UploadResult } from "@/lib/upload";
import type { Dieline, Layer, Panel } from "@/lib/dieline/types";

type VB = { x: number; y: number; w: number; h: number };

const Fold3D = dynamic(() => import("./Fold3D").then((m) => m.Fold3D), {
  ssr: false,
  loading: () => <p className="p-4 text-[12px] text-mute">Loading 3D…</p>,
});

/** Smallest size, in screen pixels, the drawing's labels and dimensions are shown at. */
const MIN_TEXT_PX = 9;

export function Preview({
  d,
  layers,
  onToggleLayer,
  mode,
  upload,
  corrected,
  reading,
  onChooseFile,
  highlight,
  onPanelClick,
}: {
  d: Dieline;
  layers: Set<Layer>;
  onToggleLayer: (l: Layer) => void;
  mode: "make" | "upload";
  upload: UploadResult | null;
  corrected: boolean | null;
  reading: boolean;
  onChooseFile: () => void;
  /** Panels to point at, from a check. */
  highlight: string[];
  onPanelClick: (p: Panel) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const overlay = useRef<SVGSVGElement>(null);
  const scaleBar = useRef<HTMLDivElement>(null);
  const vb = useRef<VB | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; vb: VB; cx: number; cy: number } | null>(null);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [view, setView] = useState<"flat" | "3d">("flat");
  const [hover, setHover] = useState<{ panel: Panel; x: number; y: number } | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);

  const svg = useMemo(() => renderSvg(d, { layers, margin: 6, blankFill: "#ffffff" }), [d, layers]);

  const fitBox = useCallback((): VB => {
    const m = 12;
    return { x: d.bbox.minX - m, y: d.bbox.minY - m, w: d.bbox.maxX - d.bbox.minX + 2 * m, h: d.bbox.maxY - d.bbox.minY + 2 * m };
  }, [d.bbox]);

  const unitsPerPx = useCallback(() => {
    const el = host.current;
    const v = vb.current;
    if (!el || !v || !el.clientWidth) return 1;
    return 1 / Math.min(el.clientWidth / v.w, el.clientHeight / v.h);
  }, []);

  // Keeps labels readable when zoomed out, and the scale bar true to the zoom.
  const apply = useCallback(() => {
    const s = svgRef.current;
    const v = vb.current;
    if (!s || !v) return;
    const box = `${v.x} ${v.y} ${v.w} ${v.h}`;
    s.setAttribute("viewBox", box);
    overlay.current?.setAttribute("viewBox", box);
    const k = unitsPerPx();
    s.querySelectorAll<SVGTextElement>("text[data-fs]").forEach((t) => {
      const fs = Number(t.dataset.fs);
      t.setAttribute("font-size", String(Math.max(fs, MIN_TEXT_PX * k)));
    });
    const bar = scaleBar.current;
    if (bar) {
      // A round length close to 80 px on screen.
      const target = 80 * k;
      const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
      const mm = steps.find((q) => q >= target) ?? 1000;
      bar.style.setProperty("--w", `${mm / k}px`);
      bar.dataset.label = `${mm} mm`;
      const label = bar.querySelector("span");
      if (label) label.textContent = mm >= 10 ? `${mm / 10} cm` : `${mm} mm`;
    }
  }, [unitsPerPx]);

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
    s.querySelectorAll("text").forEach((t) => (t.dataset.fs = t.getAttribute("font-size") ?? "3"));
    svgRef.current = s;
    const size = { w: d.bbox.maxX - d.bbox.minX, h: d.bbox.maxY - d.bbox.minY };
    const prev = lastSize.current;
    if (!vb.current || !prev || Math.abs(prev.w - size.w) > prev.w * 0.25 || Math.abs(prev.h - size.h) > prev.h * 0.25) vb.current = fitBox();
    lastSize.current = size;
    apply();
  }, [svg, d.bbox, fitBox, apply]);

  // Back on the flat view (or after resizing the window), the labels and scale follow the new size.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(() => apply());
    ro.observe(el);
    return () => ro.disconnect();
  }, [apply]);

  const toUnits = (clientX: number, clientY: number) => {
    const el = host.current!;
    const r = el.getBoundingClientRect();
    const v = vb.current!;
    const k = unitsPerPx();
    const ox = (el.clientWidth * k - v.w) / 2;
    const oy = (el.clientHeight * k - v.h) / 2;
    return { x: v.x - ox + (clientX - r.left) * k, y: v.y - oy + (clientY - r.top) * k };
  };

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const v = vb.current;
      const el = host.current;
      if (!v || !el) return;
      const r = el.getBoundingClientRect();
      const k = unitsPerPx();
      const p = { x: v.x - (el.clientWidth * k - v.w) / 2 + (clientX - r.left) * k, y: v.y - (el.clientHeight * k - v.h) / 2 + (clientY - r.top) * k };
      const fb = fitBox();
      const w = Math.min(fb.w * 4, Math.max(8, v.w / factor));
      const f = v.w / w;
      const h = v.h / f;
      vb.current = { x: p.x - (p.x - v.x) / f, y: p.y - (p.y - v.y) / f, w, h };
      apply();
    },
    [apply, fitBox, unitsPerPx],
  );

  const center = useCallback(() => {
    const r = host.current!.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2] as const;
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Keyboard: F flat/3D, + and − zoom, 0 fit (the editor handles U and D).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (mode !== "make") return;
      if (e.key === "f" || e.key === "F") setView((v) => (v === "flat" ? "3d" : "flat"));
      else if (view === "flat" && (e.key === "+" || e.key === "=")) zoomAt(...center(), 1.4);
      else if (view === "flat" && (e.key === "-" || e.key === "_")) zoomAt(...center(), 1 / 1.4);
      else if (view === "flat" && e.key === "0") fit();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, view, zoomAt, center, fit]);

  /** The panel under a point: the smallest one containing it. */
  const panelAt = (x: number, y: number) =>
    d.panels.filter((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h).sort((a, b) => a.w * a.h - b.w * b.h)[0] ?? null;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    press.current = { x: e.clientX, y: e.clientY, moved: false };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), vb: { ...vb.current! }, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      // Hovering: name the panel under the pointer.
      if (e.pointerType !== "mouse" || !vb.current) return;
      const u = toUnits(e.clientX, e.clientY);
      const q = panelAt(u.x, u.y);
      const r = host.current!.getBoundingClientRect();
      setHover(q ? { panel: q, x: e.clientX - r.left, y: e.clientY - r.top } : null);
      return;
    }
    if (!vb.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 4) press.current.moved = true;
    if (pointers.current.size === 1) {
      if (!press.current?.moved) return;
      setHover(null);
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
    const single = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    // A click (not a drag) on a panel opens its field.
    if (single && press.current && !press.current.moved && e.type === "pointerup" && vb.current) {
      const u = toUnits(e.clientX, e.clientY);
      const q = panelAt(u.x, u.y);
      if (q) onPanelClick(q);
    }
    press.current = null;
  };

  const shown = new Set([...(hover ? [hover.panel] : []), ...d.panels.filter((q) => highlight.includes(q.id))]);

  if (mode === "upload") {
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        {upload?.ok ? (
          <div className="relative min-h-0 flex-1">
            <Fold3D model={corrected ? upload.corrected : upload.model} art={upload.art} fileBase={upload.fileName.replace(/\.pdf$/i, "")} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div className="w-full max-w-[520px] rounded-lg border-2 border-dashed border-rule bg-paper/60 px-6 py-12 text-center">
              <p className="text-[18px] font-medium">{reading ? "Reading your PDF…" : "Drop a packaging PDF here"}</p>
              <p className="mx-auto mt-2 max-w-[380px] text-[13px] leading-relaxed text-mute">
                The dieline is found and matched to a carton style, checked, and folded in 3D with your artwork. The file is read in your browser and never leaves your device.
              </p>
              <button type="button" onClick={onChooseFile} disabled={reading} className="mt-6 inline-flex h-11 items-center rounded-md bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-accent hover:text-ink">
                {reading ? "Reading…" : "Choose a PDF"}
              </button>
              {upload && !upload.ok && <p className="mx-auto mt-4 max-w-[380px] text-[13px] text-danger">{upload.reason}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-rule bg-bone px-3 py-2">
        <div className="flex overflow-hidden rounded-full border border-rule bg-paper text-[12px]" role="group" aria-label="View">
          {(
            [
              ["flat", "Flat"],
              ["3d", "3D"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} title={`${l} view (F)`} className={`h-8 px-4 ${view === v ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
              {l}
            </button>
          ))}
        </div>
        {view === "flat" && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setLayersOpen((o) => !o)}
              aria-expanded={layersOpen}
              className="relative z-30 flex h-8 items-center gap-2 rounded-full border border-rule bg-paper px-3 text-[12px] hover:border-ink"
            >
              Layers
              <span className="font-mono text-[11px] text-mute">
                {LAYER_ORDER.filter((l) => hasContent(d, l) && layers.has(l)).length}/{LAYER_ORDER.filter((l) => hasContent(d, l)).length}
              </span>
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden className={layersOpen ? "rotate-180" : ""}>
                <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            {layersOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setLayersOpen(false)} aria-hidden />
                <ul className="absolute left-0 top-10 z-30 w-[220px] rounded-md border border-rule bg-paper p-1 shadow-md" role="menu">
                  {LAYER_ORDER.filter((l) => hasContent(d, l)).map((l) => {
                    const st = LAYERS[l];
                    const onL = layers.has(l);
                    return (
                      <li key={l}>
                        <button
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={onL}
                          onClick={() => onToggleLayer(l)}
                          className="flex h-9 w-full items-center gap-2.5 rounded px-2 text-left text-[13px] hover:bg-bone"
                        >
                          <span className={`flex h-4 w-4 items-center justify-center rounded border ${onL ? "border-ink bg-ink text-paper" : "border-rule"}`} aria-hidden>
                            {onL && (
                              <svg width="10" height="10" viewBox="0 0 10 10">
                                <path d="M2 5.2 4.2 7.4 8 3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                              </svg>
                            )}
                          </span>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
                          <span className={onL ? "" : "text-mute"}>{st.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}
        <p className="ml-auto hidden text-[11px] text-mute lg:block">{view === "flat" ? "Click a panel to edit it · drag to pan · scroll to zoom" : "Drag to turn · scroll to zoom"}</p>
      </div>
      {view === "3d" && (
        <div className="relative min-h-0 flex-1">
          <Fold3D model={d.model3d} />
          <Inset label="Flat" onClick={() => setView("flat")}>
            <div className="h-full w-full p-2 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          </Inset>
        </div>
      )}
      <div className={`relative min-h-0 flex-1 overflow-hidden ${view === "3d" ? "hidden" : ""}`}>
        <div
          ref={host}
          className={`dieline-preview absolute inset-0 touch-none select-none ${hover ? "cursor-pointer" : "cursor-grab"} active:cursor-grabbing`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHover(null)}
          onDoubleClick={fit}
        />
        <svg ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
          {[...shown].map((q, i) => (
            <rect key={`${q.id}-${i}`} x={q.x} y={q.y} width={q.w} height={q.h} fill="#ffce00" fillOpacity={highlight.includes(q.id) ? 0.35 : 0.18} stroke="#6e5400" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute z-20 rounded bg-ink px-2 py-1 text-[11px] text-paper shadow" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            {hover.panel.name} · <span className="font-mono">{fmt(hover.panel.w)} × {fmt(hover.panel.h)} mm</span>
            <span className="ml-1 text-paper/60">· click to edit</span>
          </div>
        )}
        {view === "flat" && d.model3d.faces.length > 0 && (
          <Inset label="3D" onClick={() => setView("3d")}>
            <Fold3D model={d.model3d} mini />
          </Inset>
        )}
        <div ref={scaleBar} className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-start gap-1" aria-hidden>
          <span className="font-mono text-[11px] text-mute" />
          <div className="h-1.5 border-x border-b border-ink/70" style={{ width: "var(--w, 80px)" }} />
        </div>
        <div className="absolute bottom-3 right-3 flex overflow-hidden rounded-md border border-rule bg-paper shadow-sm">
          <ZoomBtn label="Zoom out" keyHint="−" onClick={() => zoomAt(...center(), 1 / 1.4)}>−</ZoomBtn>
          <ZoomBtn label="Fit" keyHint="0" onClick={fit}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" />
            </svg>
          </ZoomBtn>
          <ZoomBtn label="Zoom in" keyHint="+" onClick={() => zoomAt(...center(), 1.4)}>+</ZoomBtn>
        </div>
      </div>
    </div>
  );
}

/** What was found in an uploaded PDF, with any problems in its dieline and the offer to correct them. */
export function UploadPanel({
  upload,
  corrected,
  onAnswer,
  onDownloadCorrected,
}: {
  upload: UploadResult;
  corrected: boolean | null;
  onAnswer: (v: boolean) => void;
  onDownloadCorrected: () => void;
}) {
  return (
    <div className="rounded-md border border-rule bg-paper p-3 text-[13px] leading-relaxed" role="status">
      <p className="truncate font-medium">{upload.fileName}</p>
      {!upload.ok ? (
        <p className="mt-1 text-danger">{upload.reason}</p>
      ) : (
        <>
          <p className="mt-1 text-mute">Matched: {upload.label}</p>
          {upload.issues.length === 0 && <p className="mt-2">No problems found in the dieline.</p>}
          {upload.issues.length > 0 && corrected === null && (
            <div className="mt-2 rounded border border-danger/40 p-2">
              <p className="font-medium text-danger">This dieline has {upload.issues.length === 1 ? "a problem" : `${upload.issues.length} problems`}:</p>
              <ul className="mt-1 list-disc pl-4">
                {upload.issues.map((c) => (
                  <li key={c.id}>
                    {c.closure}: {c.detail}
                  </li>
                ))}
              </ul>
              <p className="mt-1">Correct the dieline? The corrected dieline uses the app&apos;s construction at your file&apos;s size; the 3D view shows it, with your artwork.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => onAnswer(true)} className="h-8 rounded-md bg-ink px-3 font-medium text-paper">
                  Correct it
                </button>
                <button type="button" onClick={() => onAnswer(false)} className="h-8 rounded-md border border-rule px-3">
                  Keep as drawn
                </button>
              </div>
            </div>
          )}
          {corrected === true && (
            <p className="mt-2">
              Corrected.{" "}
              <button type="button" className="underline underline-offset-2" onClick={onDownloadCorrected}>
                Download the corrected dieline
              </button>
            </p>
          )}
          {corrected === false && <p className="mt-2 text-mute">Kept as drawn. The 3D view folds your file&apos;s own flaps.</p>}
        </>
      )}
    </div>
  );
}

/** The other view floating in the preview's top-left corner, without a frame; clicking it switches views. */
function Inset({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show ${label === "3D" ? "the 3D view" : "the flat dieline"}`}
      title={label === "3D" ? "Open the 3D view (F)" : "Back to the flat dieline (F)"}
      className="absolute left-3 top-3 z-10 h-[110px] w-[150px] cursor-pointer bg-transparent transition-opacity hover:opacity-80 sm:h-[200px] sm:w-[300px]"
    >
      {children}
    </button>
  );
}

function ZoomBtn({ children, onClick, label, keyHint }: { children: React.ReactNode; onClick: () => void; label: string; keyHint: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={`${label} (${keyHint})`} className="flex h-9 w-9 items-center justify-center text-[18px] text-ink hover:bg-bone">
      {children}
    </button>
  );
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

export function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

function hasContent(d: Dieline, l: Layer) {
  if (l === "cut") return true;
  if (l === "dimension") return d.dims.length > 0;
  return d.strokes.some((s) => s.layer === l) || d.regions.some((r) => r.layer === l) || d.dots.some((q) => q.layer === l) || d.texts.some((q) => q.layer === l);
}
