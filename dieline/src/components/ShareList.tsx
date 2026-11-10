"use client";

import { useEffect, useState } from "react";
import { deleteShare, listShares, shareUrl, type ShareRow } from "@/lib/shares";
import { useLang } from "./LangProvider";

/** The owner's share links, each with copy and turn off. */
export function ShareList() {
  const { t } = useLang();
  const [rows, setRows] = useState<ShareRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listShares().then(setRows, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  if (error) return <p className="mt-6 text-[13px] text-danger">{error}</p>;
  if (!rows || rows.length === 0) return null;
  const off = async (r: ShareRow) => {
    try {
      await deleteShare(r);
      setRows((x) => (x ?? []).filter((q) => q.id !== r.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <section className="mt-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">{t("Shared links")}</p>
      <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-paper">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]">
            <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
            <a href={shareUrl(r.id)} target="_blank" rel="noopener" dir="ltr" className="max-w-full truncate font-mono text-[12px] text-mute underline">
              {shareUrl(r.id).replace(/^https?:\/\//, "")}
            </a>
            <button type="button" className="text-mute underline hover:text-ink" onClick={() => navigator.clipboard?.writeText(shareUrl(r.id)).catch(() => {})}>
              {t("Copy link")}
            </button>
            <button type="button" className="text-danger underline" onClick={() => off(r)}>
              {t("Turn off")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
