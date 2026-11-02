import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_PARAMS } from "@/lib/dieline";
import { supabaseServer } from "@/lib/supabase/server";

// Starts a new carton and opens it (?mode=upload opens the upload side).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url.origin));
  const { data, error } = await db.from("projects").insert({ name: "Untitled carton", params: DEFAULT_PARAMS }).select("id").single();
  if (error || !data) return NextResponse.redirect(new URL("/projects", url.origin));
  const dest = new URL(`/projects/${data.id}`, url.origin);
  if (url.searchParams.get("mode") === "upload") dest.searchParams.set("mode", "upload");
  return NextResponse.redirect(dest);
}
