"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLang } from "./LangProvider";
import { Button } from "./ui";

type Profile = { full_name: string; company: string; phone: string };

/** The one-time step after the first sign-in: name, and optionally company and phone. */
export function ProfileForm({ next, email, initial }: { next: string; email: string; initial: Profile }) {
  const { t } = useLang();
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (skip: boolean) => {
    setBusy(true);
    setError(null);
    const db = supabaseBrowser();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const clean = (s: string) => s.trim() || null;
    const row = skip
      ? { id: user.id, full_name: clean(p.full_name), onboarded_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { id: user.id, full_name: clean(p.full_name), company: clean(p.company), phone: clean(p.phone), onboarded_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await db.from("profiles").upsert(row);
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const field = "h-11 w-full rounded-md border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink";
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
    >
      <p className="text-[13px] text-mute">
        {t("Signed in as")} <span dir="ltr" className="font-mono text-ink">{email}</span>
      </p>
      <div>
        <label htmlFor="name" className="mb-1 block text-[12px] text-mute">{t("Name")}</label>
        <input id="name" className={field} value={p.full_name} onChange={set("full_name")} autoComplete="name" maxLength={200} />
      </div>
      <div>
        <label htmlFor="company" className="mb-1 block text-[12px] text-mute">{t("Company or studio (optional)")}</label>
        <input id="company" className={field} value={p.company} onChange={set("company")} autoComplete="organization" maxLength={200} />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-[12px] text-mute">{t("Phone (optional)")}</label>
        <input id="phone" type="tel" dir="ltr" className={field} value={p.phone} onChange={set("phone")} autoComplete="tel" maxLength={40} />
      </div>
      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy} className="h-11 w-full text-[14px]">
        {busy ? t("Please wait…") : t("Continue")}
      </Button>
      <button type="button" disabled={busy} onClick={() => save(true)} className="w-full text-center text-[13px] text-mute underline disabled:opacity-50">
        {t("Skip for now")}
      </button>
    </form>
  );
}
