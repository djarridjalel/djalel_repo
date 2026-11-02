/** Only same-site paths are followed after sign-in (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/projects") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
