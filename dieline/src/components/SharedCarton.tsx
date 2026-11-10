"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Model3D } from "@/lib/dieline/fold3d";
import type { Artwork } from "./editor/Fold3D";
import { Brand } from "./Brand";
import { LangSwitch, useLang } from "./LangProvider";

const Fold3D = dynamic(() => import("./editor/Fold3D").then((m) => m.Fold3D), { ssr: false });

/** A shared design: the carton in 3D with its artwork, to turn and fold; nothing to edit. */
export function SharedCarton({ name, model, image, art }: { name: string; model: Model3D; image: string; art: { x0: number; y0: number; w: number; h: number } }) {
  const { t } = useLang();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      setArtwork({ image: c, ...art });
    };
    img.onerror = () => setFailed(true);
    img.src = image;
  }, [image, art]);

  return (
    <div className="flex h-dvh flex-col bg-bone">
      <header className="studio-bar flex h-14 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
        <Brand />
        <p className="min-w-0 truncate text-[14px] font-medium">{name}</p>
        <LangSwitch />
      </header>
      <main className="relative min-h-0 flex-1">
        {artwork ? (
          <Fold3D model={model} art={artwork} tools={false} />
        ) : (
          <p className="p-6 text-[14px] text-mute">{t(failed ? "The artwork could not be loaded." : "Loading the carton…")}</p>
        )}
      </main>
      <footer className="shrink-0 border-t border-rule px-4 py-2 text-[12px] text-mute sm:px-6">
        {t("Drag to turn the carton; use the slider to fold and unfold it.")} · <Link href="/" className="underline">dielines.djarri.com</Link>
      </footer>
    </div>
  );
}
