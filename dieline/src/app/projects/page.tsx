import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { NewProjectButton, ProjectMenu } from "@/components/ProjectActions";
import { generate, normalizeParams } from "@/lib/dieline";
import { STYLE_NAMES } from "@/lib/dieline/export/common";
import { renderSvg } from "@/lib/dieline/export/svg";
import { supabaseServer } from "@/lib/supabase/server";
import { authEnabled } from "@/lib/supabase/env";

export const metadata = { title: "Projects · Dielines · Djarri Design Studio" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  if (!authEnabled) redirect("/editor");
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: rows, error } = await db.from("projects").select("id,name,params,updated_at").order("updated_at", { ascending: false });

  return (
    <div className="min-h-dvh bg-bone">
      <header className="studio-bar sticky top-0 z-20 flex h-14 items-center justify-between px-4 sm:px-6">
        <Brand href="/projects" />
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[220px] truncate font-mono text-[12px] text-mute sm:inline">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="studio-link">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">Your cartons</p>
            <h1 className="mt-1 text-[28px] font-medium">Projects</h1>
          </div>
          <NewProjectButton />
        </div>
        {error && <p className="mt-6 text-[14px] text-danger">Could not load projects: {error.message}</p>}
        {rows && rows.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-rule bg-paper/60 p-10 text-center">
            <p className="text-[16px]">No cartons yet.</p>
            <p className="mt-1 text-[14px] text-mute">Start with a reverse tuck end and adjust from there.</p>
          </div>
        )}
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rows ?? []).map((row) => {
            const params = normalizeParams(row.params);
            const d = generate(params);
            const thumb = renderSvg(d, { layers: new Set(["cut", "crease"]), margin: 4, blankFill: "#ffffff" })
              .replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="100%" height="100%"');
            return (
              <li key={row.id} className="group overflow-hidden rounded-lg border border-rule bg-paper transition hover:border-ink">
                <Link href={`/projects/${row.id}`} className="block">
                  <div className="dieline-preview h-44 bg-[#f3f2ef] p-3" dangerouslySetInnerHTML={{ __html: thumb }} />
                </Link>
                <div className="flex items-start justify-between gap-2 p-4">
                  <Link href={`/projects/${row.id}`} className="min-w-0">
                    <p className="truncate text-[15px] font-medium">{row.name}</p>
                    <p className="mt-0.5 text-[12px] text-mute">
                      {STYLE_NAMES[params.style].name} · {params.L} × {params.W} × {params.H} mm
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-mute">Edited {new Date(row.updated_at).toLocaleDateString("en-GB")}</p>
                  </Link>
                  <ProjectMenu id={row.id} name={row.name} params={params} />
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
