"use client";

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
