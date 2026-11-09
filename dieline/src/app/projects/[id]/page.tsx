import { notFound, redirect } from "next/navigation";
import { CloudEditor } from "@/components/editor/EditorClient";
import { normalizeParams, PRIVATE_STYLES, type StyleId } from "@/lib/dieline";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${id}`);
  const { data: row } = await db.from("projects").select("id,name,params").eq("id", id).maybeSingle();
  if (!row) notFound();
  const label = (user.user_metadata?.full_name as string | undefined) || user.email || null;
  // Styles made for one account are listed only for it (set by the studio in the profile, not by the user).
  const { data: profile } = await db.from("profiles").select("styles").eq("id", user.id).maybeSingle();
  const extraStyles = ((profile?.styles as string[] | null) ?? []).filter((s): s is StyleId => PRIVATE_STYLES.includes(s as StyleId));
  return <CloudEditor id={row.id} name={row.name} params={normalizeParams(row.params)} userLabel={label} extraStyles={extraStyles} />;
}
