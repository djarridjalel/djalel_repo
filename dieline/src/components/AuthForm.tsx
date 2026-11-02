"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeNext } from "@/lib/safeNext";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authEnabled } from "@/lib/supabase/env";
import { useLang } from "./LangProvider";
import { Button } from "./ui";

/** Sign in or sign up: Google, or a sign-in link sent by email. No passwords. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t } = useLang();
  const search = useSearchParams();
  const next = safeNext(search.get("next"));
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(search.get("error"));
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);

  if (!authEnabled) {
    return (
      <p className="text-[14px] text-mute">
        {t("Accounts are switched off for now.")} <Link className="underline" href="/editor">{t("Open the editor")}</Link>
      </p>
    );
  }

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const google = async () => {
    setBusy("google");
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    // On success the browser leaves for Google.
    if (error) {
      setError(error.message);
      setBusy(null);
    }
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback(), shouldCreateUser: true } });
    setBusy(null);
    if (error) setError(error.message);
    else setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-rule bg-paper p-4">
          <p className="text-[15px] font-medium">{t("Check your inbox")}</p>
          <p className="mt-1 text-[14px] text-mute">
            {t("We sent a sign-in link to")} <span dir="ltr" className="font-mono text-ink">{sentTo}</span>. {t("Open it on this device to continue. It expires in one hour.")}
          </p>
        </div>
        <button type="button" className="text-[13px] text-mute underline" onClick={() => setSentTo(null)}>
          {t("Use another email address")}
        </button>
      </div>
    );
  }

  const field = "h-11 w-full rounded-md border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink";
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={google}
        disabled={busy !== null}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-ink/25 bg-paper text-[14px] font-medium transition-colors hover:border-ink disabled:opacity-50"
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {busy === "google" ? t("Opening Google…") : t("Continue with Google")}
      </button>

      <div className="flex items-center gap-3 text-[12px] text-mute">
        <span className="h-px flex-1 bg-rule" />
        {t("or with your email")}
        <span className="h-px flex-1 bg-rule" />
      </div>

      <form onSubmit={sendLink} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-[12px] text-mute">{t("Email")}</label>
          <input id="email" type="email" dir="ltr" required className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@company.com" />
        </div>
        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{t(error)}</p>}
        <Button type="submit" variant="primary" disabled={busy !== null} className="h-11 w-full text-[14px]">
          {busy === "email" ? t("Sending…") : t("Email me a sign-in link")}
        </Button>
        <p className="text-[12px] text-mute">{t("No password needed. New here? The same link creates your free account.")}</p>
      </form>

      <p className="text-[12px] text-mute">
        {t("By continuing you accept our")} <Link href="/terms" className="underline">{t("terms of service")}</Link> {t("and")} <Link href="/privacy" className="underline">{t("privacy policy")}</Link>.
      </p>

      <p className="pt-1 text-center text-[13px] text-mute">
        {mode === "signup" ? (
          <>{t("Already have an account?")} <Link className="text-ink underline" href={`/login${next !== "/projects" ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("Sign in")}</Link></>
        ) : (
          <>{t("New here?")} <Link className="text-ink underline" href={`/signup${next !== "/projects" ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("Create a free account")}</Link></>
        )}
      </p>
    </div>
  );
}
