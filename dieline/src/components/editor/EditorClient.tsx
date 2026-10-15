"use client";

import { useMemo, useState, useEffect } from "react";
import { DEFAULT_PARAMS } from "@/lib/dieline";
import type { CartonParams } from "@/lib/dieline/types";
import { clearLocalDraft, cloudStore, loadLocalDraft, localStore } from "@/lib/projects";
import { Editor } from "./Editor";

export function CloudEditor({ id, name, params, userLabel }: { id: string; name: string; params: CartonParams; userLabel: string | null }) {
  const store = useMemo(() => cloudStore(id), [id]);
  return <Editor initialName={name} initialParams={params} store={store} userLabel={userLabel} backHref="/projects" />;
}

export function DemoEditor() {
  const store = useMemo(() => localStore(), []);
  const [draft, setDraft] = useState<{ name: string; params: CartonParams } | null>(null);
  const [session, setSession] = useState(0);
  useEffect(() => {
    setDraft(loadLocalDraft() ?? { name: "Untitled carton", params: DEFAULT_PARAMS });
  }, []);
  if (!draft) return <div className="h-dvh bg-bone" />;
  const startNew = () => {
    if (!confirm("Start a new carton? The current one and its versions are removed from this browser.")) return;
    clearLocalDraft();
    setDraft({ name: "Untitled carton", params: DEFAULT_PARAMS });
    setSession((n) => n + 1);
  };
  return <Editor key={session} initialName={draft.name} initialParams={draft.params} store={store} backHref="/" onNew={startNew} />;
}
