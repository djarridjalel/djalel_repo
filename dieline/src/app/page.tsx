import Link from "next/link";
import { Brand } from "@/components/Brand";
import { DEFAULT_PARAMS, generate } from "@/lib/dieline";
import { renderSvg } from "@/lib/dieline/export/svg";
import { authEnabled } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

const FEATURES: [string, string][] = [
  ["Four pharma styles", "Reverse and straight tuck end, crash-lock and snap-lock bottoms, each labelled with its ECMA code."],
  ["Board-aware geometry", "Every panel, lid and flap is compensated for the board caliper, from inside or outside dimensions."],
  ["Braille, Marburg Medium", "Type the product name and the dots are placed on the panel you choose, kept clear of folds and edges."],
  ["Coding and pharmacode zones", "Varnish-free windows for batch, expiry and the GS1 DataMatrix, plus the pharmacode zone, on the panel you pick."],
  ["Checks with one-tap fixes", "Tucks that are too deep, flaps that collide, glue flaps too narrow for the folder-gluer: flagged and fixed."],
  ["Files the printer accepts", "PDF with named spot-colour layers, SVG and DXF for the die-maker. Projects keep every version."],
];

export default async function Home() {
  let signedIn = false;
  if (authEnabled) {
    const db = await supabaseServer();
    const {
      data: { user },
    } = await db.auth.getUser();
    signedIn = !!user;
  }
  const hero = renderSvg(generate({ ...DEFAULT_PARAMS, L: 70, W: 28, H: 120, showDimensions: false, safeMargin: 0, bleed: 0 }), {
    layers: new Set(["cut", "crease"]),
    margin: 2,
    blankFill: "#ffffff",
  })
    .replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="100%" height="100%"')
    .replace(/stroke="#E30613" color="#E30613"/, 'stroke="#0A0A0B" color="#0A0A0B"')
    .replace(/stroke="#00A651" color="#00A651"/, 'stroke="#6E5400" color="#6E5400"');

  const primary = signedIn
    ? { href: "/projects", label: "Open your projects" }
    : authEnabled
      ? { href: "/signup", label: "Create a free account" }
      : { href: "/editor", label: "Open the editor" };

  return (
    <div className="min-h-dvh bg-bone">
      <header className="studio-bar sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-6">
            {signedIn ? (
              <Link href="/projects" className="studio-link">Projects</Link>
            ) : authEnabled ? (
              <>
                <Link href="/login" className="studio-link">Sign in</Link>
                <Link href="/signup" className="studio-link">Sign up</Link>
              </>
            ) : (
              <Link href="/editor" className="studio-link">Editor</Link>
            )}
          </nav>
        </div>
      </header>

      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">Djarri Design Studio · Pharma packaging</p>
            <h1 className="mt-4 text-[40px] font-extralight leading-[1.02] tracking-[-0.035em] sm:text-[58px]">
              Pharma carton <b className="font-semibold">dielines</b>, ready for the <b className="font-semibold">die-maker.</b>
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-mute">
              Enter the carton size and the board. Get a true-scale dieline with Braille, coding window and pharmacode zones, checked and ready as PDF, SVG or DXF.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={primary.href} className="inline-flex h-12 items-center rounded-md bg-ink px-6 text-[15px] font-medium text-paper transition-colors hover:bg-accent hover:text-ink">
                {primary.label}
              </Link>
              {!signedIn && authEnabled && (
                <Link href="/login" className="inline-flex h-12 items-center rounded-md border border-ink/25 px-6 text-[15px] text-ink transition-colors hover:border-ink">
                  Sign in
                </Link>
              )}
            </div>
            <p className="mt-4 text-[13px] text-mute">{authEnabled ? "Free with an account. No software to install." : "Free. No account or software needed."}</p>
          </div>
          <div className="dieline-preview aspect-[4/3] w-full p-2 sm:p-6" dangerouslySetInnerHTML={{ __html: hero }} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-rule px-4 py-16 sm:px-6 sm:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">What it does</p>
        <h2 className="mt-2 max-w-2xl text-[28px] font-medium leading-tight sm:text-[34px]">Built for the cartons medicines ship in, not for mailer boxes.</h2>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, b], i) => (
            <li key={t} className="border-t border-rule pt-4">
              <p className="font-mono text-[11px] text-mute">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-[17px] font-medium">{t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-mute">{b}</p>
            </li>
          ))}
        </ul>
        <div className="mt-14 flex flex-wrap items-center gap-4">
          <Link href={primary.href} className="inline-flex h-12 items-center rounded-md bg-ink px-6 text-[15px] font-medium text-paper transition-colors hover:bg-accent hover:text-ink">
            {primary.label}
          </Link>
          <p className="text-[13px] text-mute">Dielines follow standard construction rules. Always check a physical sample on the production board.</p>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-[12px] text-mute sm:px-6">
          <span>© {new Date().getFullYear()} Djarri Design Studio</span>
          <span className="font-mono uppercase tracking-wider">Dielines</span>
        </div>
      </footer>
    </div>
  );
}
