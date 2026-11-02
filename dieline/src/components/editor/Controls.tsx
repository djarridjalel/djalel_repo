"use client";

import { BOARDS, boardById } from "@/lib/dieline/boards";
import { STYLE_NAMES } from "@/lib/dieline/export/common";
import { DEFAULT_PARAMS, generate } from "@/lib/dieline";
import { CODING_PRESETS } from "@/lib/dieline/pharma";
import {
  hasTopLid,
  isTray,
  isTube,
  type Align,
  type CartonParams,
  type CodingPreset,
  type Dieline,
  type StyleId,
} from "@/lib/dieline/types";
import {
  NumberField,
  Section,
  Segmented,
  Select,
  TextField,
  Toggle,
  Button,
} from "../ui";
import { useEffect, useState } from "react";
import { FOCUS_EVENT } from "../ui";
import { StyleIcon } from "./StyleIcon";

type Set = (patch: Partial<CartonParams>) => void;

/** Starting sizes for styles whose proportions differ from a small folding carton. */
const STYLE_SIZES: Partial<Record<StyleId, Pick<CartonParams, "L" | "W" | "H">>> = {
  // Crash-lock bottoms need the length clearly greater than the width.
  crash: { L: 60, W: 40, H: 120 },
  srp: { L: 150, W: 100, H: 80 },
  srpSnap: { L: 150, W: 100, H: 80 },
  gable: { L: 120, W: 80, H: 100 },
  mailer: { L: 220, W: 160, H: 60 },
  display: { L: 200, W: 120, H: 40 },
};

/**
 * Switches style. A size that is still some style's starting size (not one the
 * user typed) follows the new style's starting size, back to the studio default
 * for the tuck-end cartons; a size the user typed is kept unless it cannot be
 * built in the new style.
 */
function styleChange(p: CartonParams, style: StyleId): Partial<CartonParams> {
  const start = (s: StyleId) => STYLE_SIZES[s] ?? { L: DEFAULT_PARAMS.L, W: DEFAULT_PARAMS.W, H: DEFAULT_PARAMS.H };
  const size = start(style);
  const presets = [{ L: DEFAULT_PARAMS.L, W: DEFAULT_PARAMS.W, H: DEFAULT_PARAMS.H }, ...Object.values(STYLE_SIZES)];
  const untouched = presets.some((q) => q && p.L === q.L && p.W === q.W && p.H === q.H);
  if (untouched) return { style, ...size };
  const issues = generate({ ...p, style }).issues;
  const unsuited = issues.some((i) => i.severity === "error" || (i.severity === "warning" && ["L", "W", "H"].includes(String(i.field))));
  return unsuited ? { style, ...size } : { style };
}

const STYLES: StyleId[] = [
  "rte",
  "ste",
  "crash",
  "snap",
  "srp",
  "srpSnap",
  "gable",
  "mailer",
  "display",
];

const ALIGN: { value: Align; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Middle" },
  { value: "bottom", label: "Bottom" },
];

