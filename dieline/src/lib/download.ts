"use client";

import { fileBase, type ExportMeta } from "./dieline/export/common";
import type { Dieline, Layer } from "./dieline/types";
import type { Lang } from "./i18n";

function save(data: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function downloadDieline(kind: "pdf" | "svg" | "dxf", d: Dieline, meta: ExportMeta, layers: Set<Layer>, lang: Lang = "en") {
  const base = fileBase(meta, d);
  if (kind === "pdf") {
    const { renderPdf } = await import("./dieline/export/pdf");
    const arabic = lang === "ar" ? await arabicFonts() : undefined;
    const bytes = await renderPdf(d, { meta, layers, lang, arabic });
    save(bytes as BlobPart, "application/pdf", `${base}.pdf`);
  } else if (kind === "svg") {
    const { renderSvg } = await import("./dieline/export/svg");
    save(renderSvg(d, { meta, layers, titleBlock: true, lang }), "image/svg+xml", `${base}.svg`);
  } else {
    const { renderDxf } = await import("./dieline/export/dxf");
    save(renderDxf(d, { meta, layers }), "application/dxf", `${base}.dxf`);
  }
}

/** The Arabic typeface for PDFs (IBM Plex Sans Arabic, OFL), fetched once when first needed. */
let fonts: Promise<{ regular: Uint8Array; bold: Uint8Array; fontkit: unknown }> | null = null;
function arabicFonts() {
  fonts ??= (async () => {
    const [fk, regular, bold] = await Promise.all([
      import("@pdf-lib/fontkit"),
      fetch("/fonts/IBMPlexSansArabic-Regular.ttf").then((r) => r.arrayBuffer()),
      fetch("/fonts/IBMPlexSansArabic-Bold.ttf").then((r) => r.arrayBuffer()),
    ]);
    return { regular: new Uint8Array(regular), bold: new Uint8Array(bold), fontkit: fk.default };
  })();
  return fonts;
}
