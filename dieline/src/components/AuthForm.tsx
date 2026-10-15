"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { Button } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/projects";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(search.get("error"));
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabaseConfigured) {
    return (
      <p className="text-[14px] text-mute">
        Accounts are not configured on this deployment yet. <Link className="underline" href="/demo">Open the demo</Link> instead.
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const db = supabaseBrowser();
    try {
      if (mode === "signup") {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/projects` },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your inbox: we sent a link to confirm your email address.");
          return;
        }
      } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = "h-11 w-full rounded-md border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink";
  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && (
        <div>
          <label htmlFor="name" className="mb-1 block text-[12px] text-mute">Name</label>
          <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-[12px] text-mute">Email</label>
        <input id="email" type="email" required className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-[12px] text-mute">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          className={field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {mode === "signup" && <p className="mt-1 text-[12px] text-mute">At least 8 characters.</p>}
      </div>
      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}
      {notice && <p className="rounded-md bg-accent/20 px-3 py-2 text-[13px]">{notice}</p>}
      <Button type="submit" variant="primary" disabled={busy} className="h-11 w-full text-[14px]">
        {busy ? "Please wait…" : mode === "signup" ? "Create free account" : "Sign in"}
      </Button>
      <p className="pt-1 text-center text-[13px] text-mute">
        {mode === "signup" ? (
          <>Already have an account? <Link className="text-ink underline" href="/login">Sign in</Link></>
        ) : (
          <>New here? <Link className="text-ink underline" href="/signup">Create a free account</Link></>
        )}
      </p>
    </form>
  );
}
