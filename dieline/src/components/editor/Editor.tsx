"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generate, normalizeParams } from "@/lib/dieline";
import { LAYER_ORDER } from "@/lib/dieline/layers";
import type { CartonParams, Layer } from "@/lib/dieline/types";
import { downloadDieline } from "@/lib/download";
import type { UploadResult } from "@/lib/upload";
import type { Panel } from "@/lib/dieline/types";
import type { ProjectStore, VersionRow } from "@/lib/projects";
import { Brand } from "../Brand";
import { Button, focusField } from "../ui";
import { Checks } from "./Checks";
import { ContentsDialog } from "./ContentsDialog";
import { Controls } from "./Controls";
import { FIELD_SECTIONS, fieldOfPanel, panelsOfField } from "./focus";
import { Preview, UploadPanel, typing } from "./Preview";

type SaveState = "saved" | "saving" | "unsaved" | "error";
type Tab = "design" | "preview" | "output";

const PRODUCTION: Layer[] = ["cut", "crease", "perf", "braille"];

export function Editor({
  initialName,
  initialParams,
  store,
  userLabel,
  backHref,
  onNew,
  local = false,
}: {
  /** Saved in this browser only (no account). */
  local?: boolean;
  initialName: string;
  initialParams: CartonParams;
  store: ProjectStore;
  userLabel?: string | null;
  backHref: string;
  onNew?: () => void;
}) {
  const [params, setParams] = useState<CartonParams>(() => normalizeParams(initialParams));
  const [name, setName] = useState(initialName);
  const [save, setSave] = useState<SaveState>("saved");
  const [layers, setLayers] = useState<Set<Layer>>(() => new Set(LAYER_ORDER));
  const [tab, setTab] = useState<Tab>("preview");
  const [contentsOpen, setContentsOpen] = useState(false);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [versionLabel, setVersionLabel] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [exportSet, setExportSet] = useState<"shown" | "production">("shown");
  // Two jobs: make a dieline, or upload a design to see it folded in 3D.
  const [mode, setMode] = useState<"make" | "upload">("make");
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [reading, setReading] = useState(false);
  /** null until the user answers whether to correct the uploaded dieline's problems. */
  const [corrected, setCorrected] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  // /editor?mode=upload (or #upload) opens on the upload side.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("mode") === "upload" || window.location.hash === "#upload") setMode("upload");
  }, []);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setMode("upload");
    setTab("preview");
    setReading(true);
    setCorrected(null);
    setUpload(null);
    try {
      const { analysePdf } = await import("@/lib/upload");
      setUpload(await analysePdf(file));
    } catch {
      setUpload({ ok: false, fileName: file.name, reason: "This PDF could not be read." });
    } finally {
      setReading(false);
    }
  };
  const chooseFile = () => fileInput.current?.click();

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

  const deleteVersion = async (id: string) => {
    setBusy("delete");
    try {
      await store.deleteVersion(id);
      setVersions((v) => v.filter((x) => x.id !== id));
      setConfirmDelete(null);
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

  /** Brings a field into view, and points at the panels it shapes. */
  const locate = (field: string) => {
    setTab("design");
    focusField(field, FIELD_SECTIONS[field] ?? []);
    const panels = panelsOfField(field, params.style);
    setHighlight(panels);
    setTimeout(() => setHighlight((h) => (h === panels ? [] : h)), 2500);
  };
  const onPanelClick = (q: Panel) => {
    const field = fieldOfPanel(q.id, params.style);
    setTab("design");
    focusField(field, FIELD_SECTIONS[field] ?? []);
  };

  // Keyboard: U upload, D download the PDF (F, + − 0 are the preview's).
  const keyRef = useRef({ chooseFile, doExport, mode });
  keyRef.current = { chooseFile, doExport, mode };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const k = keyRef.current;
      if (e.key === "u" || e.key === "U") k.chooseFile();
      else if ((e.key === "d" || e.key === "D") && k.mode === "make") k.doExport("pdf");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const output = (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">Checks</h2>
        <Checks d={d} set={set} onLocate={locate} />
      </div>
      <div>
        <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">Download</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["pdf", "svg", "dxf"] as const).map((k) => (
            <Button key={k} variant={k === "pdf" ? "primary" : "secondary"} onClick={() => doExport(k)} disabled={!!busy} title={k === "pdf" ? "Download the PDF (D)" : undefined}>
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
                {confirmDelete === v.id ? (
                  <div className="flex shrink-0 items-center gap-3 text-[12px]">
                    <span className="text-mute">Delete v{v.version}?</span>
                    <button type="button" className="font-medium text-danger underline-offset-2 hover:underline" disabled={busy === "delete"} onClick={() => deleteVersion(v.id)}>
                      Delete
                    </button>
                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => setConfirmDelete(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-3 text-[12px]">
                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => setParams(normalizeParams(v.params))}>
                      Restore
                    </button>
                    <button type="button" className="text-mute underline-offset-2 hover:text-danger hover:underline" aria-label={`Delete version ${v.version}`} onClick={() => setConfirmDelete(v.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const uploadSide = (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">Your design</h2>
        {upload ? (
          <UploadPanel
            upload={upload}
            corrected={corrected}
            onAnswer={setCorrected}
            onDownloadCorrected={() =>
              upload.ok && downloadDieline("pdf", upload.dieline, { projectName: `${upload.fileName.replace(/\.pdf$/i, "")} corrected`, version: null, author: null }, new Set(LAYER_ORDER))
            }
          />
        ) : (
          <p className="text-[13px] leading-relaxed text-mute">{reading ? "Reading your PDF…" : "No design yet. Drop a PDF on the page or choose one."}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={chooseFile} disabled={reading} title="Upload a PDF (U)">
          {upload ? "Upload another PDF" : "Choose a PDF"}
        </Button>
        {upload && (
          <Button onClick={() => setUpload(null)} aria-label="Close the uploaded design">
            Clear
          </Button>
        )}
      </div>
      <div className="space-y-2 text-[12px] leading-relaxed text-mute">
        <p>Works with print-ready PDFs of tuck-end cartons, crash-lock and snap-lock bottoms, shelf-ready trays and more. The dieline can be on its own layer or not, drawn with lines or outlined.</p>
        <p>In the 3D view, turn the carton to the angle you want, then save the angle or export a product image (transparent PNG) or a depth map.</p>
      </div>
    </div>
  );

  const issueCount = d.issues.filter((i) => i.severity !== "info").length;
  const tabs =
    mode === "upload"
      ? ([
          ["design", "Your design"],
          ["preview", "3D"],
        ] as const)
      : ([
          ["design", "Design"],
          ["preview", "Preview"],
          ["output", issueCount ? `Checks · ${issueCount}` : "Checks & export"],
        ] as const);

  return (
    <div
      className="relative flex h-dvh flex-col bg-bone"
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = [...e.dataTransfer.files].find((x) => x.type === "application/pdf" || /\.pdf$/i.test(x.name));
        if (f) onUpload(f);
      }}
    >
      <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { onUpload(e.target.files?.[0] ?? undefined); e.target.value = ""; }} />
      <header className="studio-bar relative z-10 flex h-14 shrink-0 items-center gap-3 px-3 sm:px-4">
        <Brand href={backHref} />
        <span className="hidden h-5 w-px bg-rule sm:block" />
        {mode === "make" && (
          <label className="group hidden min-w-0 flex-1 items-center rounded sm:flex hover:bg-paper/70 focus-within:bg-paper sm:max-w-[300px]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Project name"
              className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[16px] outline-none sm:text-[14px]"
            />
            <svg width="13" height="13" viewBox="0 0 14 14" className="mr-2 shrink-0 text-mute group-hover:text-ink" aria-hidden>
              <path d="M9.5 2.5 11.5 4.5 5 11H3V9z" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </label>
        )}
        {mode === "make" && (
          <span className="hidden whitespace-nowrap text-[11px] text-mute md:inline" title={local ? "Kept in this browser on this device" : undefined}>
            {save === "saving" ? "Saving…" : save === "unsaved" ? "Editing…" : save === "error" ? "Not saved" : local ? "Saved in this browser" : "Saved"}
          </span>
        )}
        <div className="flex shrink-0 overflow-hidden rounded-full border border-rule bg-paper text-[12px] sm:text-[13px] md:absolute md:left-1/2 md:-translate-x-1/2" role="group" aria-label="What to do">
          {(
            [
              ["make", "Make a dieline", "Make"],
              ["upload", "Upload a design", "Upload"],
            ] as const
          ).map(([v, l, short]) => (
            <button key={v} type="button" onClick={() => setMode(v)} aria-pressed={mode === v} className={`h-8 flex-1 whitespace-nowrap px-3 sm:px-4 ${mode === v ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
              <span className="hidden lg:inline">{l}</span>
              <span className="lg:hidden">{short}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {onNew && mode === "make" && (
            <button type="button" onClick={onNew} className="hidden h-8 rounded-md border border-rule bg-paper px-3 text-[12px] hover:border-ink sm:block">
              New
            </button>
          )}
          <Link href={backHref} className="flex h-8 items-center rounded-md border border-rule bg-paper px-3 text-[12px] hover:border-ink">
            {backHref === "/projects" ? "Projects" : "Home"}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={`${tab === "design" ? "block" : "hidden"} w-full overflow-y-auto border-r border-rule bg-bone lg:block lg:w-[330px] lg:shrink-0`}>
          {mode === "make" ? (
            <>
              <Controls p={params} d={d} set={set} onOpenContents={() => setContentsOpen(true)} />
              <p className="px-4 py-4 text-[11px] leading-relaxed text-mute">
                Dielines are generated from standard construction rules. Check the structure with a physical sample on the production board before ordering the cutting die.
              </p>
              {onNew && (
                <div className="px-4 pb-6 sm:hidden">
                  <Button onClick={onNew} className="w-full">
                    Start a new carton
                  </Button>
                </div>
              )}
            </>
          ) : (
            uploadSide
          )}
        </aside>
        <main className={`${tab === "preview" ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-bone lg:flex`}>
          <Preview
            d={d}
            layers={layers}
            onToggleLayer={toggleLayer}
            mode={mode}
            upload={upload}
            corrected={corrected}
            reading={reading}
            onChooseFile={chooseFile}
            highlight={highlight}
            onPanelClick={onPanelClick}
          />
        </main>
        {mode === "make" && (
          <aside className={`${tab === "output" ? "block" : "hidden"} w-full overflow-y-auto border-l border-rule bg-bone lg:block lg:w-[320px] lg:shrink-0`}>
            {output}
          </aside>
        )}
      </div>

      <nav className={`studio-bar grid shrink-0 ${mode === "upload" ? "grid-cols-2" : "grid-cols-3"} border-t border-rule pb-[env(safe-area-inset-bottom)] lg:hidden`}>
        {tabs.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`h-12 text-[13px] ${tab === k ? "font-medium text-ink" : "text-mute"}`}
            aria-pressed={tab === k}
          >
            <span className={`border-b-2 pb-1 ${tab === k ? "border-accent-dark" : "border-transparent"}`}>{l}</span>
          </button>
        ))}
      </nav>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-ink/40">
          <p className="rounded-lg bg-paper px-6 py-4 text-[15px] font-medium shadow-lg">Drop the PDF to fold it in 3D</p>
        </div>
      )}

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
