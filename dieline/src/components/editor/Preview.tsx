"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { renderSvg } from "@/lib/dieline/export/svg";
import { LAYERS, LAYER_ORDER } from "@/lib/dieline/layers";
import { downloadDieline } from "@/lib/download";
import type { UploadResult } from "@/lib/upload";
import type { Dieline, Layer } from "@/lib/dieline/types";

type VB = { x: number; y: number; w: number; h: number };

const Fold3D = dynamic(() => import("./Fold3D").then((m) => m.Fold3D), {
  ssr: false,
  loading: () => <p className="p-4 text-[12px] text-mute">Loading 3D…</p>,
});

export function Preview({ d, layers, onToggleLayer }: { d: Dieline; layers: Set<Layer>; onToggleLayer: (l: Layer) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const vb = useRef<VB | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; vb: VB; cx: number; cy: number } | null>(null);
  const [view, setView] = useState<"flat" | "3d">("flat");
  // An uploaded design shown in 3D only; the editor's own carton is left as it is.
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [reading, setReading] = useState(false);
  /** null until the user answers whether to correct the uploaded dieline's problems. */
  const [corrected, setCorrected] = useState<boolean | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setCorrected(null);
    try {
      const { analysePdf } = await import("@/lib/upload");
      setUpload(await analysePdf(file));
    } catch {
      setUpload({ ok: false, fileName: file.name, reason: "This PDF could not be read." });
    } finally {
      setReading(false);
      setView("3d");
    }
  };

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
      <div className="flex flex-wrap items-center gap-1.5 border-b border-rule bg-bone px-3 py-2">
        <div className="mr-1 flex overflow-hidden rounded-full border border-rule bg-paper text-[11px]" role="group" aria-label="View">
          {(
            [
              ["flat", "Flat"],
              ["3d", "3D"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`h-7 px-3 ${view === v ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={reading} className="mr-1 h-7 rounded-full border border-rule bg-paper px-3 text-[11px] hover:border-ink">
          {reading ? "Reading…" : "Upload design"}
        </button>
        <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] ?? undefined)} />
        {view === "flat" && LAYER_ORDER.filter((l) => hasContent(d, l)).map((l) => {
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
      {view === "3d" && (
        <div className="relative min-h-0 flex-1">
          {upload?.ok ? <Fold3D model={upload.model} art={upload.art} fileBase={upload.fileName.replace(/\.pdf$/i, "")} /> : <Fold3D model={d.model3d} />}
          {upload && <UploadPanel upload={upload} corrected={corrected} onAnswer={setCorrected} onClose={() => setUpload(null)} />}
          <Inset label="Flat" onClick={() => setView("flat")}>
            <div className="h-full w-full p-2 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          </Inset>
        </div>
      )}
      <div className={`relative min-h-0 flex-1 overflow-hidden ${view === "3d" ? "hidden" : ""}`}>
        <div
          ref={host}
          className="dieline-preview absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={fit}
        />
        {view === "flat" && d.model3d.faces.length > 0 && (
          <Inset label="3D" onClick={() => setView("3d")}>
            <Fold3D model={d.model3d} mini />
          </Inset>
        )}
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

/** What was found in an uploaded PDF, with any problems in its dieline and the offer to correct them. */
function UploadPanel({ upload, corrected, onAnswer, onClose }: { upload: UploadResult; corrected: boolean | null; onAnswer: (v: boolean) => void; onClose: () => void }) {
  return (
    <div className="absolute bottom-3 left-3 z-10 w-[min(92%,380px)] rounded-md border border-rule bg-paper p-3 text-[12px] leading-relaxed shadow-sm" role="status">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-medium">{upload.fileName}</p>
        <button type="button" onClick={onClose} className="shrink-0 text-mute hover:text-ink" aria-label="Close the uploaded design">
          Back to my carton
        </button>
      </div>
      {!upload.ok ? (
        <p className="mt-1 text-danger">{upload.reason}</p>
      ) : (
        <>
          <p className="mt-1 text-mute">Matched: {upload.label}</p>
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
              <p className="mt-1">Correct the dieline? The 3D view and the corrected dieline use the app&apos;s construction at your file&apos;s size.</p>
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
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => downloadDieline("pdf", upload.dieline, { projectName: `${upload.fileName.replace(/\.pdf$/i, "")} corrected`, version: null, author: null }, new Set(LAYER_ORDER))}
              >
                Download the corrected dieline
              </button>
            </p>
          )}
          {corrected === false && <p className="mt-2 text-mute">Kept as drawn. The 3D view folds the app&apos;s construction at your size; your file&apos;s problems are listed above when you upload it again.</p>}
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
      title={label === "3D" ? "Open the 3D view" : "Back to the flat dieline"}
      className="absolute left-3 top-3 z-10 h-[110px] w-[150px] cursor-pointer bg-transparent transition-opacity hover:opacity-80 sm:h-[200px] sm:w-[300px]"
    >
      {children}
    </button>
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
