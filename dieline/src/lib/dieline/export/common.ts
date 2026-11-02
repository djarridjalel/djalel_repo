import { boardById } from "../boards";
import type { Dieline, StyleId } from "../types";
import { translate, type Lang } from "../../i18n";

export const STYLE_NAMES: Record<StyleId, { name: string; ecma: string }> = {
  rte: { name: "Reverse tuck end", ecma: "ECMA A20.20.03.01" },
  ste: { name: "Straight tuck end", ecma: "ECMA A20.20.01.01" },
  crash: { name: "Crash-lock bottom, tuck top", ecma: "ECMA A60.20 family" },
  snap: { name: "Snap-lock (1-2-3) bottom, tuck top", ecma: "ECMA A55.20 family" },
  srp: { name: "Shelf-ready tray, tear-away front", ecma: "Crash-lock bottom, tuck top" },
  srpSnap: { name: "Shelf-ready tray, snap-lock bottom", ecma: "Tear-away front, tuck top" },
  gable: { name: "Gable box with handle", ecma: "Snap-lock bottom" },
  mailer: { name: "Mailer box", ecma: "FEFCO 0427" },
  display: { name: "Counter display", ecma: "Sloped sides, header card" },
};

export interface ExportMeta {
  projectName: string;
  version?: number | null;
  author?: string | null;
  date?: Date;
}

export const BRAND = "Djarri Design Studio — Dieline Generator";

export function titleRows(d: Dieline, meta: ExportMeta, lang: Lang = "en"): [string, string][] {
  const t = (s: string) => translate(lang, s);
  const p = d.params;
  const s = STYLE_NAMES[p.style];
  const board = boardById(p.boardId);
  const mm = t("mm");
  const dims = lang === "ar" ? `${p.L} × ${p.W} × ${p.H} ${mm} (${t(p.dimMode === "inside" ? "Inside" : "Outside")}، ${t("L × W × H")})` : `${p.L} × ${p.W} × ${p.H} mm (${p.dimMode} L × W × H)`;
  const date = (meta.date ?? new Date()).toISOString().slice(0, 10);
  return [
    [t("Job"), meta.projectName ? (meta.projectName === "Untitled carton" ? t(meta.projectName) : meta.projectName) : t("Untitled carton")],
    [t("Style"), `${t(s.name)} · ${t(s.ecma)}`],
    [t("Dimensions"), dims],
    [t("Board"), `${board ? board.name : t("Custom board")} · ${t("caliper")} ${p.caliper} ${mm}`],
    [t("Flat size"), `${d.stats.flatWidth} × ${d.stats.flatHeight} ${mm}`],
    [t("Rule length"), `${t("cut")} ${d.stats.cutLength} ${mm} · ${t("crease")} ${d.stats.creaseLength} ${mm}${d.stats.perfLength ? ` · ${t("perf")} ${d.stats.perfLength} ${mm}` : ""}`],
    [t("Version"), `${meta.version ? `v${meta.version} · ` : ""}${date}${meta.author ? ` · ${meta.author}` : ""}`],
  ];
}

export const DISCLAIMER = "Check the structure with a physical sample on the production board before ordering the cutting die.";

export function fileBase(meta: ExportMeta, d: Dieline) {
  const name = (meta.projectName || "dieline").replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const p = d.params;
  return `${name || "dieline"}_${p.style}_${p.L}x${p.W}x${p.H}`;
}
