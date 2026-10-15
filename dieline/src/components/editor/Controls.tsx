"use client";

import { BOARDS, boardById } from "@/lib/dieline/boards";
import { STYLE_NAMES } from "@/lib/dieline/export/common";
import { CODING_PRESETS } from "@/lib/dieline/pharma";
import type { Align, CartonParams, CodingPreset, Dieline, PanelId, StyleId } from "@/lib/dieline/types";
import { NumberField, Section, Segmented, Select, TextField, Toggle, Button } from "../ui";
import { StyleIcon } from "./StyleIcon";

type Set = (patch: Partial<CartonParams>) => void;

const STYLES: StyleId[] = ["rte", "ste", "crash", "snap"];

const PANEL_NAMES: Record<PanelId, string> = {
  front: "Front",
  sideA: "Side A",
  back: "Back",
  sideB: "Side B",
  topLid: "Top lid",
  bottomLid: "Bottom lid",
  glueFlap: "Glue flap",
  topTuck: "Top tuck",
  bottomTuck: "Bottom tuck",
};

const ALIGN: { value: Align; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Middle" },
  { value: "bottom", label: "Bottom" },
];

export function Controls({ p, d, set, onOpenContents }: { p: CartonParams; d: Dieline; set: Set; onOpenContents: () => void }) {
  const r = d.resolved;
  const panelOptions = d.panels.map((q) => ({ value: q.id, label: PANEL_NAMES[q.id] }));
  const tuckEnd = p.style === "rte" || p.style === "ste";
  const board = boardById(p.boardId);

  return (
    <div>
      <Section title="Carton style">
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set({ style: s })}
              className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-center transition ${p.style === s ? "border-ink bg-paper" : "border-rule bg-paper/50 text-mute hover:border-ink hover:text-ink"}`}
              aria-pressed={p.style === s}
            >
              <StyleIcon style={s} />
              <span className="text-[12px] leading-tight">{STYLE_NAMES[s].name}</span>
            </button>
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-mute">{STYLE_NAMES[p.style].ecma}</p>
      </Section>

      <Section title="Size">
        <Segmented
          value={p.dimMode}
          onChange={(v) => set({ dimMode: v })}
          options={[
            { value: "inside", label: "Inside" },
            { value: "outside", label: "Outside" },
          ]}
        />
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Length" value={p.L} onChange={(v) => set({ L: v ?? p.L })} hint="Front panel width" />
          <NumberField label="Width" value={p.W} onChange={(v) => set({ W: v ?? p.W })} hint="Side panel width (depth)" />
          <NumberField label="Height" value={p.H} onChange={(v) => set({ H: v ?? p.H })} />
        </div>
        <Button onClick={onOpenContents} className="w-full">
          Size from blister + leaflet
        </Button>
      </Section>

      <Section title="Board">
        <Select
          label="Material"
          value={board ? p.boardId : "custom"}
          onChange={(id) => {
            const b = boardById(id);
            if (b) set({ boardId: b.id, caliper: b.caliper, gsm: b.gsm });
            else set({ boardId: "custom" });
          }}
          options={[...BOARDS.map((b) => ({ value: b.id, label: b.name })), { value: "custom", label: "Custom board" }]}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Caliper" value={p.caliper} step={0.01} onChange={(v) => set({ caliper: v ?? p.caliper, boardId: board && v !== board.caliper ? "custom" : p.boardId })} hint="Board thickness from the supplier's data sheet" />
          <NumberField label="Grammage" unit="g/m²" value={p.gsm} step={1} onChange={(v) => set({ gsm: v ?? p.gsm })} />
        </div>
        <Segmented
          label="Grain direction"
          value={p.grain}
          onChange={(v) => set({ grain: v })}
          options={[
            { value: "horizontal", label: "Around the carton" },
            { value: "vertical", label: "Along the height" },
          ]}
        />
      </Section>

      <Section title="Closures">
        <Segmented
          label="Tuck lock"
          value={p.lock}
          onChange={(v) => set({ lock: v })}
          options={[
            { value: "slit", label: "Slit lock" },
            { value: "friction", label: "Friction" },
            { value: "none", label: "Plain" },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Tuck depth" auto value={p.tuckDepth} resolved={r.tuckDepth} onChange={(v) => set({ tuckDepth: v })} />
          <NumberField label="Tuck corner radius" auto value={p.tuckRadius} resolved={r.tuckRadius} onChange={(v) => set({ tuckRadius: v })} />
          {p.lock === "slit" && <NumberField label="Slit length" auto value={p.slitLength} resolved={r.slitLength} onChange={(v) => set({ slitLength: v })} />}
          <NumberField label="Dust flap depth" auto value={p.dustDepth} resolved={r.dustDepth} onChange={(v) => set({ dustDepth: v })} />
          <NumberField label="Glue flap width" auto value={p.glueWidth} resolved={r.glueWidth} onChange={(v) => set({ glueWidth: v })} />
          <NumberField label="Glue flap angle" unit="°" step={1} auto value={p.glueAngle} resolved={r.glueAngle} onChange={(v) => set({ glueAngle: v })} />
          {!tuckEnd && <NumberField label="Base lock reach" auto value={p.bottomExtension} resolved={r.bottomExtension} onChange={(v) => set({ bottomExtension: v })} hint="How far the base flaps reach past the centre line" />}
        </div>
      </Section>

      <Section title="Tamper evidence" defaultOpen={false}>
        <Segmented
          value={p.tamper}
          onChange={(v) => set({ tamper: v })}
          options={[
            { value: "none", label: "None" },
            { value: "glueTuck", label: "Glued tuck" },
            { value: "tearStrip", label: "Tear strip" },
          ]}
        />
        <p className="text-[12px] leading-relaxed text-mute">
          {p.tamper === "glueTuck" && "The top tuck is glued and perforated: opening tears it, leaving visible evidence."}
          {p.tamper === "tearStrip" && "Two perforations across the top lid with a thumb notch; the tuck is glued, so the strip must be torn to open."}
          {p.tamper === "none" && "Plain closure, no evidence of opening."}
        </p>
      </Section>

      <Section title="Braille" defaultOpen={p.braille.enabled} aside={p.braille.enabled ? <Dot /> : null}>
        <Toggle label="Add Braille (Marburg Medium)" checked={p.braille.enabled} onChange={(v) => set({ braille: { ...p.braille, enabled: v } })} />
        {p.braille.enabled && (
          <>
            <TextField label="Text" value={p.braille.text} placeholder="e.g. Paracétamol 500 mg" onChange={(v) => set({ braille: { ...p.braille, text: v } })} />
            <div className="grid grid-cols-2 gap-2">
              <Select label="Panel" value={p.braille.panel} options={panelOptions} onChange={(v) => set({ braille: { ...p.braille, panel: v } })} />
              <Select
                label="Direction"
                value={p.braille.orientation}
                options={[
                  { value: "horizontal", label: "Across" },
                  { value: "vertical", label: "Along height" },
                ]}
                onChange={(v) => set({ braille: { ...p.braille, orientation: v } })}
              />
            </div>
            <Segmented label="Position" value={p.braille.align} options={ALIGN} onChange={(v) => set({ braille: { ...p.braille, align: v } })} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Shift right" value={p.braille.offsetX} onChange={(v) => set({ braille: { ...p.braille, offsetX: v ?? 0 } })} />
              <NumberField label="Shift down" value={p.braille.offsetY} onChange={(v) => set({ braille: { ...p.braille, offsetY: v ?? 0 } })} />
            </div>
          </>
        )}
      </Section>

      <Section title="Coding window" defaultOpen={p.codingWindow.enabled} aside={p.codingWindow.enabled ? <Dot /> : null}>
        <Toggle label="Varnish-free coding area" checked={p.codingWindow.enabled} onChange={(v) => set({ codingWindow: { ...p.codingWindow, enabled: v } })} />
        {p.codingWindow.enabled && (
          <>
            <Select
              label="Content"
              value={p.codingWindow.preset}
              options={(Object.keys(CODING_PRESETS) as CodingPreset[]).map((k) => ({
                value: k,
                label: k === "custom" ? CODING_PRESETS[k].label : `${CODING_PRESETS[k].label} (${CODING_PRESETS[k].width} × ${CODING_PRESETS[k].height})`,
              }))}
              onChange={(v) => set({ codingWindow: { ...p.codingWindow, preset: v } })}
            />
            {p.codingWindow.preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Width" value={p.codingWindow.width} onChange={(v) => set({ codingWindow: { ...p.codingWindow, width: v ?? 40 } })} />
                <NumberField label="Height" value={p.codingWindow.height} onChange={(v) => set({ codingWindow: { ...p.codingWindow, height: v ?? 18 } })} />
              </div>
            )}
            <Select label="Panel" value={p.codingWindow.panel} options={panelOptions} onChange={(v) => set({ codingWindow: { ...p.codingWindow, panel: v } })} />
            <Segmented label="Position" value={p.codingWindow.align} options={ALIGN} onChange={(v) => set({ codingWindow: { ...p.codingWindow, align: v } })} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Shift right" value={p.codingWindow.offsetX} onChange={(v) => set({ codingWindow: { ...p.codingWindow, offsetX: v ?? 0 } })} />
              <NumberField label="Shift down" value={p.codingWindow.offsetY} onChange={(v) => set({ codingWindow: { ...p.codingWindow, offsetY: v ?? 0 } })} />
            </div>
          </>
        )}
      </Section>

      <Section title="Pharmacode" defaultOpen={p.pharmacode.enabled} aside={p.pharmacode.enabled ? <Dot /> : null}>
        <Toggle label="Pharmacode zone" checked={p.pharmacode.enabled} onChange={(v) => set({ pharmacode: { ...p.pharmacode, enabled: v } })} />
        {p.pharmacode.enabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Length" value={p.pharmacode.width} onChange={(v) => set({ pharmacode: { ...p.pharmacode, width: v ?? 30 } })} />
              <NumberField label="Bar height" value={p.pharmacode.height} onChange={(v) => set({ pharmacode: { ...p.pharmacode, height: v ?? 8 } })} />
            </div>
            <Select label="Panel" value={p.pharmacode.panel} options={panelOptions} onChange={(v) => set({ pharmacode: { ...p.pharmacode, panel: v } })} />
            <Segmented label="Position" value={p.pharmacode.align} options={ALIGN} onChange={(v) => set({ pharmacode: { ...p.pharmacode, align: v } })} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Shift right" value={p.pharmacode.offsetX} onChange={(v) => set({ pharmacode: { ...p.pharmacode, offsetX: v ?? 0 } })} />
              <NumberField label="Shift down" value={p.pharmacode.offsetY} onChange={(v) => set({ pharmacode: { ...p.pharmacode, offsetY: v ?? 0 } })} />
            </div>
          </>
        )}
      </Section>

      <Section title="Print setup" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Bleed" value={p.bleed} onChange={(v) => set({ bleed: v ?? 0 })} />
          <NumberField label="Safe margin" value={p.safeMargin} onChange={(v) => set({ safeMargin: v ?? 0 })} hint="Keep text this far from creases and cuts" />
        </div>
        <Toggle label="Show dimensions" checked={p.showDimensions} onChange={(v) => set({ showDimensions: v })} />
      </Section>
    </div>
  );
}

function Dot() {
  return <span className="h-2 w-2 rounded-full bg-accent-dark" aria-label="On" />;
}
