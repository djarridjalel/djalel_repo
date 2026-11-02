"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { translate, type Lang } from "@/lib/i18n";

const KEY = "dielines.lang";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (s) => s,
});

/** The chosen language, kept in the browser; Arabic turns the page right to left. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  }, []);
  const t = useCallback((s: string) => translate(lang, s), [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** EN / ع: shows the language it switches to. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      aria-label={lang === "ar" ? "English" : "العربية"}
      title={lang === "ar" ? "English" : "العربية"}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md border border-rule bg-paper px-2 text-[13px] hover:border-ink ${className}`}
    >
      {lang === "ar" ? "EN" : "ع"}
    </button>
  );
}
