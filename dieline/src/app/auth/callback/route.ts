import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safeNext";
import { supabaseServer } from "@/lib/supabase/server";

// Google and the emailed sign-in link both land here.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const db = await supabaseServer();

  let ok = false;
  if (code) ok = !(await db.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await db.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  if (!ok) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("error", url.searchParams.get("error_description") ?? "The sign-in link is invalid or has expired. Ask for a new one.");
    return NextResponse.redirect(back);
  }

  // First sign-in: a short profile step before the app.
  const {
    data: { user },
  } = await db.auth.getUser();
  if (user) {
    const { data: profile } = await db.from("profiles").select("onboarded_at").eq("id", user.id).maybeSingle();
    if (!profile?.onboarded_at) {
      const welcome = new URL("/welcome", url.origin);
      welcome.searchParams.set("next", next);
      return NextResponse.redirect(welcome);
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
