import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { ProfileForm } from "@/components/ProfileForm";
import { safeNext } from "@/lib/safeNext";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Welcome · Dielines · Djarri Design Studio" };
export const dynamic = "force-dynamic";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("full_name,company,phone,onboarded_at").eq("id", user.id).maybeSingle();
  if (profile?.onboarded_at) redirect(next);
  const name = profile?.full_name || (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || "";
  return (
    <AuthShell title="Welcome" lead="One more step. Company and phone are optional.">
      <ProfileForm next={next} email={user.email ?? ""} initial={{ full_name: name, company: profile?.company ?? "", phone: profile?.phone ?? "" }} />
    </AuthShell>
  );
}
