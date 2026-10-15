import Link from "next/link";

// The studio's mark, set as on djarri.design: bold DJARRI, light DESIGN
// STUDIO, capitals at a slight track. `tone="accent"` uses the accent's dark
// stop, as the website's hero bar does on bone.
export function Brand({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "accent" }) {
  return (
    <Link href={href} className="flex items-baseline gap-2 leading-none" aria-label="Djarri Design Studio — Dielines">
      <span className={`whitespace-nowrap text-[15px] tracking-[0.06em] ${tone === "accent" ? "text-accent-dark" : "text-ink"}`}>
        <span className="font-bold">DJARRI</span>
        <span className="ml-[0.5em] hidden font-light sm:inline">DESIGN STUDIO</span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">/ Dielines</span>
    </Link>
  );
}
