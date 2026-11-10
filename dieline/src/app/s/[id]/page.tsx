import { notFound } from "next/navigation";
import { SharedCarton } from "@/components/SharedCarton";
import type { Model3D } from "@/lib/dieline/fold3d";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Share = { name: string; model: Model3D; art_path: string; art: { x0: number; y0: number; w: number; h: number } };

async function load(id: string): Promise<Share | null> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(id)) return null;
  const db = await supabaseServer();
  const { data } = await db.rpc("get_share", { share_id: id });
  return ((data as Share[] | null) ?? [])[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const s = await load((await params).id);
  return { title: s ? `${s.name} · Dielines · Djarri Design Studio` : "Dielines · Djarri Design Studio", robots: { index: false } };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await load((await params).id);
  if (!s) notFound();
  const image = `${SUPABASE_URL}/storage/v1/object/public/shares/${s.art_path}`;
  return <SharedCarton name={s.name} model={s.model} image={image} art={s.art} />;
}
