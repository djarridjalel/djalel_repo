# Dielines — handoff

Pharma carton dieline generator for Djarri Design Studio. This file is the
single place to pick the project up in a new session or with another team.

Last updated: 2026-10-15

## Where things are

| What | Where |
| --- | --- |
| Live app | https://dielines.djarri.com (editor at `/editor`); also https://djarri-dielines.vercel.app |
| Domain | `djarri.com` DNS is at Hostinger (Premium Web Hosting, which cannot run Node.js apps). The `dielines` record is an ALIAS to Vercel's `c065e1b6e63f6698.vercel-dns-017.com.`; the domain is added to the Vercel project. The empty Hostinger subdomain site `dielines.djarri.com` is no longer reached and can be deleted in hPanel. |
| Code | GitHub `djarridjalel/djalel_repo`, branch `claude/dieline-app`, folder `dieline/` |
| Hosting | Vercel team `djalel` (`team_R3ImWvKPUJJH8XXoTq6UeC8E`), project `djarri-dielines` (`prj_nOwL5WguTII763eGsE1lWMcwgC4O`), root directory `dieline`, functions in `cdg1` (Paris) |
| Database | Supabase org `djarridjalel_Org`, project `djarri-dielines` (ref `zrljeosfrzncwisnarox`, region `eu-west-3`) |
| Model shortlist | https://claude.ai/artifact/4Er8hy2gmSiNxRRS8HWNgF — selection is stored in its database at `selections/current` (`models`, `note`, `updatedAt`) |

Environment variables on Vercel (all environments):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase publishable key).
`NEXT_PUBLIC_AUTH_ENABLED` is not set, which keeps accounts off.

## State today

Working and tested (34 unit tests, 37 end-to-end checks passing on the live site):

