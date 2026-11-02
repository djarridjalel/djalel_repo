"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearLocalDraft, cloudStore, createProject, loadLocalDraft, loadLocalVersions } from "@/lib/projects";
import { useLang } from "./LangProvider";

/**
 * A carton made in this browser before signing in becomes a project in the
 * account (with its versions), then the browser copy is removed.
 */
export function DraftImport() {
  const { t } = useLang();
  const router = useRouter();
  const done = useRef(false);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const draft = loadLocalDraft();
    if (!draft) return;
    setState("busy");
    (async () => {
      try {
        const id = await createProject(draft.name, draft.params);
        const store = cloudStore(id);
        // Oldest first, so the version numbers keep their order.
        for (const v of [...loadLocalVersions()].sort((a, b) => a.version - b.version)) await store.createVersion(v.params, v.label);
        clearLocalDraft();
        router.push(`/projects/${id}`);
      } catch {
        setState("error");
      }
    })();
  }, [router]);
  if (state === "busy") return <p className="mt-6 rounded-md bg-accent/20 px-3 py-2 text-[13px]">{t("Saving the carton from this browser to your account…")}</p>;
  if (state === "error") return <p className="mt-6 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{t("Could not save the carton from this browser to your account. It is still in this browser.")}</p>;
  return null;
}
