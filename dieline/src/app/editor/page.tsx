import { redirect } from "next/navigation";
import { DemoEditor } from "@/components/editor/EditorClient";
import { authEnabled } from "@/lib/supabase/env";

export const metadata = { title: "Editor · Dielines · Djarri Design Studio" };

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  // With accounts, every carton is a project: start a new one.
  if (authEnabled) {
    const { mode } = await searchParams;
    redirect(mode === "upload" ? "/projects/new?mode=upload" : "/projects/new");
  }
  return <DemoEditor />;
}