- Styles: reverse tuck end, straight tuck end, crash-lock bottom, snap-lock (1-2-3) bottom, shelf-ready tray with tear-away front (crash-lock or snap-lock bottom), gable box with handle (snap-lock bottom), mailer box (FEFCO 0427), counter display with sloped sides and header.
- Board library (GC1, GC2, SBS, GD2) with caliper allowances; inside or outside dimensions.
- Closures: slit, friction or plain tuck lock; tuck depth and radius; dust flaps; glue flap width and angle; base lock reach.
- Tamper evidence: glued tuck with perforation, or tear strip with thumb notch.
- Pharma layers: Braille (Marburg Medium, grade 1 with French accents), varnish-free coding window (batch/expiry or GS1 DataMatrix), pharmacode zone, glue areas, safe areas, panel names, grain arrow.
- Carton options: lock tab through the lid fold (tuck ends), hang tab (euro slot or round hole, double layer), window cut-out on any panel, zip strip round the body with a pull tab, perforated dispenser opening.
- Default carton (the studio's): reverse tuck end, outside 40 × 40 × 120 mm, GC1 300 g/m², slit lock, dust flaps 17.5 mm, glue flap 10 mm, other flaps automatic. Crash-lock and snap-lock open at 60 × 40 × 120 because lock bottoms need the length greater than the width.
- Size from blister and leaflet.
- Checks with one-click fixes, including an error when a perforation or cut crosses a glue area; production figures (flat size, cut and crease rule length, board use, blank weight).
- Exports: PDF (true scale, one spot colour and one layer per line type, overprint, title block), SVG (named layers), DXF R12 (named layers, mm). "Die-maker only" exports cut, crease, perforation and Braille.
- Accounts, projects and versions are built (Supabase, row-level security) but **switched off** for testing. Without accounts, work and versions are kept in the visitor's browser.
- Look: the studio website's bone ground, translucent top bar, DJARRI / DESIGN STUDIO mark, Poppins and IBM Plex Mono.

## Deploying

- Every push to `claude/dieline-app` builds a preview on Vercel (previews require Vercel login).
- Production was deployed from that branch through the Vercel API. The simplest path from now on: merge `claude/dieline-app` into `main`, which is the production branch; pushes to `main` then deploy production automatically. The project's ignore-build step only builds `main` and `claude/dieline-app`.

## Turning accounts on

1. Supabase dashboard, project `djarri-dielines`: Authentication > Sign In / Providers > Email > turn off **Confirm email** (Supabase's built-in email only reaches team members). Alternatively connect an SMTP provider. Either way set the Site URL to `https://dielines.djarri.com` and add `https://dielines.djarri.com/auth/callback` to the redirect URLs.
2. Vercel: add `NEXT_PUBLIC_AUTH_ENABLED=true` and redeploy.
3. Sign up at `/signup`; projects live at `/projects`.

Schema: `supabase/migrations/20261015000000_projects.sql` (tables `projects` and `project_versions`, owner-only policies). Already applied to the live project.

## Code map

```
src/lib/dieline/        geometry engine, no React
  geom.ts               points, lines, arcs, fillets, polygon helpers
  types.ts              parameters and output types
  boards.ts             board grades and calipers
  resolve.ts            defaults ("auto" values), allowances, checks and fixes
  closures.ts           lids, dust flaps, crash-lock and snap-lock flaps (local frame)
  carton.ts             assembles the four-panel tube and its closures (incl. shelf-ready tray, gable)
  styles.ts             one-piece styles that are not tubes: mailer 0427, counter display
  pharma.ts, braille.ts Braille, coding window, pharmacode, safe areas
  sizing.ts             size from blister and leaflet
  index.ts              generate(params) -> Dieline (adds bleed, stats, overlap check)
  export/               svg.ts, pdf.ts (pdf-lib), dxf.ts, common.ts (title block)
src/components/editor/  editor UI (Controls, Preview, Checks, Editor)
src/app/                pages: /, /editor, /login, /signup, /projects, /projects/[id]
scripts/e2e.mjs         end-to-end checks against a running site
```

Construction rules: left to right the blank is glue flap, Side B `W`, Front `L+t`, Side A `W+t`, Back `L+t` (free edge), so the joint closes at the back corner and tear lines from the front never cross it. The reverse tuck end is the exception: it follows the industry-standard layout supplied by the studio, glue flap, Front `L`, Side A `W+t`, Back `L+t`, Side B `W+t` (free edge), with stepped lead-in dust flaps (`classicDustPiece`) and a 35° glue flap; crash-lock glued corners sit on the creases folded flat on the gluer (Side B | Front, Side A | Back); any perforation or cut crossing a glue area is reported as an error; body height `H+t`; lid hinge one caliper out so the lid closes over the dust flaps; lid depth `W-t/2`. Lock bottoms need Length greater than Width.

### Adding a carton style

1. Add the id to `StyleId` in `types.ts` and a name/ECMA code in `export/common.ts`.
2. Draw new closure pieces in `closures.ts` (outline from `(0,0)` to `(w,0)`, `v` pointing away from the body).
3. Map which piece sits on which panel in `slotsFor()` in `carton.ts`; add limits and fixes in `resolve.ts`.
4. Add the style to the size grid in `dieline.test.ts`; the outline must close and never cross itself.
5. Add an icon in `StyleIcon.tsx`.

Styles that are not four-panel tubes get their own builder in `styles.ts` (see `buildMailer`, `buildDisplay`): build the right half of the outline clockwise from top centre to bottom centre and mirror it with `mirrorClose`, then dispatch to it in `generate()` (`index.ts`), add the style to `StyleId`, `STYLE_NAMES`, `StyleIcon` and the editor's style list.

## Commands

```bash
cd dieline
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests
npm run build
node scripts/e2e.mjs https://djarri-dielines.vercel.app e2e-out
```

## Open items

1. All ten models chosen on the shortlist (artifact database `selections/current`) are built: hang tab, tear strip (zip strip), lock tab, window, dispenser (carton options) and shelf-ready tray, gable, mailer 0427, counter display (styles); the pillow pack was built and later removed at the studio's request. The new styles follow the Cefbox reference drawings (gable, mailer, lock tab) or are the studio's own parametric design (counter display); all need a physical sample before production.
2. Mockup photos for the shortlist: Cefbox's images are on `res.cloudinary.com`, which the cloud session could not reach.
3. Validate crash-lock and snap-lock bottoms with a physical sample on production board before relying on them.
4. Turn accounts on (see above). Add password reset once an email provider is connected.
5. ECMA codes for crash-lock (A60.20) and snap-lock (A55.20) are family-level; confirm exact variants against the ECMA code book.
6. Board calipers are typical values; replace with the studio's supplier data.
7. Next features discussed: press-sheet layout with waste and cost, size families, client approval links, importing existing dielines, 3D preview, French and Arabic interface.

## Reference research

Cefbox (cefbox.com/dielines): 453 templates in 18 categories, server-generated dielines (`/api1/getSVG`, `/api1/getInsertSVG`), PDF/DXF export behind sign-up, small 3D fold preview, online design tool, funnels to their factory's quotes. Gaps this app targets: pharma layers, board-aware checks with fixes, named spot-colour layers, die-maker export, no login wall for exports.
