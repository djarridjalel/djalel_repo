"use client";

import { useMemo, useState, useEffect } from "react";
import { DEFAULT_PARAMS } from "@/lib/dieline";
import { PRIVATE_STYLES, type CartonParams, type StyleId } from "@/lib/dieline/types";
import { clearLocalDraft, cloudStore, loadLocalDraft, localStore } from "@/lib/projects";
import { Editor } from "./Editor";
import { useLang } from "../LangProvider";

export function CloudEditor({ id, name, params, userLabel, extraStyles = [] }: { id: string; name: string; params: CartonParams; userLabel: string | null; extraStyles?: StyleId[] }) {
  const store = useMemo(() => cloudStore(id), [id]);
  return <Editor initialName={name} initialParams={params} store={store} userLabel={userLabel} backHref="/projects" extraStyles={extraStyles} />;
}

export function DemoEditor() {
  const { t } = useLang();
  const store = useMemo(() => localStore(), []);
  const [draft, setDraft] = useState<{ name: string; params: CartonParams } | null>(null);
  const [session, setSession] = useState(0);
  useEffect(() => {
    setDraft(loadLocalDraft() ?? { name: "Untitled carton", params: DEFAULT_PARAMS });
  }, []);
  if (!draft) return <div className="h-dvh bg-bone" />;
  const startNew = () => {
    if (!confirm(t("Start a new carton? The current one and its versions are removed from this browser."))) return;
    clearLocalDraft();
    setDraft({ name: "Untitled carton", params: DEFAULT_PARAMS });
    setSession((n) => n + 1);
  };
  // Local testing without accounts can show the private styles (never set in production).
  const extra = process.env.NEXT_PUBLIC_PRIVATE_STYLES === "true" ? PRIVATE_STYLES : [];
  return <Editor key={session} initialName={draft.name} initialParams={draft.params} store={store} backHref="/" onNew={startNew} local extraStyles={extra} />;
}
