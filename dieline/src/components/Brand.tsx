import Link from "next/link";

export function Brand({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="group flex items-baseline gap-2 leading-none" aria-label="Djarri Design Studio — Dielines">
      <span className={`text-[15px] font-semibold tracking-[0.18em] ${dark ? "text-paper" : "text-ink"}`}>DJARRI</span>
      <span className={`hidden font-mono text-[10px] uppercase tracking-[0.14em] sm:inline ${dark ? "text-paper/60" : "text-mute"}`}>Design Studio</span>
      <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${dark ? "text-accent" : "text-accent-dark"}`}>/ Dielines</span>
    </Link>
  );
}