export function Controls({
  p,
  d,
  set,
  onOpenContents,
}: {
  p: CartonParams;
  d: Dieline;
  set: Set;
  onOpenContents: () => void;
}) {
  const r = d.resolved;
  const panelOptions = d.panels
    .filter((q, i) => d.panels.findIndex((o) => o.id === q.id) === i)
    .map((q) => ({ value: q.id, label: q.name }));
  const tuckEnd = p.style === "rte" || p.style === "ste";
  const lid = hasTopLid(p.style);
  const tube = isTube(p.style);
  const sizeHints: Record<string, [string, string, string]> = {
    display: ["Inside width", "Inside depth", "Front wall height"],
    srp: ["Front panel width", "Side panel width (depth)", "Height"],
    srpSnap: ["Front panel width", "Side panel width (depth)", "Height"],
  };
  const [hL, hW, hH] = sizeHints[p.style] ?? [
    "Front panel width",
    "Side panel width (depth)",
    "",
  ];
  const board = boardById(p.boardId);
  useFocusScroll();

  return (
    <div>
      <Section title="Carton style">
        <StylePicker value={p.style} onPick={(s) => set(styleChange(p, s))} />
      </Section>

      <Section title="Size" summary={`${p.dimMode === "inside" ? "Inside" : "Outside"} ${p.L} × ${p.W} × ${p.H} mm`}>
        <Segmented
          value={p.dimMode}
          onChange={(v) => set({ dimMode: v })}
          options={[
            { value: "inside", label: "Inside" },
            { value: "outside", label: "Outside" },
          ]}
        />
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            field="L"
            label="Length"
            value={p.L}
            onChange={(v) => set({ L: v ?? p.L })}
            hint={hL}
          />
          <NumberField
            field="W"
            label="Width"
            value={p.W}
            onChange={(v) => set({ W: v ?? p.W })}
            hint={hW}
          />
          <NumberField
            field="H"
            label="Height"
            value={p.H}
            onChange={(v) => set({ H: v ?? p.H })}
            hint={hH || undefined}
          />
        </div>
        <Button onClick={onOpenContents} className="w-full">
          Size from blister + leaflet
        </Button>
      </Section>

      <Section title="Board" summary={`${board?.name ?? "Custom"} · ${p.caliper} mm`}>
        <Select
          label="Material"
          value={board ? p.boardId : "custom"}
          onChange={(id) => {
            const b = boardById(id);
            if (b) set({ boardId: b.id, caliper: b.caliper, gsm: b.gsm });
            else set({ boardId: "custom" });
          }}
          options={[
            ...BOARDS.map((b) => ({ value: b.id, label: b.name })),
            { value: "custom", label: "Custom board" },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            field="caliper"
            label="Caliper"
            value={p.caliper}
            step={0.01}
            onChange={(v) =>
              set({
                caliper: v ?? p.caliper,
                boardId: board && v !== board.caliper ? "custom" : p.boardId,
              })
            }
            hint="Board thickness from the supplier's data sheet"
          />
          <NumberField
            field="gsm"
            label="Grammage"
            unit="g/m²"
            value={p.gsm}
            step={1}
            onChange={(v) => set({ gsm: v ?? p.gsm })}
          />
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

      {lid && (
        <Section title="Closures" summary={`${p.lock === "slit" ? "Slit lock" : p.lock === "friction" ? "Friction" : "Plain"} · tuck ${fmt(r.tuckDepth)} mm`}>
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
          <Toggle
            label="Lock tab through the lid fold"
            checked={p.lockTab}
            onChange={(v) => set({ lockTab: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="tuckDepth"
            label="Tuck depth"
              auto
              value={p.tuckDepth}
              resolved={r.tuckDepth}
              onChange={(v) => set({ tuckDepth: v })}
            />
            <NumberField
              field="tuckRadius"
            label="Tuck corner radius"
              auto
              value={p.tuckRadius}
              resolved={r.tuckRadius}
              onChange={(v) => set({ tuckRadius: v })}
            />
            {p.lock === "slit" && (
              <NumberField
                field="slitLength"
            label="Slit length"
                auto
                value={p.slitLength}
                resolved={r.slitLength}
                onChange={(v) => set({ slitLength: v })}
              />
            )}
            <NumberField
              field="glueWidth"
              label="Glue flap width"
              auto
              value={p.glueWidth}
              resolved={r.glueWidth}
              onChange={(v) => set({ glueWidth: v })}
            />
            <NumberField
              field="glueAngle"
            label="Glue flap angle"
              unit="°"
              step={1}
              auto
              value={p.glueAngle}
              resolved={r.glueAngle}
              onChange={(v) => set({ glueAngle: v })}
            />
            {!tuckEnd && (
              <NumberField
                field="bottomExtension"
              label="Base lock reach"
                auto
                value={p.bottomExtension}
                resolved={r.bottomExtension}
                onChange={(v) => set({ bottomExtension: v })}
                hint="How far the base flaps reach past the centre line"
              />
            )}
          </div>
        </Section>
      )}

      {p.style === "gable" && (
        <Section title="Handle" summary={`Handle ${p.gable.handleHeight} mm`}>
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              field="gable.handleHeight"
            label="Handle height"
              value={p.gable.handleHeight}
              onChange={(v) =>
                set({ gable: { ...p.gable, handleHeight: v ?? 40 } })
              }
            />
            <NumberField
              label="Hole width"
              value={p.gable.holeWidth}
              onChange={(v) =>
                set({ gable: { ...p.gable, holeWidth: v ?? 70 } })
              }
            />
            <NumberField
              label="Hole height"
              value={p.gable.holeHeight}
              onChange={(v) =>
                set({ gable: { ...p.gable, holeHeight: v ?? 24 } })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="glueWidth"
              label="Glue flap width"
              auto
              value={p.glueWidth}
              resolved={r.glueWidth}
              onChange={(v) => set({ glueWidth: v })}
            />
            <NumberField
              field="bottomExtension"
              label="Base lock reach"
              auto
              value={p.bottomExtension}
              resolved={r.bottomExtension}
              onChange={(v) => set({ bottomExtension: v })}
              hint="How far the base flaps reach past the centre line"
            />
          </div>
          <p className="text-[12px] leading-relaxed text-mute">
            The roofs meet in the middle and the two handles are glued back to
            back; their ends slide into the slots in the gable ends.
          </p>
        </Section>
      )}

      {isTray(p.style) && (
        <Section title="Tear-away front" summary={`Tear depth ${fmt(r.tearDepth)} mm`}>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="srp.tearDepth"
            label="Tear depth"
              value={p.srp.tearDepth}
              onChange={(v) => set({ srp: { ...p.srp, tearDepth: v ?? 0 } })}
              hint="From the top; 0 for half the height"
            />
            <NumberField
              label="Finger opening"
              value={p.srp.fingerWidth}
              onChange={(v) => set({ srp: { ...p.srp, fingerWidth: v ?? 0 } })}
              hint="0 for a straight tear"
            />
          </div>
          <p className="text-[12px] leading-relaxed text-mute">
            The front tears off along the perforation, down both sides from the
            back corners. The lid folds back on its middle crease.
          </p>
        </Section>
      )}

      {p.style === "display" && (
        <Section title="Display" summary={`Header ${p.display.header} mm`}>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="display.rise"
            label="Side rise"
              value={p.display.rise}
              onChange={(v) => set({ display: { ...p.display, rise: v ?? 0 } })}
              hint="Extra side height at the back"
            />
            <NumberField
              field="display.header"
            label="Header"
              value={p.display.header}
              onChange={(v) =>
                set({ display: { ...p.display, header: v ?? 0 } })
              }
              hint="Header card above the back, 0 for none"
            />
          </div>
        </Section>
      )}


      {lid && (
        <Section title="Tamper evidence" defaultOpen={false} summary={p.tamper === "none" ? "None" : p.tamper === "glueTuck" ? "Glued tuck" : "Tear strip"}>
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
            {p.tamper === "glueTuck" &&
              "The top tuck is glued and perforated: opening tears it, leaving visible evidence."}
            {p.tamper === "tearStrip" &&
              "Two perforations across the top lid with a thumb notch; the tuck is glued, so the strip must be torn to open."}
            {p.tamper === "none" && "Plain closure, no evidence of opening."}
          </p>
        </Section>
      )}

      {lid && (
        <Section
          title="Hang tab"
        summary={p.hangTab.enabled ? (p.hangTab.slot === "euro" ? "Euro slot" : "Round hole") : "Off"}
          defaultOpen={p.hangTab.enabled}
          aside={p.hangTab.enabled ? <Dot /> : null}
        >
          <Toggle
            label="Hanger above the front panel"
            checked={p.hangTab.enabled}
            onChange={(v) => set({ hangTab: { ...p.hangTab, enabled: v } })}
          />
          {p.hangTab.enabled && (
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Hanger height"
                value={p.hangTab.height}
                onChange={(v) =>
                  set({ hangTab: { ...p.hangTab, height: v ?? 25 } })
                }
                hint="Each of the two layers"
              />
              <Select
                label="Hole"
                value={p.hangTab.slot}
                options={[
                  { value: "euro", label: "Euro slot" },
                  { value: "round", label: "Round hole" },
                ]}
                onChange={(v) => set({ hangTab: { ...p.hangTab, slot: v } })}
              />
            </div>
          )}
        </Section>
      )}

      <Section
        title="Window"
        summary={p.window.enabled ? `${p.window.width} × ${p.window.height} mm` : "Off"}
        defaultOpen={p.window.enabled}
        aside={p.window.enabled ? <Dot /> : null}
      >
        <Toggle
          label="Window cut-out"
          checked={p.window.enabled}
          onChange={(v) => set({ window: { ...p.window, enabled: v } })}
        />
        {p.window.enabled && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="Width"
                value={p.window.width}
                onChange={(v) =>
                  set({ window: { ...p.window, width: v ?? 30 } })
                }
              />
              <NumberField
                label="Height"
                value={p.window.height}
                onChange={(v) =>
                  set({ window: { ...p.window, height: v ?? 40 } })
                }
              />
              <NumberField
                label="Corner"
                value={p.window.radius}
                onChange={(v) =>
                  set({ window: { ...p.window, radius: v ?? 0 } })
                }
              />
            </div>
            <Select
              label="Panel"
              value={p.window.panel}
              options={panelOptions}
              onChange={(v) => set({ window: { ...p.window, panel: v } })}
            />
            <Segmented
              label="Position"
              value={p.window.align}
              options={ALIGN}
              onChange={(v) => set({ window: { ...p.window, align: v } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Shift right"
                value={p.window.offsetX}
                onChange={(v) =>
                  set({ window: { ...p.window, offsetX: v ?? 0 } })
                }
              />
              <NumberField
                label="Shift down"
                value={p.window.offsetY}
                onChange={(v) =>
                  set({ window: { ...p.window, offsetY: v ?? 0 } })
                }
              />
            </div>
          </>
        )}
      </Section>

      {tube && (
        <Section
          title="Zip opening"
        summary={p.zipStrip.enabled ? `${p.zipStrip.width} mm strip` : "Off"}
          defaultOpen={p.zipStrip.enabled}
          aside={p.zipStrip.enabled ? <Dot /> : null}
        >
          <Toggle
            label="Zip strip round the body"
            checked={p.zipStrip.enabled}
            onChange={(v) => set({ zipStrip: { ...p.zipStrip, enabled: v } })}
          />
          {p.zipStrip.enabled && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="From the top"
                  value={p.zipStrip.fromTop}
                  onChange={(v) =>
                    set({ zipStrip: { ...p.zipStrip, fromTop: v ?? 15 } })
                  }
                />
                <NumberField
                  label="Strip width"
                  value={p.zipStrip.width}
                  onChange={(v) =>
                    set({ zipStrip: { ...p.zipStrip, width: v ?? 6 } })
                  }
                />
              </div>
              <p className="text-[12px] leading-relaxed text-mute">
                Opened from the pull tab on the free edge of the front panel.
                Glue the top closure for tamper evidence.
              </p>
            </>
          )}
        </Section>
      )}

      <Section
        title="Dispenser opening"
        summary={p.dispenser.enabled ? `${p.dispenser.width} × ${p.dispenser.height} mm` : "Off"}
        defaultOpen={p.dispenser.enabled}
        aside={p.dispenser.enabled ? <Dot /> : null}
      >
        <Toggle
          label="Perforated push-in opening"
          checked={p.dispenser.enabled}
          onChange={(v) => set({ dispenser: { ...p.dispenser, enabled: v } })}
        />
        {p.dispenser.enabled && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label="Width"
                value={p.dispenser.width}
                onChange={(v) =>
                  set({ dispenser: { ...p.dispenser, width: v ?? 40 } })
                }
              />
              <NumberField
                label="Height"
                value={p.dispenser.height}
                onChange={(v) =>
                  set({ dispenser: { ...p.dispenser, height: v ?? 30 } })
                }
              />
              <NumberField
                label="From bottom"
                value={p.dispenser.fromBottom}
                onChange={(v) =>
                  set({ dispenser: { ...p.dispenser, fromBottom: v ?? 12 } })
                }
              />
            </div>
            <Select
              label="Panel"
              value={p.dispenser.panel}
              options={panelOptions}
              onChange={(v) => set({ dispenser: { ...p.dispenser, panel: v } })}
            />
          </>
        )}
      </Section>

      <Section
        title="Braille"
        summary={p.braille.enabled ? p.braille.text || "No text yet" : "Off"}
        defaultOpen={p.braille.enabled}
        aside={p.braille.enabled ? <Dot /> : null}
      >
        <Toggle
          label="Add Braille (Marburg Medium)"
          checked={p.braille.enabled}
          onChange={(v) => set({ braille: { ...p.braille, enabled: v } })}
        />
        {p.braille.enabled && (
          <>
            <TextField
              label="Text"
              value={p.braille.text}
              placeholder="e.g. Paracétamol 500 mg"
              onChange={(v) => set({ braille: { ...p.braille, text: v } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Panel"
                value={p.braille.panel}
                options={panelOptions}
                onChange={(v) => set({ braille: { ...p.braille, panel: v } })}
              />
              <Select
                label="Direction"
                value={p.braille.orientation}
                options={[
                  { value: "horizontal", label: "Across" },
                  { value: "vertical", label: "Along height" },
                ]}
                onChange={(v) =>
                  set({ braille: { ...p.braille, orientation: v } })
                }
              />
            </div>
            <Segmented
              label="Position"
              value={p.braille.align}
              options={ALIGN}
              onChange={(v) => set({ braille: { ...p.braille, align: v } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Shift right"
                value={p.braille.offsetX}
                onChange={(v) =>
                  set({ braille: { ...p.braille, offsetX: v ?? 0 } })
                }
              />
              <NumberField
                label="Shift down"
                value={p.braille.offsetY}
                onChange={(v) =>
                  set({ braille: { ...p.braille, offsetY: v ?? 0 } })
                }
              />
            </div>
          </>
        )}
      </Section>

      <Section
        title="Coding window"
        summary={p.codingWindow.enabled ? CODING_PRESETS[p.codingWindow.preset].label : "Off"}
        defaultOpen={p.codingWindow.enabled}
        aside={p.codingWindow.enabled ? <Dot /> : null}
      >
        <Toggle
          label="Varnish-free coding area"
          checked={p.codingWindow.enabled}
          onChange={(v) =>
            set({ codingWindow: { ...p.codingWindow, enabled: v } })
          }
        />
        {p.codingWindow.enabled && (
          <>
            <Select
              label="Content"
              value={p.codingWindow.preset}
              options={(Object.keys(CODING_PRESETS) as CodingPreset[]).map(
                (k) => ({
                  value: k,
                  label:
                    k === "custom"
                      ? CODING_PRESETS[k].label
                      : `${CODING_PRESETS[k].label} (${CODING_PRESETS[k].width} × ${CODING_PRESETS[k].height})`,
                }),
              )}
              onChange={(v) =>
                set({ codingWindow: { ...p.codingWindow, preset: v } })
              }
            />
            {p.codingWindow.preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Width"
                  value={p.codingWindow.width}
                  onChange={(v) =>
                    set({ codingWindow: { ...p.codingWindow, width: v ?? 40 } })
                  }
                />
                <NumberField
                  label="Height"
                  value={p.codingWindow.height}
                  onChange={(v) =>
                    set({
                      codingWindow: { ...p.codingWindow, height: v ?? 18 },
                    })
                  }
                />
              </div>
            )}
            <Select
              label="Panel"
              value={p.codingWindow.panel}
              options={panelOptions}
              onChange={(v) =>
                set({ codingWindow: { ...p.codingWindow, panel: v } })
              }
            />
            <Segmented
              label="Position"
              value={p.codingWindow.align}
              options={ALIGN}
              onChange={(v) =>
                set({ codingWindow: { ...p.codingWindow, align: v } })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Shift right"
                value={p.codingWindow.offsetX}
                onChange={(v) =>
                  set({ codingWindow: { ...p.codingWindow, offsetX: v ?? 0 } })
                }
              />
              <NumberField
                label="Shift down"
                value={p.codingWindow.offsetY}
                onChange={(v) =>
                  set({ codingWindow: { ...p.codingWindow, offsetY: v ?? 0 } })
                }
              />
            </div>
          </>
        )}
      </Section>

      <Section
        title="Pharmacode"
        summary={p.pharmacode.enabled ? `${p.pharmacode.width} mm` : "Off"}
        defaultOpen={p.pharmacode.enabled}
        aside={p.pharmacode.enabled ? <Dot /> : null}
      >
        <Toggle
          label="Pharmacode zone"
          checked={p.pharmacode.enabled}
          onChange={(v) => set({ pharmacode: { ...p.pharmacode, enabled: v } })}
        />
        {p.pharmacode.enabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Length"
                value={p.pharmacode.width}
                onChange={(v) =>
                  set({ pharmacode: { ...p.pharmacode, width: v ?? 30 } })
                }
              />
              <NumberField
                label="Bar height"
                value={p.pharmacode.height}
                onChange={(v) =>
                  set({ pharmacode: { ...p.pharmacode, height: v ?? 8 } })
                }
              />
            </div>
            <Select
              label="Panel"
              value={p.pharmacode.panel}
              options={panelOptions}
              onChange={(v) =>
                set({ pharmacode: { ...p.pharmacode, panel: v } })
              }
            />
            <Segmented
              label="Position"
              value={p.pharmacode.align}
              options={ALIGN}
              onChange={(v) =>
                set({ pharmacode: { ...p.pharmacode, align: v } })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Shift right"
                value={p.pharmacode.offsetX}
                onChange={(v) =>
                  set({ pharmacode: { ...p.pharmacode, offsetX: v ?? 0 } })
                }
              />
              <NumberField
                label="Shift down"
                value={p.pharmacode.offsetY}
                onChange={(v) =>
                  set({ pharmacode: { ...p.pharmacode, offsetY: v ?? 0 } })
                }
              />
            </div>
          </>
        )}
      </Section>

      <Section title="Print setup" defaultOpen={false} summary={`Bleed ${p.bleed} · safe ${p.safeMargin} mm`}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            field="bleed"
            label="Bleed"
            value={p.bleed}
            onChange={(v) => set({ bleed: v ?? 0 })}
          />
          <NumberField
            field="safeMargin"
            label="Safe margin"
            value={p.safeMargin}
            onChange={(v) => set({ safeMargin: v ?? 0 })}
            hint="Keep text this far from creases and cuts"
          />
        </div>
        <Toggle
          label="Show dimensions"
          checked={p.showDimensions}
          onChange={(v) => set({ showDimensions: v })}
        />
      </Section>
    </div>
  );
}

const fmt = (v: number | undefined) => (v == null ? "auto" : String(Math.round(v * 10) / 10));

/** The chosen style as one row; the full set of styles opens from it. */
function StylePicker({ value, onPick }: { value: StyleId; onPick: (s: StyleId) => void }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Change carton style"
        className="flex w-full items-center gap-3 rounded-md border border-rule bg-paper px-3 py-2 text-left transition hover:border-ink"
      >
        <span className="w-[72px] shrink-0 [&>svg]:h-auto [&>svg]:w-full">
          <StyleIcon style={value} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-tight">{STYLE_NAMES[value].name}</span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-mute">{STYLE_NAMES[value].ecma}</span>
        </span>
        <span className="shrink-0 text-[12px] text-mute underline underline-offset-2">Change</span>
      </button>
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              onPick(s);
              setOpen(false);
            }}
            className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-center transition ${value === s ? "border-ink bg-paper" : "border-rule bg-paper/50 text-mute hover:border-ink hover:text-ink"}`}
            aria-pressed={value === s}
          >
            <StyleIcon style={s} />
            <span className="text-[12px] leading-tight">{STYLE_NAMES[s].name}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-mute underline underline-offset-2 hover:text-ink">
        Keep {STYLE_NAMES[value].name}
      </button>
    </>
  );
}

/** Brings a field into view and highlights it when the dieline or a check asks for it. */
function useFocusScroll() {
  useEffect(() => {
    const on = (e: Event) => {
      const { field } = (e as CustomEvent<{ field: string }>).detail;
      // Let the section open first.
      setTimeout(() => {
        const box = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
        if (!box) return;
        box.scrollIntoView({ block: "center", behavior: "smooth" });
        box.querySelector("input")?.focus({ preventScroll: true });
        box.classList.remove("field-flash");
        void box.offsetWidth;
        box.classList.add("field-flash");
      }, 60);
    };
    window.addEventListener(FOCUS_EVENT, on);
    return () => window.removeEventListener(FOCUS_EVENT, on);
  }, []);
}

function Dot() {
  return (
    <span className="h-2 w-2 rounded-full bg-accent-dark" aria-label="On" />
  );
}
