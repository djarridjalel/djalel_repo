"use client";

import Link from "next/link";
import { Brand } from "./Brand";
import { LangSwitch, useLang } from "./LangProvider";

const FEATURES: [string, string][] = [
  ["Nine carton styles", "Tuck ends, crash-lock and snap-lock bottoms, shelf-ready trays, gable box, mailer and counter display, each labelled with its ECMA code."],
  ["Board-aware geometry", "Every panel, lid and flap is compensated for the board caliper, from inside or outside dimensions."],
  ["Braille, coding and pharmacode", "Marburg Medium Braille, varnish-free coding windows and the pharmacode zone, placed on the panel you pick, clear of folds."],
  ["Checks with one-tap fixes", "Tucks too deep, flaps that collide, glue flaps too narrow for the folder-gluer: flagged on the dieline and fixed in one tap."],
  ["Your design, folded in 3D", "Upload a print-ready PDF: the dieline is found, checked and folded with your artwork. Export the angle, a product image and a depth map."],
  ["Files the printer accepts", "PDF with named spot-colour layers, SVG and DXF for the die-maker. Versions are saved to your account."],
];

export function Landing({ hero, signedIn, authEnabled }: { hero: string; signedIn: boolean; authEnabled: boolean }) {
  const { t, lang } = useLang();
  // Signed out, both entries go through sign-up and land in a new carton.
  const start = !authEnabled
    ? { make: "/editor", upload: "/editor?mode=upload" }
    : signedIn
      ? { make: "/projects/new", upload: "/projects/new?mode=upload" }
      : { make: `/signup?next=${encodeURIComponent("/projects/new")}`, upload: `/signup?next=${encodeURIComponent("/projects/new?mode=upload")}` };
  return (
    <div className="min-h-dvh bg-bone">
      <header className="studio-bar sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-6">
            <LangSwitch />
            {signedIn ? (
              <Link href="/projects" className="studio-link">{t("Projects")}</Link>
            ) : authEnabled ? (
              <>
                <Link href="/login" className="studio-link">{t("Sign in")}</Link>
                <Link href="/signup" className="inline-flex h-8 items-center rounded-md bg-ink px-3 text-[13px] text-paper hover:bg-accent hover:text-ink">{t("Sign up")}</Link>
              </>
            ) : (
              <Link href="/editor" className="studio-link">{t("Editor")}</Link>
            )}
          </nav>
        </div>
      </header>

      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">{t("Djarri Design Studio · Pharma packaging")}</p>
            <h1 className="mt-4 text-[40px] font-extralight leading-[1.02] tracking-[-0.035em] sm:text-[58px]">
              {lang === "ar" ? (
                <>
                  <b className="font-semibold">رسوم القطع</b> لعلب الأدوية، جاهزة <b className="font-semibold">لصانع القوالب.</b>
                </>
              ) : (
                <>
                  Pharma carton <b className="font-semibold">dielines</b>, ready for the <b className="font-semibold">die-maker.</b>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-mute">
              {t("Make a true-scale dieline from the carton size and the board, checked and ready as PDF, SVG or DXF. Or upload your packaging PDF and see your design folded in 3D.")}
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <Link href={start.make} className="group rounded-md bg-ink p-4 text-paper transition-colors hover:bg-accent hover:text-ink">
                <span className="block text-[15px] font-medium">{t("Make a dieline")} <span className="inline-block rtl:rotate-180">→</span></span>
                <span className="mt-1 block text-[13px] opacity-70">{t("Pick a style, enter the size, download.")}</span>
              </Link>
              <Link href={start.upload} className="group rounded-md border border-ink/25 p-4 text-ink transition-colors hover:border-ink">
                <span className="block text-[15px] font-medium">{t("Upload a design")} <span className="inline-block rtl:rotate-180">→</span></span>
                <span className="mt-1 block text-[13px] text-mute">{t("Fold your PDF in 3D and export angles.")}</span>
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-mute">
              {signedIn ? (
                <Link href="/projects" className="text-ink underline">{t("Open your projects")}</Link>
              ) : authEnabled ? (
                <>
                  {t("Free for now with an account. No software to install.")} <Link href="/login" className="text-ink underline">{t("Sign in")}</Link>
                </>
              ) : (
                t("Free. No account or software needed. Files stay on your device.")
              )}
            </p>
          </div>
          <div className="dieline-preview aspect-[4/3] w-full p-2 sm:p-6" dangerouslySetInnerHTML={{ __html: hero }} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-rule px-4 py-16 sm:px-6 sm:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">{t("What it does")}</p>
        <h2 className="mt-2 max-w-2xl text-[28px] font-medium leading-tight sm:text-[34px]">{t("Built for the cartons medicines ship in.")}</h2>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([h, b], i) => (
            <li key={h} className="border-t border-rule pt-4">
              <p className="font-mono text-[11px] text-mute">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-[17px] font-medium">{t(h)}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-mute">{t(b)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-14 flex flex-wrap items-center gap-4">
          <Link href={start.make} className="inline-flex h-12 items-center rounded-md bg-ink px-6 text-[15px] font-medium text-paper transition-colors hover:bg-accent hover:text-ink">
            {t("Make a dieline")}
          </Link>
          <Link href={start.upload} className="inline-flex h-12 items-center rounded-md border border-ink/25 px-6 text-[15px] text-ink transition-colors hover:border-ink">
            {t("Upload a design")}
          </Link>
          <p className="text-[13px] text-mute">{t("Dielines follow standard construction rules. Always check a physical sample on the production board.")}</p>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-[12px] text-mute sm:px-6">
          <span>© {new Date().getFullYear()} Djarri Design Studio</span>
          <span className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink">{t("Privacy policy")}</Link>
            <span className="font-mono uppercase tracking-wider">{t("Dielines")}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
