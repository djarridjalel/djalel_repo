"use client";

import { useLang } from "./LangProvider";

/** Translates a fixed English string inside a server-rendered page. */
export function T({ children }: { children: string }) {
  const { t } = useLang();
  return <>{t(children)}</>;
}
