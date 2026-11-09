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

Working and tested (59 unit tests and the 79 end-to-end checks in `scripts/e2e.mjs` passing on the live site):

- Styles: reverse tuck end, straight tuck end, crash-lock bottom, snap-lock (1-2-3) bottom, shelf-ready tray with tear-away front (crash-lock or snap-lock bottom), gable box with handle (snap-lock bottom), mailer box (FEFCO 0427), counter display with sloped sides and header.
- Board library (GC1, GC2, SBS, GD2) with caliper allowances; inside or outside dimensions.
- Closures: slit, friction or plain tuck lock; tuck depth and radius; dust flaps; glue flap width and angle; base lock reach.
- Tamper evidence: glued tuck with perforation, or tear strip with thumb notch.
- Pharma layers: Braille (Marburg Medium, grade 1 with French accents), varnish-free coding window (batch/expiry or GS1 DataMatrix), pharmacode zone, glue areas, safe areas, panel names, grain arrow.
- Carton options: lock tab through the lid fold (tuck ends), hang tab (euro slot or round hole, double layer), window cut-out on any panel, zip strip round the body with a pull tab, perforated dispenser opening.
- Default carton (the studio's): reverse tuck end, outside 40 × 40 × 120 mm, GC1 300 g/m², slit lock, glue flap 10 mm, other flaps automatic. Dust flaps always reach the centre: their depth is half the inside length (no field). Crash-lock opens at 60 × 40 × 120 because crash-lock bottoms need the length greater than the width; snap-lock bottoms close either way round.
- Size from blister and leaflet.
- Closing check: every style is folded closed in software and its locks measured (lid cover, dust flap clearance, tuck depth; crash-lock reach past the centre, tongues passing, base closed; snap-lock tongue meeting the notch, tab fit and length, hook flaps lying over the notch flap without overlapping each other, their round lobes tucked under it; gable roofs meeting at the ridge on their ends, hand hole size; mailer and display walls, tabs and slots). Each closed end is drawn end-on under Checks, and a failed lock blocks export like any other error.
- 3D view (Preview › 3D, or click the turning 3D thumbnail in the flat view; in 3D a flat thumbnail leads back): every style folds from the flat blank to the closed carton with a slider, in its closing order; drag to turn it, pinch or scroll to zoom. Faces and hinges come from the same pieces as the dieline (`model3d` from `buildBlank`, `buildMailer`, `buildDisplay`), so it follows every change. Closed flaps stack a hair apart (`layer` × `gap`, 0.15 mm, along each face's normal) instead of passing through each other, and each end closes flap by flap in its working order; a tuck is folded in early and held pointing down while its lid comes over. A unit test sweeps every style's animation and fails if a face passes more than two boards through another for more than a moment (a long tray tuck brushes the dust flaps for an instant as it slides in, as real board flexes there). The 3D board is white on both sides; the snap-lock hook lobes and the tongue's tab dip under the notch flap. Cuts, creases and perforations inside a face are drawn on it. Shelf-ready trays get a second slider step, "On shelf": the parts bounded by the perforations (front above the tear, the side triangles and the dust flaps on them) come away and fade, then the lid stands up above the back wall as a header: its front half folds down over the middle crease on the tray side, so the thumb tab stands at the top, and the tuck goes down inside the back wall. On shelf-ready trays the tuck is therefore long: by default it runs down to 2 mm above the tear line (at most to the tear line), with corner radii up to 12 mm, so the header has more room for the design; closed, it lies inside the tear-away front (`remove`, `angle2` on `Face3D`).
- Upload design (the header's Make a dieline / Upload a design switch, `/editor?mode=upload`, the landing page's second button, the U key, or a PDF dropped anywhere on the editor): reads a packaging PDF in the browser (pdf.js; nothing is sent anywhere). The dieline is found by what its lines are, not by layer names: every line-only layer is taken (or, with no layers, every stroke; failing that, thin line-like filled shapes, for dielines converted to outlines — the colour reaching furthest out is the cut), lines not touching the blank (dimensions, text) are dropped, an outer line that only wraps a slightly larger copy of the blank (bleed, frame) is peeled off, and closed guide boxes that touch no cut are removed. Folds are the dashed (or differently coloured) lines; with neither, inner lines with board on both sides. The body is the widest pair of long horizontal folds joined by at least three panel folds; panel widths give L and W, the gap gives H; the bottom's folds give the family (diagonal folds: crash-lock; a fold across a lid: tuck end; none: snap-lock), fold lines from panel to panel inside the body mark a shelf-ready tray. The drawing is tried in all eight orientations (as drawn, mirrored, upside down, turned round, and each of those laid on its side); each candidate style is generated at the measured size and flap depths and laid over the upload on the body, and the closest outline wins. The upload's own flaps are traced and run through the closing checks that depend only on how far each flap reaches (dust flaps, tuck depth, crash reach, hook flaps overlapping); any failure is listed and the user is asked whether to correct it (the corrected dieline is the app's construction at the uploaded size, downloadable as PDF). The 3D view then shows the matched model with the page's artwork as its texture, with the dieline left out (its layers hidden; with no layers, its own strokes or filled shapes skipped as the page is drawn), without touching the editor's own carton.
- 3D angles and exports: Save angle (stored in the browser, relative to the carton so it fits any size), Product image (transparent PNG of the carton alone at the current view, up to 3000 px) and Depth map (white nearest, black farthest, linear across the carton), both from the same camera.
- Checks with one-click fixes, including an error when a perforation or cut crosses a glue area; production figures (flat size, cut and crease rule length, board use, blank weight).
- Exports: PDF (true scale, one spot colour and one layer per line type, overprint, title block), SVG (named layers), DXF R12 (named layers, mm). "Die-maker only" exports cut, crease, perforation and Braille.
- Accounts, projects and versions are built (Supabase, row-level security) but **switched off** for testing. Without accounts, work and versions are kept in the visitor's browser.
- Editor layout: the header switches between the two jobs (Make a dieline / Upload a design); the project name has an edit pencil, the save state reads "Saved in this browser", New and Home are buttons (New moves to the bottom of the Design tab on phones). Making: the left column shows the chosen style as one row (Change opens the tiles), then Size; every collapsed section shows a one-line summary of its settings. The preview toolbar has Flat/3D and one Layers menu (checkboxes). Hovering a panel highlights it and names its size; clicking it opens and focuses the field that sizes it (`focus.ts`: `fieldOfPanel`, `FIELD_SECTIONS`, sections open on the `dieline:focus` event). A check with a field has "Show on the dieline": it focuses the field and highlights the panels it shapes. Labels and dimensions never shrink below 9 px on screen; a scale bar follows the zoom. Keys: F flat/3D, + − zoom, 0 fit, U upload, D download PDF. Uploading: the left column holds the file, its match, its problems and the correct/keep choice; the preview is an empty drop zone until a file is read, then the 3D view.
- Arabic: an EN / ع switch (header of the landing page and the editor, kept in the browser) turns the whole app into Arabic, right to left, in IBM Plex Sans Arabic. All text is written in English and translated where it is shown (`src/lib/i18n`: `translate`, the `AR` dictionary and `AR_PATTERNS` for messages with numbers); a unit test fails if any interface string, panel name, check or issue message lacks Arabic. In Arabic the panel names on the dieline and the PDF/SVG title block are Arabic too; the PDF embeds IBM Plex Sans Arabic (`public/fonts`, OFL) with fontkit and orders each line by the bidi rules (`visualRuns`), the title block set against the right margin. DXF stays in English (its TEXT entities cannot join Arabic letters).
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
  fold.ts               closing check: folds tube closures onto the opening and measures the locks
  fold3d.ts             3D folding: rigid faces hinged on the creases, posed from flat (0) to closed (1)
src/lib/upload/         reading an uploaded PDF: pdfDieline.ts (lines and layers), analyse.ts (blank, folds, body), match.ts (style and size, checks), index.ts (browser entry, artwork)
  styles.ts             one-piece styles that are not tubes: mailer 0427, counter display
  pharma.ts, braille.ts Braille, coding window, pharmacode, safe areas
  sizing.ts             size from blister and leaflet
  index.ts              generate(params) -> Dieline (adds bleed, stats, overlap check)
  export/               svg.ts, pdf.ts (pdf-lib), dxf.ts, common.ts (title block)
src/components/editor/  editor UI (Controls, Preview, Fold3D, Checks, Editor)
src/app/                pages: /, /editor, /login, /signup, /projects, /projects/[id]
scripts/e2e.mjs         end-to-end checks against a running site
```

Construction rules: left to right the blank is glue flap, Side B `W`, Front `L+t`, Side A `W+t`, Back `L+t` (free edge), so the joint closes at the back corner and tear lines from the front never cross it. The reverse tuck end is the exception: it follows the industry-standard layout supplied by the studio, glue flap, Front `L`, Side A `W+t`, Back `L+t`, Side B `W+t` (free edge), with stepped lead-in dust flaps (`classicDustPiece`) and a 35° glue flap; crash-lock glued corners sit on the creases folded flat on the gluer (Side B | Front, Side A | Back); any perforation or cut crossing a glue area is reported as an error; body height `H+t`; lid hinge one caliper out so the lid closes over the dust flaps; lid depth `W-t/2`. Crash-lock bottoms need Length greater than Width. Snap-lock (1-2-3) bottoms: the tongue narrows to its tab exactly at the notch's inner edge, on the centre line; the tab is as long as the notch is deep (the base lock reach); notch width 40 % of the length, tab width the notch less one caliper of play each side (at least 0.75 mm). Each hook flap stops just short of the centre (max(1.5 mm, 2 calipers)), so the two never overlap; its round lobe is a half disc on the notch's inner edge running from the notch's near corner to the hook's tip, bulging under the notch flap; each hook's diagonal faces the notch panel. Closing order: notch flap first; the hook flaps over it, lobes tucked under it; the tongue flap last, over everything, its tab tucked under the notch flap. (The studio's `new_Boite.pdf` had hook flaps reaching 85 % across, which overlap each other; the 3D view showed it.) Gable tops: roofs slope at 35° from the front and back walls to the ridge and rest on uncreased triangular gable ends; the handle stands up from the ridge and needs a hand hole of at least 45 × 20 mm.

### Door box (private style)

`doorbox` in `styles.ts` (`buildDoorBox`): glue flap, back (thumb notch, bottom lid), side A, door outer, door inner, inner front (top lid), side B. Door layers glue back to back (3 | 4 at 180°), 4 | 5 is a reverse fold. Fixed sizes in `DOOR` (tab 10 × 30, slit 32, half-moon r 7.366, tuck 14.5) match the produced Natural Skin carton; `dieline.test.ts` pins it to the reference at 60 × 60 × 150, t 0.4 (inside 59.6 × 59.6 × 149.6). Listed only for accounts whose `profiles.styles` contains it (`PRIVATE_STYLES` in `types.ts`); users cannot write that column. Local testing without accounts: `NEXT_PUBLIC_AUTH_ENABLED=false NEXT_PUBLIC_PRIVATE_STYLES=true npm run dev`. The geometry still ships to the browser, so this hides the style but does not protect it.

### Adding a carton style

1. Add the id to `StyleId` in `types.ts` and a name/ECMA code in `export/common.ts`.
2. Draw new closure pieces in `closures.ts` (outline from `(0,0)` to `(w,0)`, `v` pointing away from the body).
3. Map which piece sits on which panel in `slotsFor()` in `carton.ts`; add limits and fixes in `resolve.ts`.
4. Add the style to the size grids in `dieline.test.ts` (outline and closing check); the outline must close, never cross itself, and every closing check must pass. Tube closures are checked in `fold.ts`; give new slots a branch there (or `meta` from `metaFor()` in `carton.ts`). One-piece styles return their own checks from `finish()` in `styles.ts`.
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
