"use client";

import { useState } from "react";
import { DEFAULT_CONTENTS, sizeFromContents, type ContentsInput } from "@/lib/dieline/sizing";
import { Button, NumberField } from "../ui";

export function ContentsDialog({ onClose, onApply }: { onClose: () => void; onApply: (dims: { L: number; W: number; H: number }) => void }) {
  const [c, setC] = useState<ContentsInput>(DEFAULT_CONTENTS);
  const out = sizeFromContents(c);
  const f = (k: keyof ContentsInput, label: string, unit = "mm") => (
    <NumberField label={label} unit={unit} step={k === "blisterCount" ? 1 : 0.1} value={c[k]} onChange={(v) => setC({ ...c, [k]: v ?? 0 })} />
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal aria-label="Size from contents" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-bone p-5 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[18px] font-medium">Size from contents</h2>
        <p className="mt-1 text-[13px] text-mute">Blisters stand on their long edge, stacked face to face, with the folded leaflet in front.</p>
        <h3 className="mt-4 font-mono text-[11px] uppercase tracking-wider">Blister</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {f("blisterLength", "Length")}
          {f("blisterWidth", "Width")}
          {f("blisterThickness", "Thickness")}
          {f("blisterCount", "Number of blisters", "pcs")}
        </div>
        <h3 className="mt-4 font-mono text-[11px] uppercase tracking-wider">Folded leaflet</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {f("leafletLength", "Length")}
          {f("leafletWidth", "Width")}
          {f("leafletThickness", "Thickness")}
        </div>
        <h3 className="mt-4 font-mono text-[11px] uppercase tracking-wider">Clearance</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {f("clearL", "Length")}
          {f("clearW", "Width")}
          {f("clearH", "Height")}
        </div>
        <div className="mt-5 rounded-md border border-rule bg-paper p-3">
          <p className="text-[12px] text-mute">Inside dimensions</p>
          <p className="font-mono text-[18px]">
            {out.L} × {out.W} × {out.H} mm
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onApply(out)}>
            Use these dimensions
          </Button>
        </div>
      </div>
    </div>
  );
}
