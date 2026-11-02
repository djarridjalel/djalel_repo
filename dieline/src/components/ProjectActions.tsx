"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_PARAMS } from "@/lib/dieline";
import type { CartonParams } from "@/lib/dieline/types";
import { createProject, deleteProject, renameProject } from "@/lib/projects";
import { useLang } from "./LangProvider";

export function NewProjectButton({ className = "" }: { className?: string }) {
  const { t } = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const id = await createProject("Untitled carton", DEFAULT_PARAMS);
            router.push(`/projects/${id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : t("Could not create the project."));
            setBusy(false);
          }
        }}
        className={`inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-accent hover:text-ink disabled:opacity-50 ${className}`}
      >
        <span aria-hidden className="text-[18px] leading-none">+</span> {busy ? t("Creating…") : t("New carton")}
      </button>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export function ProjectMenu({ id, name, params }: { id: string; name: string; params: CartonParams }) {
  const { t } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setOpen(false);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("That did not work."));
    }
  };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-label={t("Project actions")} className="flex h-8 w-8 items-center justify-center rounded hover:bg-bone">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="13" cy="8" r="1.4" /></svg>
      </button>
      {open && (
        <div className="absolute end-0 top-9 z-10 w-40 overflow-hidden rounded-md border border-rule bg-paper py-1 text-[13px] shadow-lg">
          <button type="button" className="block w-full px-3 py-2 text-start hover:bg-bone" onClick={() => act(async () => { const n = prompt(t("Rename carton"), name); if (n?.trim()) await renameProject(id, n.trim()); })}>{t("Rename")}</button>
          <button type="button" className="block w-full px-3 py-2 text-start hover:bg-bone" onClick={() => act(async () => { const nid = await createProject(`${name} (${t("copy")})`, params); router.push(`/projects/${nid}`); })}>{t("Duplicate")}</button>
          <button type="button" className="block w-full px-3 py-2 text-start text-danger hover:bg-bone" onClick={() => act(async () => { if (confirm(t("Delete “{name}” and its versions?").replace("{name}", name))) await deleteProject(id); })}>{t("Delete")}</button>
        </div>
      )}
    </div>
  );
}
