"use client";

import { useState } from "react";
import type { Model3D } from "@/lib/dieline/fold3d";
import { createShare, deleteShare, shareUrl, type ShareArt } from "@/lib/shares";
import { useLang } from "./LangProvider";
import { Button } from "./ui";

/** Creates a link anyone can open to turn this design in 3D, and turns it off again. */
export function ShareBox({ name, model, image, art }: { name: string; model: Model3D; image: HTMLCanvasElement | ImageBitmap; art: ShareArt }) {
  const { t } = useLang();
  const [link, setLink] = useState<{ id: string; path: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await createShare(name, model, image, art);
      setLink({ id, path: `${id}.jpg` });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Could not create the link."));
    } finally {
      setBusy(false);
    }
  };
  const off = async () => {
    if (!link) return;
    setBusy(true);
    try {
      await deleteShare({ id: link.id, art_path: link.path });
      setLink(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Could not turn the link off."));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(shareUrl(link.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the link stays selectable in the field */
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-rule bg-paper p-3">
      <p className="text-[13px] font-medium">{t("Share link")}</p>
      {link ? (
        <>
          <input readOnly dir="ltr" value={shareUrl(link.id)} onFocus={(e) => e.currentTarget.select()} className="h-9 w-full rounded-md border border-rule bg-bone px-2 font-mono text-[12px]" />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={copy}>{t(copied ? "Copied" : "Copy link")}</Button>
            <Button onClick={() => window.open(shareUrl(link.id), "_blank", "noopener")}>{t("Open")}</Button>
            <Button onClick={off} disabled={busy}>{t("Turn off")}</Button>
          </div>
        </>
      ) : (
        <Button onClick={create} disabled={busy}>{t(busy ? "Creating the link…" : "Create a share link")}</Button>
      )}
      <p className="text-[12px] leading-relaxed text-mute">{t("Anyone with the link can turn this carton in 3D, without an account. The artwork is stored until you turn the link off, here or in Projects.")}</p>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
