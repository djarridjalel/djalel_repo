import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const db = await supabaseServer();
  await db.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
