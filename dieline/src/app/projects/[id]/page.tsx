import { notFound, redirect } from "next/navigation";
import { CloudEditor } from "@/components/editor/EditorClient";
import { normalizeParams } from "@/lib/dieline";
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
  return <CloudEditor id={row.id} name={row.name} params={normalizeParams(row.params)} userLabel={label} />;
}
