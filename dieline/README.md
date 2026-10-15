# Dielines — Djarri Design Studio

Print-ready dielines for pharmaceutical folding cartons.

- Styles: reverse tuck end, straight tuck end, crash-lock bottom, snap-lock (1-2-3) bottom
- Board-aware geometry (caliper allowances, inside/outside dimensions)
- Pharma layers: Braille (Marburg Medium), varnish-free coding window, pharmacode zone, glue and safe areas
- Checks with one-click fixes, production figures (rule lengths, board use)
- Exports: PDF (spot-colour layers), SVG (named layers), DXF R12
- Accounts, projects and versions on Supabase

## Develop

```bash
npm install
cp .env.example .env.local   # Supabase URL and anon key
npm run dev                  # http://localhost:3000 (the /demo editor works without Supabase)
npm test                     # geometry and export tests
```

## Layout

- `src/lib/dieline/` — geometry engine (no React): `resolve.ts` (defaults and checks), `closures.ts` (lids, flaps, lock bottoms), `carton.ts` (assembly), `pharma.ts`, `braille.ts`, `export/` (svg, pdf, dxf)
- `src/components/editor/` — editor UI
- `supabase/migrations/` — database schema with row-level security
