// Two languages: English (the source text) and Arabic. Text is written in
// English everywhere and translated where it is shown, so the generator, the
// checks and the exports keep one source of truth.

import { AR, AR_PATTERNS } from "./ar";

export type Lang = "en" | "ar";

/** The Arabic for an English string: an exact entry, else a pattern with its numbers carried over, else the English. */
export function translate(lang: Lang, s: string): string {
  if (lang === "en" || !s) return s;
  const hit = AR[s];
  if (hit !== undefined) return hit;
  for (const [re, f] of AR_PATTERNS) {
    const m = s.match(re);
    if (m) return f(m, (x: string) => translate(lang, x));
  }
  return s;
}

export const isRtl = (lang: Lang) => lang === "ar";
