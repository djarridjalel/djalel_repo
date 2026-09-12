# Djarri Design Portfolio — working handoff

Written so a second session can pick this up cold and work in parallel without
re-deriving anything. Everything below was verified against the code, not
recalled.

---

## 1. What this is

A portfolio site for **Abdeldjalil Djarri**, Creative Director in
pharmaceutical / parapharmaceutical / skincare packaging and branding, aimed at
a job search with relocation to Switzerland. Branded *DJARRI DESIGN PORTFOLIO*.

Static HTML/CSS/JS — no build step, no framework, no dependencies. Every page
links `assets/site.css` and `assets/site.js`. There is nothing to compile: open
`index.html` on a static server and it runs.

## 2. Repos and branches

| Repo | Path | Branch | Role |
|---|---|---|---|
| `djarridjalel/djalel_repo` | `/home/user/djalel_repo` | `claude/file-review-x8u3gi` | **current** — all recent work |
| `djarridjalel/potfolio` | `/home/user/potfolio` | `claude/file-review-x8u3gi` | behind; separate history |

The two hold the same project under **separate histories** — identical commit
subjects, different hashes. They were pushed independently, never mirrored.
They are byte-identical at their common point ("Half again as wide an
aperture"); `djalel_repo` has all the lens work since.

`main` on both still holds only a README. All work lives on the branch above.

**If you are the second session: work in `djalel_repo` unless told otherwise,**
and pull before you start — the other session may have pushed.

## 3. Standing constraints

- **The hero section of `index.html` is locked.** No design changes to its
  markup, its inline `<style>`, or its inline `<script>`. It is the one part of
  the page that is finished.
- **FTPS password is never written down.** Host `ftp.portfolio.wekom.net`,
  user `u367975533.portfolio`; the password is the user's and must never be
  printed, echoed, saved to a file, or committed.
- **Do not hand over the deployment zip unless explicitly asked.**
- Pushes go to `claude/file-review-x8u3gi`. Never to `main` without asking.

## 4. Layout

```
index.html            homepage — locked hero, 3 showcase reels, bands
about.html            biography
archive.html          selected archive grid
work/                 evolab.html, laformul.html, natural-solution.html
editor.html           content editor (publish / versions / preview / download)
assets/site.css       every shared style, including the whole reel
assets/site.js        the reel, the lens, marquee, cursor, reveal observer
assets/content.js     applies content.json; applies the draft only under ?preview=1
assets/content.json   published content overrides
assets/posters/       15 real A4 posters (900x1273) — the reel images
assets/logos/         client logos (strip currently hidden)
api/publish.php       writes content.json + a versioned copy
api/setup.php         one-time password setup
```

Design language: the site alternates two grounds — **ink** (`#0A0A0B`) where the
studio speaks, **bone** (`#F2F1EE`) where the work is examined. Accent `#FFCE00`
on ink; on bone it swaps to `--a-dark` (`#6E5400`) because the yellow is only
1.32:1 there. Contrast was audited; worst pair is 6.34:1.

## 5. The reel (homepage galleries)

Three reels, one per brand, five A4 sheets each, hover-driven. Only on the
homepage — never on the case studies. Nothing happens on click by design.

Cards never reorder. The hovered sheet moves to centre and pushes the others;
offset is distance from the current card the short way round, always in -2..2.
Unselected sheets blur and dim by distance. Motion is linear, not eased, so the
whole fan reads as one object.

Tunables, all in `assets/site.css`:

| Token | Value | What it does |
|---|---|---|
| `--cardw` | `clamp(180px, 19vw, 300px)` | sheet width; height is `x1.4142` (A4) |
| `--pace` | `.42s` | how long a sheet takes to travel |
| `--pace-fx` | `.28s` | blur/opacity crossfade |
| `perspective` | `1900px` | per-card, not on the container |

**Per-card `perspective()` is deliberate.** `transform-style: preserve-3d` on the
container hit-tests only the frontmost element, which left four of five cards
unhoverable.

## 6. The lens

The signature effect. A disc under the pointer that **contracts** the picture
inward and splits it slightly into colour, mirroring the hero's glass.

It is a **per-pixel canvas warp**, not a scaled copy. That matters: any
approach that stacks a transformed copy has a visible boundary exactly where
the two copies must meet, and no mask hides it. The warp reaches k=1 at the
rim, so there is no seam.

The inner loop uses two lookup tables indexed by **squared** distance (no sqrt),
and does dispersion as three slightly different bends in one pass rather than
three offset copies.

Displacement profile: nothing at the centre, peak at half the radius, nothing
at the rim.

Tunables, all in `assets/site.js` (line numbers current as of this doc):

| Name | Line | Value | What it does |
|---|---|---|---|
| `BEND` | 277 | `0.147` | contraction strength; peak shift 8px on a 238px disc |
| `SPREAD` | 278 | `0.0525` | how much further red goes than blue |
| `GRACE` | 276 | `90` (ms) | how long stillness is tolerated before it counts as stopped |
| open rate | 382 | `dt / 240` | 240ms to arrive |
| pause fade | 382 | `dt / 2500` | 2.5s to fade after the pointer stops |
| leave fade | 382 | `dt / 260` | 260ms when the pointer leaves the sheet |
| radius | `radius()` | `min(w,h) * 0.435` | disc size |

Both warp strengths are **exactly linear** in their constant, so scaling them is
arithmetic — no need to re-measure to hit a percentage.

Three things here are load-bearing and easy to break:

1. **The lens follows movement, not presence.** Holding still puts it out;
   moving brings it back. `GRACE` is what decides "stopped". Lower it and a
   gap in the event stream reads as a dip in the effect.
2. **Leaving the sheet gets its own, much faster exit.** At the 2.5s pause rate
   a disc stays lit on a sheet the hand left two sheets ago, riding along as
   that sheet slides aside and blurs — measurably two lenses lit for 2.5s. The
   `leaving` flag separates the two gestures.
3. **The hover guard.** Re-layout under a still pointer fires synthesized
   `mouseenter` events carrying the *unchanged* pointer position. Guard by
   exact coordinate equality and clear it on `mouseleave` — a tolerance window
   rejects slow deliberate movement, and not clearing it rejects legitimate
   re-entry at the same point (even pitch means the next sheet lands where the
   last stood).

## 7. Editor and publishing

`editor.html` edits content and writes `assets/content.json` through
`api/publish.php`, which also keeps every previous version so you can roll back.
Preview opens a new tab with `?preview=1`, where `content.js` layers the
unpublished localStorage draft over the published JSON; without the flag the
draft is ignored, so visitors never see it.

Two traps already hit and fixed here — do not reintroduce:

- PHP encodes an empty array as `[]`, not `{}`. Empty maps need an `(object)`
  cast or the JSON is the wrong shape.
- Validating base64 images with a regex fails **silently** on real data URIs
  (PCRE backtrack limit, and a naive pattern stops at the base64 comma). Use
  `strncmp` + `strspn`, and reject loudly by name.

**`editor.html` has no authentication if you upload it.** `api/setup.php` sets a
password for the endpoint, but the editor page itself is open. Worth closing
before it goes anywhere public.

## 8. Deployment

**FTPS from this environment is impossible** — not a credentials problem. DNS
is unavailable in the sandbox and the agent proxy accepts `CONNECT`
optimistically then resets anything that is not HTTPS. This was proved with a
control test, not assumed. Deployment is therefore: build a zip of the tracked
files and upload it by hand.

```bash
git ls-files -z | grep -zv '^\.gitignore$\|^README' | xargs -0 zip -q /path/out.zip
```

The zip must include `assets/posters/` — an earlier one predated the galleries,
omitted all 15, and would have shipped three empty reels.

Published preview artifacts (same URLs on every redeploy):

| Page | URL |
|---|---|
| Homepage | https://claude.ai/code/artifact/d7ee652b-5748-422f-9e45-0bc7435bc34d |
| About | https://claude.ai/code/artifact/9a28f23e-614b-421d-ba42-549c5f400fbe |
| Archive | https://claude.ai/code/artifact/e9e54355-e4cc-43b3-b13a-3494797f54d3 |
| Evolab | https://claude.ai/code/artifact/b3de8006-e59f-4f4a-8d13-b4ec923ff0cb |
| Natural Solution | https://claude.ai/code/artifact/a6db65a8-5094-4cfb-82f8-b65c56f553f5 |
| Laformul | https://claude.ai/code/artifact/8eafdf96-d132-4c1c-832a-db214d9e99ec |
| Editor | https://claude.ai/code/artifact/12bc5980-520c-4886-98df-89b64bee4ad6 |

`/tmp/buildart.py` inlines every asset and bakes the pages into `editor.html`,
writing self-contained copies to the scratchpad for publishing. It reads
`/tmp/urlmap.json` to rewrite internal links to artifact URLs.

## 9. How to verify a change

Nothing here is asserted without measurement, and the effects are timing- and
pixel-based, so eyeballing does not work. Serve the tree and drive it:

```bash
python3 -m http.server 8902          # from the repo root
node /tmp/fade2.js                   # lens fade duration
node /tmp/ghost.js                   # lenses lit while moving between sheets
node /tmp/blink.js                   # flicker over a slow 3s drag
node /tmp/cadence.js                 # event-gap threshold where flicker starts
node /tmp/disp.py                    # peak displacement by block-matching
node /tmp/reg2.js                    # broken images / overflow / console errors
```

Playwright lives at `/opt/node22/lib/node_modules/playwright`; launch Chromium
with `executablePath: '/opt/pw-browsers/chromium'`. Never run
`playwright install`.

Two measurement gotchas that produced wrong answers here:

- **Mean absolute pixel difference is not linear in displacement** — it
  saturates with local image contrast. To measure how far the warp moves
  something, block-match; do not diff.
- **Re-read bounding boxes between hovers.** The reel re-centres, so a box
  captured before a hover is stale, and a test using it will hover empty space
  and report a false pass. This is exactly how the ghost-lens defect stayed
  hidden for one round.

## 10. Outstanding

- Case-study and archive photography is still Magnific placeholder. The 15 real
  posters went only to the homepage reels.
- Kind Words, and Client voice on each case study, are deliberately empty
  placeholders awaiting real quotes.
- `editor.html` is unauthenticated (section 7).
- `main` on both repos still holds only a README.
- `potfolio` is three commits behind `djalel_repo` (section 2).
