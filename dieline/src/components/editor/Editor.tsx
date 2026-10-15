"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generate, normalizeParams } from "@/lib/dieline";
import { LAYERS, LAYER_ORDER } from "@/lib/dieline/layers";
import type { CartonParams, Layer } from "@/lib/dieline/types";
import { downloadDieline } from "@/lib/download";
import type { ProjectStore, VersionRow } from "@/lib/projects";
import { Brand } from "../Brand";
import { Button } from "../ui";
import { Checks, Stats } from "./Checks";
import { ContentsDialog } from "./ContentsDialog";
import { Controls } from "./Controls";
import { Preview } from "./Preview";

type SaveState = "saved" | "saving" | "unsaved" | "error";
type Tab = "design" | "preview" | "output";

const PRODUCTION: Layer[] = ["cut", "crease", "perf", "braille"];

export function Editor({
  initialName,
  initialParams,
  store,
  userLabel,
  backHref,
}: {
  initialName: string;
  initialParams: CartonParams;
  store: ProjectStore;
  userLabel?: string | null;
  backHref: string;
}) {
  const [params, setParams] = useState<CartonParams>(() => normalizeParams(initialParams));
  const [name, setName] = useState(initialName);
  const [save, setSave] = useState<SaveState>("saved");
  const [layers, setLayers] = useState<Set<Layer>>(() => new Set(LAYER_ORDER));
  const [tab, setTab] = useState<Tab>("preview");
  const [contentsOpen, setContentsOpen] = useState(false);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [versionLabel, setVersionLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [exportSet, setExportSet] = useState<"shown" | "production">("shown");

  const d = useMemo(() => generate(params), [params]);
  const set = useCallback((patch: Partial<CartonParams>) => setParams((p) => ({ ...p, ...patch })), []);

  // Autosave a second after the last change.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSave("unsaved");
    const t = setTimeout(async () => {
      setSave("saving");
      try {
        await store.save({ name, params });
        setSave("saved");
      } catch {
        setSave("error");
      }
    }, 900);
    return () => clearTimeout(t);
  }, [params, name, store]);

  useEffect(() => {
    store.listVersions().then(setVersions).catch(() => {});
  }, [store]);

  const latest = versions[0]?.version ?? null;
  const meta = { projectName: name, version: latest, author: userLabel ?? null };
  const exportLayers = exportSet === "production" ? new Set<Layer>(PRODUCTION.filter((l) => layers.has(l) || l === "cut")) : layers;
  const blocking = d.issues.some((i) => i.severity === "error");

  const doExport = async (kind: "pdf" | "svg" | "dxf") => {
    setBusy(kind);
    try {
      await downloadDieline(kind, d, meta, exportLayers);
    } finally {
      setBusy(null);
    }
  };

  const saveVersion = async () => {
    setBusy("version");
    try {
      const row = await store.createVersion(params, versionLabel.trim() || null);
      setVersions((v) => [row, ...v]);
      setVersionLabel("");
    } finally {
      setBusy(null);
    }
  };

  const toggleLayer = (l: Layer) =>
    setLayers((s) => {
      const n = new Set(s);
      if (n.has(l)) n.delete(l);
      else n.add(l);
      return n;
    });

  const output = (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">Checks</h2>
        <Checks d={d} set={set} />
      </div>
      <div>
        <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">Download</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["pdf", "svg", "dxf"] as const).map((k) => (
            <Button key={k} variant={k === "pdf" ? "primary" : "secondary"} onClick={() => doExport(k)} disabled={!!busy}>
              {busy === k ? "…" : k.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-md border border-rule bg-paper p-1">
          {(
            [
              ["shown", "Layers shown"],
              ["production", "Die-maker only"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setExportSet(v)}
              className={`h-8 rounded text-[12px] ${exportSet === v ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-mute">
          {exportSet === "production"
            ? "Cut, crease, perforation and Braille only, for the cutting die."
            : "Every layer switched on in the preview, in its own named spot colour, plus a title block."}
        </p>
        {blocking && <p className="mt-2 text-[12px] text-danger">Fix the blocking checks before sending this dieline to production.</p>}
      </div>
      <div>
        <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">Production</h2>
        <Stats d={d} />
      </div>
      <div>
        <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">Versions</h2>
        <div className="flex gap-2">
          <input
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder={`Note for v${(latest ?? 0) + 1} (optional)`}
            className="h-10 min-w-0 flex-1 rounded-md border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink sm:text-[13px]"
          />
          <Button onClick={saveVersion} disabled={busy === "version"}>
            Save v{(latest ?? 0) + 1}
          </Button>
        </div>
        {versions.length > 0 && (
          <ul className="mt-2 divide-y divide-rule rounded-md border border-rule bg-paper">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[13px]">
                    <span className="font-mono">v{v.version}</span>
                    {v.label ? <span className="text-mute"> · {v.label}</span> : null}
                  </p>
                  <p className="font-mono text-[11px] text-mute">{new Date(v.created_at).toLocaleString()}</p>
                </div>
                <button type="button" className="shrink-0 text-[12px] underline-offset-2 hover:underline" onClick={() => setParams(normalizeParams(v.params))}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-md border border-dashed border-rule p-3">
        <p className="text-[12px] leading-relaxed text-mute">Colour key</p>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {LAYER_ORDER.map((l) => (
            <li key={l} className="flex items-center gap-2 text-[12px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: LAYERS[l].color }} />
              {LAYERS[l].label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const issueCount = d.issues.filter((i) => i.severity !== "info").length;

  return (
    <div className="flex h-dvh flex-col bg-bone">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-ink px-3 text-paper sm:px-4">
        <Brand dark href={backHref} />
        <span className="hidden h-5 w-px bg-paper/20 sm:block" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Project name"
          className="h-9 min-w-0 flex-1 rounded bg-transparent px-2 text-[16px] sm:text-[14px] outline-none hover:bg-paper/10 focus:bg-paper/10 sm:max-w-[320px]"
        />
        <span className="hidden font-mono text-[11px] uppercase tracking-wider text-paper/60 sm:inline">
          {save === "saved" ? "Saved" : save === "saving" ? "Saving…" : save === "unsaved" ? "Editing" : "Not saved"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => doExport("pdf")}
            disabled={!!busy}
            className="hidden h-9 items-center rounded-md bg-accent px-3 text-[13px] font-medium text-ink hover:brightness-95 sm:inline-flex"
          >
            Download PDF
          </button>
          <Link href={backHref} className="flex h-9 items-center rounded-md px-2 text-[13px] text-paper/80 hover:text-paper">
            {backHref === "/projects" ? "Projects" : "Home"}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={`${tab === "design" ? "block" : "hidden"} w-full overflow-y-auto border-r border-rule bg-bone lg:block lg:w-[330px] lg:shrink-0`}>
          <Controls p={params} d={d} set={set} onOpenContents={() => setContentsOpen(true)} />
          <p className="px-4 py-4 text-[11px] leading-relaxed text-mute">
            Dielines are generated from standard construction rules. Check the structure with a physical sample on the production board before ordering the cutting die.
          </p>
        </aside>
        <main className={`${tab === "preview" ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-[#d8d7d3] lg:flex`}>
          <Preview d={d} layers={layers} onToggleLayer={toggleLayer} />
        </main>
        <aside className={`${tab === "output" ? "block" : "hidden"} w-full overflow-y-auto border-l border-rule bg-bone lg:block lg:w-[320px] lg:shrink-0`}>
          {output}
        </aside>
      </div>

      <nav className="grid shrink-0 grid-cols-3 border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden">
        {(
          [
            ["design", "Design"],
            ["preview", "Preview"],
            ["output", issueCount ? `Checks · ${issueCount}` : "Checks & export"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`h-12 text-[13px] ${tab === k ? "font-medium text-ink" : "text-mute"}`}
            aria-pressed={tab === k}
          >
            <span className={`border-b-2 pb-1 ${tab === k ? "border-accent" : "border-transparent"}`}>{l}</span>
          </button>
        ))}
      </nav>

      {contentsOpen && (
        <ContentsDialog
          onClose={() => setContentsOpen(false)}
          onApply={(dims) => {
            set({ ...dims, dimMode: "inside" });
            setContentsOpen(false);
          }}
        />
      )}
    </div>
  );
}

