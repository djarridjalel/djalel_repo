"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_PARAMS } from "@/lib/dieline";
import type { CartonParams } from "@/lib/dieline/types";
import { createProject, deleteProject, renameProject } from "@/lib/projects";

export function NewProjectButton({ className = "" }: { className?: string }) {
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
            setError(e instanceof Error ? e.message : "Could not create the project.");
            setBusy(false);
          }
        }}
        className={`inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[14px] font-medium text-ink hover:brightness-95 disabled:opacity-50 ${className}`}
      >
        <span aria-hidden className="text-[18px] leading-none">+</span> {busy ? "Creating…" : "New carton"}
      </button>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export function ProjectMenu({ id, name, params }: { id: string; name: string; params: CartonParams }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setOpen(false);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "That did not work.");
    }
  };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-label="Project actions" className="flex h-8 w-8 items-center justify-center rounded hover:bg-bone">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="13" cy="8" r="1.4" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-40 overflow-hidden rounded-md border border-rule bg-paper py-1 text-[13px] shadow-lg">
          <button type="button" className="block w-full px-3 py-2 text-left hover:bg-bone" onClick={() => act(async () => { const n = prompt("Rename carton", name); if (n?.trim()) await renameProject(id, n.trim()); })}>Rename</button>
          <button type="button" className="block w-full px-3 py-2 text-left hover:bg-bone" onClick={() => act(async () => { const nid = await createProject(`${name} (copy)`, params); router.push(`/projects/${nid}`); })}>Duplicate</button>
          <button type="button" className="block w-full px-3 py-2 text-left text-danger hover:bg-bone" onClick={() => act(async () => { if (confirm(`Delete “${name}” and its versions?`)) await deleteProject(id); })}>Delete</button>
        </div>
      )}
    </div>
  );
}
