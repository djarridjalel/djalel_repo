"use client";

import type { FlapKind, FoldView } from "@/lib/dieline/fold";
import type { CartonParams, Dieline } from "@/lib/dieline/types";

const ICON = {
  error: { c: "text-danger", bg: "bg-danger/8", label: "Blocking" },
  warning: { c: "text-warn", bg: "bg-accent/15", label: "Check" },
  info: { c: "text-mute", bg: "bg-bone", label: "Note" },
};

export function Checks({ d, set }: { d: Dieline; set: (patch: Partial<CartonParams>) => void }) {
  if (!d.issues.length) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-rule bg-paper p-3">
        <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#00A651]" />
        <p className="text-[13px] leading-relaxed">All checks passed. The structure is consistent for these dimensions and this board.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {d.issues.map((it, i) => {
        const s = ICON[it.severity];
        return (
          <li key={i} data-severity={it.severity} className={`rounded-md border border-rule p-3 ${s.bg}`}>
            <p className={`mb-1 font-mono text-[10px] uppercase tracking-wider ${s.c}`}>{s.label}</p>
            <p className="text-[13px] leading-relaxed">{it.message}</p>
            {it.fix && (
              <button
                type="button"
                onClick={() => set({ [it.fix!.field]: it.fix!.value } as Partial<CartonParams>)}
                className="mt-2 rounded border border-ink px-2.5 py-1 text-[12px] font-medium hover:bg-ink hover:text-paper"
              >
                {it.fix.label}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Stats({ d }: { d: Dieline }) {
  const s = d.stats;
  const rows: [string, string][] = [
    ["Flat size", `${s.flatWidth} × ${s.flatHeight} mm`],
    ["Cutting rule", `${s.cutLength} mm`],
    ["Creasing rule", `${s.creaseLength} mm`],
    ...(s.perfLength ? ([["Perforation", `${s.perfLength} mm`]] as [string, string][]) : []),
    ["Blank area", `${s.blankArea} cm²`],
    ["Board use", `${s.utilization} %`],
    ["Blank weight", `${s.blankWeight} g`],
  ];
  return (
    <dl className="divide-y divide-rule rounded-md border border-rule bg-paper">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between px-3 py-2">
          <dt className="text-[12px] text-mute">{k}</dt>
          <dd className="font-mono text-[13px]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const FLAP_STYLE: Record<FlapKind, { fill: string; stroke: string; label: string }> = {
  lid: { fill: "#1f6feb", stroke: "#1f6feb", label: "Lid" },
  dust: { fill: "#6b6b6b", stroke: "#555", label: "Dust flaps" },
  main: { fill: "#1f6feb", stroke: "#1f6feb", label: "Base flaps" },
  side: { fill: "#6b6b6b", stroke: "#555", label: "Side flaps" },
  notch: { fill: "#1f6feb", stroke: "#1f6feb", label: "Notch flap" },
  tongue: { fill: "#f39200", stroke: "#b86e00", label: "Tongue flap" },
  hook: { fill: "#6b6b6b", stroke: "#555", label: "Hooks" },
  roof: { fill: "#00a3a1", stroke: "#007b7a", label: "Roofs" },
};

function FoldPicture({ v }: { v: FoldView }) {
  const pad = Math.max(v.Lb, v.Wb) * 0.04;
  const Y = (y: number) => v.Wb - y;
  const path = (pts: { x: number; y: number }[], close = true) => "M" + pts.map((q) => `${q.x.toFixed(2)} ${Y(q.y).toFixed(2)}`).join("L") + (close ? "Z" : "");
  const kinds = Array.from(new Set(v.flaps.map((f) => f.kind)));
  return (
    <figure className="rounded-md border border-rule bg-paper p-3">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className="font-medium">{v.title}</span>
        <span className="flex flex-wrap gap-2 text-mute">
          {kinds.map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: FLAP_STYLE[k].fill, opacity: 0.6 }} />
              {FLAP_STYLE[k].label}
            </span>
          ))}
        </span>
      </figcaption>
      {v.note && <p className="mb-2 text-[12px] leading-relaxed text-mute">{v.note} Dashed shapes are tucked out of sight.</p>}
      <svg viewBox={`${-pad} ${-pad} ${v.Lb + 2 * pad} ${v.Wb + 2 * pad}`} className="mx-auto block max-h-56 w-full" role="img" aria-label={v.title}>
        <rect x={0} y={0} width={v.Lb} height={v.Wb} fill="none" stroke="currentColor" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
        {v.flaps.map((f, i) => (
          <path key={i} d={path(f.poly)} fill={FLAP_STYLE[f.kind].fill} fillOpacity={0.22} stroke={FLAP_STYLE[f.kind].stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {v.marks.map((m, i) =>
          m.kind === "centre" ? (
            <path key={`m${i}`} d={path(m.pts, false)} fill="none" stroke="#b00020" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          ) : m.kind === "hidden" ? (
            <path key={`m${i}`} d={path(m.pts)} fill="#6b6b6b" fillOpacity={0.12} stroke="#555" strokeWidth={1} strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
          ) : (
            <path key={`m${i}`} d={path(m.pts)} fill="none" stroke="#b86e00" strokeWidth={2} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
          ),
        )}
        <text x={v.Lb / 2} y={v.Wb + pad * 0.85} textAnchor="middle" fontSize={Math.max(v.Lb, v.Wb) * 0.045} fill="currentColor" opacity={0.6}>
          FRONT
        </text>
      </svg>
    </figure>
  );
}

/** Each closure folded flat, with the measurements that decide whether it closes and locks. */
export function ClosingCheck({ d }: { d: Dieline }) {
  const { views, checks } = d.fold;
  if (!checks.length) return null;
  const failed = checks.filter((c) => !c.ok).length;
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-mute">
        Each closure folded flat on its opening, as if the carton were closed. {failed ? `${failed} of ${checks.length} checks need attention.` : `All ${checks.length} checks pass.`}
      </p>
      {views.map((v) => (
        <FoldPicture key={v.id} v={v} />
      ))}
      <ul className="divide-y divide-rule rounded-md border border-rule bg-paper">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3 px-3 py-2" data-fold-check={c.ok ? "ok" : "fail"}>
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-[#00A651]" : c.severity === "error" ? "bg-danger" : "bg-warn"}`} />
            <div className="min-w-0">
              <p className="text-[13px]">
                <span className="font-mono text-[11px] uppercase tracking-wider text-mute">{c.closure} · </span>
                {c.label}
              </p>
              <p className="text-[12px] leading-relaxed text-mute">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
