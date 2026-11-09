"use client";

import { BOARDS, boardById } from "@/lib/dieline/boards";
import { STYLE_NAMES } from "@/lib/dieline/export/common";
import { DEFAULT_PARAMS, generate } from "@/lib/dieline";
import { CODING_PRESETS } from "@/lib/dieline/pharma";
import { DOOR } from "@/lib/dieline/styles";
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
import { useLang } from "../LangProvider";
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
  doorbox: { L: 60, W: 60, H: 150 },
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
  extraStyles = [],
}: {
  p: CartonParams;
  d: Dieline;
  set: Set;
  onOpenContents: () => void;
  /** Styles made for this account only. */
  extraStyles?: StyleId[];
}) {
  const { t } = useLang();
  const r = d.resolved;
  const panelOptions = d.panels
    .filter((q, i) => d.panels.findIndex((o) => o.id === q.id) === i)
    .map((q) => ({ value: q.id, label: t(q.name) }));
  const tuckEnd = p.style === "rte" || p.style === "ste";
  const lid = hasTopLid(p.style);
  const tube = isTube(p.style);
  const sizeHints: Record<string, [string, string, string]> = {
    display: ["Inside width", "Inside depth", "Front wall height"],
    srp: ["Front panel width", "Side panel width (depth)", "Height"],
    srpSnap: ["Front panel width", "Side panel width (depth)", "Height"],
    doorbox: ["Door and back panel width", "Side panel width (depth)", "Height"],
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
        <StylePicker value={p.style} styles={[...STYLES, ...extraStyles.filter((s) => !STYLES.includes(s))]} onPick={(s) => set(styleChange(p, s))} />
      </Section>

      <Section title="Size" summary={`${t(p.dimMode === "inside" ? "Inside" : "Outside")} ${p.L} × ${p.W} × ${p.H} ${t("mm")}`}>
        <Segmented
          value={p.dimMode}
          onChange={(v) => set({ dimMode: v })}
          options={[
            { value: "inside", label: t("Inside") },
            { value: "outside", label: t("Outside") },
          ]}
        />
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            field="L"
            label={t("Length")}
            value={p.L}
            onChange={(v) => set({ L: v ?? p.L })}
            hint={hL}
          />
          <NumberField
            field="W"
            label={t("Width")}
            value={p.W}
            onChange={(v) => set({ W: v ?? p.W })}
            hint={hW}
          />
          <NumberField
            field="H"
            label={t("Height")}
            value={p.H}
            onChange={(v) => set({ H: v ?? p.H })}
            hint={hH || undefined}
          />
        </div>
        <Button onClick={onOpenContents} className="w-full">
          {t("Size from blister + leaflet")}
        </Button>
      </Section>

      <Section title="Board" summary={`${board?.name ?? t("Custom board")} · ${p.caliper} ${t("mm")}`}>
        <Select
          label={t("Material")}
          value={board ? p.boardId : "custom"}
          onChange={(id) => {
            const b = boardById(id);
            if (b) set({ boardId: b.id, caliper: b.caliper, gsm: b.gsm });
            else set({ boardId: "custom" });
          }}
          options={[
            ...BOARDS.map((b) => ({ value: b.id, label: b.name })),
            { value: "custom", label: t("Custom board") },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            field="caliper"
            label={t("Caliper")}
            value={p.caliper}
            step={0.01}
            onChange={(v) =>
              set({
                caliper: v ?? p.caliper,
                boardId: board && v !== board.caliper ? "custom" : p.boardId,
              })
            }
            hint={t("Board thickness from the supplier's data sheet")}
          />
          <NumberField
            field="gsm"
            label={t("Grammage")}
            unit="g/m²"
            value={p.gsm}
            step={1}
            onChange={(v) => set({ gsm: v ?? p.gsm })}
          />
        </div>
        <Segmented
          label={t("Grain direction")}
          value={p.grain}
          onChange={(v) => set({ grain: v })}
          options={[
            { value: "horizontal", label: t("Around the carton") },
            { value: "vertical", label: t("Along the height") },
          ]}
        />
      </Section>

      {lid && (
        <Section title="Closures" summary={`${t(p.lock === "slit" ? "Slit lock" : p.lock === "friction" ? "Friction" : "Plain")} · ${t("tuck")} ${fmt(r.tuckDepth)} ${t("mm")}`}>
          <Segmented
            label={t("Tuck lock")}
            value={p.lock}
            onChange={(v) => set({ lock: v })}
            options={[
              { value: "slit", label: t("Slit lock") },
              { value: "friction", label: t("Friction") },
              { value: "none", label: t("Plain") },
            ]}
          />
          <Toggle
            label={t("Lock tab through the lid fold")}
            checked={p.lockTab}
            onChange={(v) => set({ lockTab: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="tuckDepth"
            label={t("Tuck depth")}
              auto
              value={p.tuckDepth}
              resolved={r.tuckDepth}
              onChange={(v) => set({ tuckDepth: v })}
            />
            <NumberField
              field="tuckRadius"
            label={t("Tuck corner radius")}
              auto
              value={p.tuckRadius}
              resolved={r.tuckRadius}
              onChange={(v) => set({ tuckRadius: v })}
            />
            {p.lock === "slit" && (
              <NumberField
                field="slitLength"
            label={t("Slit length")}
                auto
                value={p.slitLength}
                resolved={r.slitLength}
                onChange={(v) => set({ slitLength: v })}
              />
            )}
            <NumberField
              field="glueWidth"
              label={t("Glue flap width")}
              auto
              value={p.glueWidth}
              resolved={r.glueWidth}
              onChange={(v) => set({ glueWidth: v })}
            />
            <NumberField
              field="glueAngle"
            label={t("Glue flap angle")}
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
              label={t("Base lock reach")}
                auto
                value={p.bottomExtension}
                resolved={r.bottomExtension}
                onChange={(v) => set({ bottomExtension: v })}
                hint={t("How far the base flaps reach past the centre line")}
              />
            )}
          </div>
        </Section>
      )}


      {p.style === "doorbox" && (
        <Section title="Closures" summary={`${t("tuck")} ${fmt(p.tuckDepth ?? DOOR.tuck)} ${t("mm")}`}>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="tuckDepth"
              label={t("Tuck depth")}
              auto
              value={p.tuckDepth}
              resolved={DOOR.tuck}
              onChange={(v) => set({ tuckDepth: v })}
            />
            <NumberField
              field="glueWidth"
              label={t("Glue flap width")}
              auto
              value={p.glueWidth}
              resolved={10}
              onChange={(v) => set({ glueWidth: v })}
            />
          </div>
          <p className="text-[12px] leading-relaxed text-mute">
            {t("The door is two layers glued back to back. Its tab locks into the slit at the inner front corner. Tab, slit, thumb notch and tuck keep the sizes of the produced box.")}
          </p>
        </Section>
      )}

      {p.style === "gable" && (
        <Section title="Handle" summary={`${t("Handle")} ${p.gable.handleHeight} ${t("mm")}`}>
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              field="gable.handleHeight"
            label={t("Handle height")}
              value={p.gable.handleHeight}
              onChange={(v) =>
                set({ gable: { ...p.gable, handleHeight: v ?? 40 } })
              }
            />
            <NumberField
              label={t("Hole width")}
              value={p.gable.holeWidth}
              onChange={(v) =>
                set({ gable: { ...p.gable, holeWidth: v ?? 70 } })
              }
            />
            <NumberField
              label={t("Hole height")}
              value={p.gable.holeHeight}
              onChange={(v) =>
                set({ gable: { ...p.gable, holeHeight: v ?? 24 } })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="glueWidth"
              label={t("Glue flap width")}
              auto
              value={p.glueWidth}
              resolved={r.glueWidth}
              onChange={(v) => set({ glueWidth: v })}
            />
            <NumberField
              field="bottomExtension"
              label={t("Base lock reach")}
              auto
              value={p.bottomExtension}
              resolved={r.bottomExtension}
              onChange={(v) => set({ bottomExtension: v })}
              hint={t("How far the base flaps reach past the centre line")}
            />
          </div>
          <p className="text-[12px] leading-relaxed text-mute">
            {t("The roofs meet in the middle and the two handles are glued back to back; their ends slide into the slots in the gable ends.")}
          </p>
        </Section>
      )}

      {isTray(p.style) && (
        <Section title="Tear-away front" summary={`${t("Tear depth")} ${fmt(r.tearDepth)} ${t("mm")}`}>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="srp.tearDepth"
            label={t("Tear depth")}
              value={p.srp.tearDepth}
              onChange={(v) => set({ srp: { ...p.srp, tearDepth: v ?? 0 } })}
              hint={t("From the top; 0 for half the height")}
            />
            <NumberField
              label={t("Finger opening")}
              value={p.srp.fingerWidth}
              onChange={(v) => set({ srp: { ...p.srp, fingerWidth: v ?? 0 } })}
              hint="0 for a straight tear"
            />
          </div>
          <p className="text-[12px] leading-relaxed text-mute">
            {t("The front tears off along the perforation, down both sides from the back corners. The lid folds back on its middle crease.")}
          </p>
        </Section>
      )}

      {p.style === "display" && (
        <Section title="Display" summary={`${t("Header")} ${p.display.header} ${t("mm")}`}>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              field="display.rise"
            label={t("Side rise")}
              value={p.display.rise}
              onChange={(v) => set({ display: { ...p.display, rise: v ?? 0 } })}
              hint={t("Extra side height at the back")}
            />
            <NumberField
              field="display.header"
            label={t("Header")}
              value={p.display.header}
              onChange={(v) =>
                set({ display: { ...p.display, header: v ?? 0 } })
              }
              hint={t("Header card above the back, 0 for none")}
            />
          </div>
        </Section>
      )}


      {lid && (
        <Section title="Tamper evidence" defaultOpen={false} summary={t(p.tamper === "none" ? "None" : p.tamper === "glueTuck" ? "Glued tuck" : "Tear strip")}>
          <Segmented
            value={p.tamper}
            onChange={(v) => set({ tamper: v })}
            options={[
              { value: "none", label: t("None") },
              { value: "glueTuck", label: t("Glued tuck") },
              { value: "tearStrip", label: t("Tear strip") },
            ]}
          />
          <p className="text-[12px] leading-relaxed text-mute">
            {p.tamper === "glueTuck" &&
              t("The top tuck is glued and perforated: opening tears it, leaving visible evidence.")}
            {p.tamper === "tearStrip" &&
              t("Two perforations across the top lid with a thumb notch; the tuck is glued, so the strip must be torn to open.")}
            {p.tamper === "none" && t("Plain closure, no evidence of opening.")}
          </p>
        </Section>
      )}

      {lid && (
        <Section
          title="Hang tab"
        summary={t(p.hangTab.enabled ? (p.hangTab.slot === "euro" ? "Euro slot" : "Round hole") : "Off")}
          defaultOpen={p.hangTab.enabled}
          aside={p.hangTab.enabled ? <Dot /> : null}
        >
          <Toggle
            label={t("Hanger above the front panel")}
            checked={p.hangTab.enabled}
            onChange={(v) => set({ hangTab: { ...p.hangTab, enabled: v } })}
          />
          {p.hangTab.enabled && (
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("Hanger height")}
                value={p.hangTab.height}
                onChange={(v) =>
                  set({ hangTab: { ...p.hangTab, height: v ?? 25 } })
                }
                hint={t("Each of the two layers")}
              />
              <Select
                label={t("Hole")}
                value={p.hangTab.slot}
                options={[
                  { value: "euro", label: t("Euro slot") },
                  { value: "round", label: t("Round hole") },
                ]}
                onChange={(v) => set({ hangTab: { ...p.hangTab, slot: v } })}
              />
            </div>
          )}
        </Section>
      )}

      <Section
        title="Window"
        summary={p.window.enabled ? `${p.window.width} × ${p.window.height} ${t("mm")}` : t("Off")}
        defaultOpen={p.window.enabled}
        aside={p.window.enabled ? <Dot /> : null}
      >
        <Toggle
          label={t("Window cut-out")}
          checked={p.window.enabled}
          onChange={(v) => set({ window: { ...p.window, enabled: v } })}
        />
        {p.window.enabled && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label={t("Width")}
                value={p.window.width}
                onChange={(v) =>
                  set({ window: { ...p.window, width: v ?? 30 } })
                }
              />
              <NumberField
                label={t("Height")}
                value={p.window.height}
                onChange={(v) =>
                  set({ window: { ...p.window, height: v ?? 40 } })
                }
              />
              <NumberField
                label={t("Corner")}
                value={p.window.radius}
                onChange={(v) =>
                  set({ window: { ...p.window, radius: v ?? 0 } })
                }
              />
            </div>
            <Select
              label={t("Panel")}
              value={p.window.panel}
              options={panelOptions}
              onChange={(v) => set({ window: { ...p.window, panel: v } })}
            />
            <Segmented
              label={t("Position")}
              value={p.window.align}
              options={ALIGN.map((a) => ({ ...a, label: t(a.label) }))}
              onChange={(v) => set({ window: { ...p.window, align: v } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("Shift right")}
                value={p.window.offsetX}
                onChange={(v) =>
                  set({ window: { ...p.window, offsetX: v ?? 0 } })
                }
              />
              <NumberField
                label={t("Shift down")}
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
        summary={p.zipStrip.enabled ? `${t("Strip width")} ${p.zipStrip.width} ${t("mm")}` : t("Off")}
          defaultOpen={p.zipStrip.enabled}
          aside={p.zipStrip.enabled ? <Dot /> : null}
        >
          <Toggle
            label={t("Zip strip round the body")}
            checked={p.zipStrip.enabled}
            onChange={(v) => set({ zipStrip: { ...p.zipStrip, enabled: v } })}
          />
          {p.zipStrip.enabled && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label={t("From the top")}
                  value={p.zipStrip.fromTop}
                  onChange={(v) =>
                    set({ zipStrip: { ...p.zipStrip, fromTop: v ?? 15 } })
                  }
                />
                <NumberField
                  label={t("Strip width")}
                  value={p.zipStrip.width}
                  onChange={(v) =>
                    set({ zipStrip: { ...p.zipStrip, width: v ?? 6 } })
                  }
                />
              </div>
              <p className="text-[12px] leading-relaxed text-mute">
                {t("Opened from the pull tab on the free edge of the front panel. Glue the top closure for tamper evidence.")}
          </p>
            </>
          )}
        </Section>
      )}

      <Section
        title="Dispenser opening"
        summary={p.dispenser.enabled ? `${p.dispenser.width} × ${p.dispenser.height} ${t("mm")}` : t("Off")}
        defaultOpen={p.dispenser.enabled}
        aside={p.dispenser.enabled ? <Dot /> : null}
      >
        <Toggle
          label={t("Perforated push-in opening")}
          checked={p.dispenser.enabled}
          onChange={(v) => set({ dispenser: { ...p.dispenser, enabled: v } })}
        />
        {p.dispenser.enabled && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label={t("Width")}
                value={p.dispenser.width}
                onChange={(v) =>
                  set({ dispenser: { ...p.dispenser, width: v ?? 40 } })
                }
              />
              <NumberField
                label={t("Height")}
                value={p.dispenser.height}
                onChange={(v) =>
                  set({ dispenser: { ...p.dispenser, height: v ?? 30 } })
                }
              />
              <NumberField
                label={t("From bottom")}
                value={p.dispenser.fromBottom}
                onChange={(v) =>
                  set({ dispenser: { ...p.dispenser, fromBottom: v ?? 12 } })
                }
              />
            </div>
            <Select
              label={t("Panel")}
              value={p.dispenser.panel}
              options={panelOptions}
              onChange={(v) => set({ dispenser: { ...p.dispenser, panel: v } })}
            />
          </>
        )}
      </Section>

      <Section
        title="Braille"
        summary={p.braille.enabled ? p.braille.text || t("No text yet") : t("Off")}
        defaultOpen={p.braille.enabled}
        aside={p.braille.enabled ? <Dot /> : null}
      >
        <Toggle
          label={t("Add Braille (Marburg Medium)")}
          checked={p.braille.enabled}
          onChange={(v) => set({ braille: { ...p.braille, enabled: v } })}
        />
        {p.braille.enabled && (
          <>
            <TextField
              label={t("Text")}
              value={p.braille.text}
              placeholder="e.g. Paracétamol 500 mg"
              onChange={(v) => set({ braille: { ...p.braille, text: v } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                label={t("Panel")}
                value={p.braille.panel}
                options={panelOptions}
                onChange={(v) => set({ braille: { ...p.braille, panel: v } })}
              />
              <Select
                label={t("Direction")}
                value={p.braille.orientation}
                options={[
                  { value: "horizontal", label: t("Across") },
                  { value: "vertical", label: t("Along height") },
                ]}
                onChange={(v) =>
                  set({ braille: { ...p.braille, orientation: v } })
                }
              />
            </div>
            <Segmented
              label={t("Position")}
              value={p.braille.align}
              options={ALIGN.map((a) => ({ ...a, label: t(a.label) }))}
              onChange={(v) => set({ braille: { ...p.braille, align: v } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("Shift right")}
                value={p.braille.offsetX}
                onChange={(v) =>
                  set({ braille: { ...p.braille, offsetX: v ?? 0 } })
                }
              />
              <NumberField
                label={t("Shift down")}
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
        summary={p.codingWindow.enabled ? t(CODING_PRESETS[p.codingWindow.preset].label) : t("Off")}
        defaultOpen={p.codingWindow.enabled}
        aside={p.codingWindow.enabled ? <Dot /> : null}
      >
        <Toggle
          label={t("Varnish-free coding area")}
          checked={p.codingWindow.enabled}
          onChange={(v) =>
            set({ codingWindow: { ...p.codingWindow, enabled: v } })
          }
        />
        {p.codingWindow.enabled && (
          <>
            <Select
              label={t("Content")}
              value={p.codingWindow.preset}
              options={(Object.keys(CODING_PRESETS) as CodingPreset[]).map(
                (k) => ({
                  value: k,
                  label:
                    k === "custom"
                      ? t(CODING_PRESETS[k].label)
                      : `${t(CODING_PRESETS[k].label)} (${CODING_PRESETS[k].width} × ${CODING_PRESETS[k].height})`,
                }),
              )}
              onChange={(v) =>
                set({ codingWindow: { ...p.codingWindow, preset: v } })
              }
            />
            {p.codingWindow.preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label={t("Width")}
                  value={p.codingWindow.width}
                  onChange={(v) =>
                    set({ codingWindow: { ...p.codingWindow, width: v ?? 40 } })
                  }
                />
                <NumberField
                  label={t("Height")}
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
              label={t("Panel")}
              value={p.codingWindow.panel}
              options={panelOptions}
              onChange={(v) =>
                set({ codingWindow: { ...p.codingWindow, panel: v } })
              }
            />
            <Segmented
              label={t("Position")}
              value={p.codingWindow.align}
              options={ALIGN.map((a) => ({ ...a, label: t(a.label) }))}
              onChange={(v) =>
                set({ codingWindow: { ...p.codingWindow, align: v } })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("Shift right")}
                value={p.codingWindow.offsetX}
                onChange={(v) =>
                  set({ codingWindow: { ...p.codingWindow, offsetX: v ?? 0 } })
                }
              />
              <NumberField
                label={t("Shift down")}
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
        summary={p.pharmacode.enabled ? `${p.pharmacode.width} ${t("mm")}` : t("Off")}
        defaultOpen={p.pharmacode.enabled}
        aside={p.pharmacode.enabled ? <Dot /> : null}
      >
        <Toggle
          label={t("Pharmacode zone")}
          checked={p.pharmacode.enabled}
          onChange={(v) => set({ pharmacode: { ...p.pharmacode, enabled: v } })}
        />
        {p.pharmacode.enabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("Length")}
                value={p.pharmacode.width}
                onChange={(v) =>
                  set({ pharmacode: { ...p.pharmacode, width: v ?? 30 } })
                }
              />
              <NumberField
                label={t("Bar height")}
                value={p.pharmacode.height}
                onChange={(v) =>
                  set({ pharmacode: { ...p.pharmacode, height: v ?? 8 } })
                }
              />
            </div>
            <Select
              label={t("Panel")}
              value={p.pharmacode.panel}
              options={panelOptions}
              onChange={(v) =>
                set({ pharmacode: { ...p.pharmacode, panel: v } })
              }
            />
            <Segmented
              label={t("Position")}
              value={p.pharmacode.align}
              options={ALIGN.map((a) => ({ ...a, label: t(a.label) }))}
              onChange={(v) =>
                set({ pharmacode: { ...p.pharmacode, align: v } })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t("Shift right")}
                value={p.pharmacode.offsetX}
                onChange={(v) =>
                  set({ pharmacode: { ...p.pharmacode, offsetX: v ?? 0 } })
                }
              />
              <NumberField
                label={t("Shift down")}
                value={p.pharmacode.offsetY}
                onChange={(v) =>
                  set({ pharmacode: { ...p.pharmacode, offsetY: v ?? 0 } })
                }
              />
            </div>
          </>
        )}
      </Section>

      <Section title="Print setup" defaultOpen={false} summary={`${t("Bleed")} ${p.bleed} · ${t("Safe margin")} ${p.safeMargin} ${t("mm")}`}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            field="bleed"
            label={t("Bleed")}
            value={p.bleed}
            onChange={(v) => set({ bleed: v ?? 0 })}
          />
          <NumberField
            field="safeMargin"
            label={t("Safe margin")}
            value={p.safeMargin}
            onChange={(v) => set({ safeMargin: v ?? 0 })}
            hint={t("Keep text this far from creases and cuts")}
          />
        </div>
        <Toggle
          label={t("Show dimensions")}
          checked={p.showDimensions}
          onChange={(v) => set({ showDimensions: v })}
        />
      </Section>
    </div>
  );
}

const fmt = (v: number | undefined) => (v == null ? "auto" : String(Math.round(v * 10) / 10));

/** The chosen style as one row; the full set of styles opens from it. */
function StylePicker({ value, styles, onPick }: { value: StyleId; styles: StyleId[]; onPick: (s: StyleId) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("Change carton style")}
        className="flex w-full items-center gap-3 rounded-md border border-rule bg-paper px-3 py-2 text-start transition hover:border-ink"
      >
        <span className="w-[72px] shrink-0 [&>svg]:h-auto [&>svg]:w-full">
          <StyleIcon style={value} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-tight">{t(STYLE_NAMES[value].name)}</span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-mute">{t(STYLE_NAMES[value].ecma)}</span>
        </span>
        <span className="shrink-0 text-[12px] text-mute underline underline-offset-2">{t("Change")}</span>
      </button>
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {styles.map((s) => (
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
            <span className="text-[12px] leading-tight">{t(STYLE_NAMES[s].name)}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-mute underline underline-offset-2 hover:text-ink">
        {t("Keep")} {t(STYLE_NAMES[value].name)}
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
