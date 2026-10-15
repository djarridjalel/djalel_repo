"use client";

import { fileBase, type ExportMeta } from "./dieline/export/common";
import type { Dieline, Layer } from "./dieline/types";

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

export async function downloadDieline(kind: "pdf" | "svg" | "dxf", d: Dieline, meta: ExportMeta, layers: Set<Layer>) {
  const base = fileBase(meta, d);
  if (kind === "pdf") {
    const { renderPdf } = await import("./dieline/export/pdf");
    const bytes = await renderPdf(d, { meta, layers });
    save(bytes as BlobPart, "application/pdf", `${base}.pdf`);
  } else if (kind === "svg") {
    const { renderSvg } = await import("./dieline/export/svg");
    save(renderSvg(d, { meta, layers, titleBlock: true }), "image/svg+xml", `${base}.svg`);
  } else {
    const { renderDxf } = await import("./dieline/export/dxf");
    save(renderDxf(d, { meta, layers }), "application/dxf", `${base}.dxf`);
  }
}
