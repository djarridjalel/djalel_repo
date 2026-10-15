"use client";

import { useMemo, useState, useEffect } from "react";
import { DEFAULT_PARAMS } from "@/lib/dieline";
import type { CartonParams } from "@/lib/dieline/types";
import { cloudStore, loadLocalDraft, localStore } from "@/lib/projects";
import { Editor } from "./Editor";

export function CloudEditor({ id, name, params, userLabel }: { id: string; name: string; params: CartonParams; userLabel: string | null }) {
  const store = useMemo(() => cloudStore(id), [id]);
  return <Editor initialName={name} initialParams={params} store={store} userLabel={userLabel} backHref="/projects" />;
}

export function DemoEditor() {
  const store = useMemo(() => localStore(), []);
  const [draft, setDraft] = useState<{ name: string; params: CartonParams } | null>(null);
  useEffect(() => {
    setDraft(loadLocalDraft() ?? { name: "Demo carton", params: DEFAULT_PARAMS });
  }, []);
  if (!draft) return <div className="h-dvh bg-bone" />;
  return <Editor initialName={draft.name} initialParams={draft.params} store={store} backHref="/" />;
}
