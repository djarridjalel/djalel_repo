# Djarri Design — portfolio template

A structural and visual template for the portfolio of **Abdeldjalil Djarri**,
Creative Director, pharmaceutical and parapharmaceutical packaging.

It is a template, not the finished site. Every image is a labelled slot saying
what belongs in it, and every line of copy still to be written is marked. The
structure and the design language are both fully visible and can be judged
before a single real asset exists.

Static HTML, CSS and JS. No framework, no build step, no npm, no external
runtime dependency. Serve the folder and open it.

```
python3 -m http.server 8000     # then open http://localhost:8000
```

## Files

```
index.html              Homepage — all seven sections
work/case-study.html    One case study, the full nine-section spine
about.html              Skeleton: correct type and grid, placeholder copy
assets/site.css         All styles, token-driven
assets/site.js          Reveal, the live date, and the overlay's focus/Escape
assets/fonts.css        @font-face declarations
assets/fonts/           Three self-hosted OFL faces + OFL.txt (268 KB total)
```

---

## Tokens

Everything is set from these. Change a value here and it propagates.

### Colour

There is **no chromatic accent**. The only saturated colour anywhere on the
finished site comes from the packaging photography. Two full-strength grounds,
one mid neutral, and tints derived from those three.

| Token | Value | Role |
|---|---|---|
| `--ink` | `#0A0A0B` | Ground where the studio speaks — hero, film, availability |
| `--bone` | `#F2F1EE` | Ground where the work is examined — reels, cases, about |
| `--ash` | `#8A8880` | Mid neutral: crop marks, and the anchor for the field tints |

Derived tints — no new hues:

| Token | Value | Derivation | Role |
|---|---|---|---|
| `--ink-a` | `#3A3936` | ink → bone | heavy secondary on bone |
| `--ink-b` | `#5A5853` | ink → bone | muted body text on bone |
| `--ink-c` | `#D2D0CB` | ash → bone | hairlines on bone |
| `--ink-d` | `#E4E3DF` | ash → bone | slot fill on bone |
| `--bone-a` | `#9A9891` | bone → ink | muted body text on ink |
| `--bone-b` | `#444442` | ash → ink | hairlines on ink |
| `--bone-c` | `#1B1B1C` | bone → ink | slot fill on ink |
| `--field` | `#262625` | `--ash` at 22% over `--ink` | mandatory-panel body |
| `--field-key` | `#2B2B29` | `--ash` at 26% over `--ink` | mandatory-panel key lines |
| `--field-rule` | `#1C1C1B` | `--ash` at 14% over `--ink` | mandatory-panel hairlines |

Each ground sets its own semantic aliases (`--bg --fg --muted --rule --slot
--slotline`) via `.ground-ink` / `.ground-bone`, so a component works on either
ground without knowing which one it is on.

### Type

Three roles. Built with the free faces so it runs; swapping in a licensed face
is one variable plus one `@font-face` block.

| Token | Shipped with | Swap to |
|---|---|---|
| `--font-display` | Instrument Serif | GT Sectra Fine · PP Editorial New · Ogg |
| `--font-body` | Inter Tight | Söhne · ABC Diatype · Suisse Int'l |
| `--font-mono` | Martian Mono | Martian Mono · JetBrains Mono |

To swap: drop the woff2 into `assets/fonts/`, replace the matching `@font-face`
block in `assets/fonts.css`, and point the `--font-*` token in `site.css` at the
new family name. Nothing else changes.

### Scale

Deliberately bimodal — the contrast between 120px and 13px is the point, and
there is almost nothing in between.

| Token | Value | Role |
|---|---|---|
| `--t-micro` | `10px` | Mandatory field (7.5pt equivalent, print size) |
| `--t-cap` | `13px` | Captions, specs, batch codes |
| `--t-body` | `17px` | Body — 1.6 leading, capped at 60 characters |
| `--t-fact` | `clamp(2.5rem, 5vw, 4rem)` | Positioning band figures |
| `--t-head` | `clamp(2.25rem, 6vw, 6rem)` | Section headings |
| `--t-hero` | `clamp(2.75rem, 11.5vw, 7.5rem)` | Hero line — 120px at desktop |

Display is set at 0.9 leading and −0.02em tracking. All type is sentence case.

### Layout and motion

| Token | Value |
|---|---|
| `--gutter` | `clamp(1.25rem, 6vw, 8rem)` |
| `--colgap` | `clamp(1rem, 1.6vw, 2rem)` |
| `--maxw` | `1680px` |
| `--section` | `clamp(6rem, 14vh, 12rem)` |
| `--reveal` | `400ms` |
| `--fan` | `320ms` (linear) |

12 columns. Text sits off-axis at columns 2–7 (`.col-left`) or 6–11
(`.col-right`), never centred. Images break the grid to full bleed exactly once
per case study, on the printed-carton shot.

---

## Where to swap in real content

Everything provisional is marked in one of three ways:

- **`.slot`** — a labelled grey block naming exactly what image belongs there
  (`PRINTED CARTON — real photograph, not a render`). Replace the whole `div`
  with an `<img>` or `<video>`; the aspect ratio comes from `--ar`.
- **`.ph`** — a short swappable value, inline, dashed underline. Names, dates,
  figures, file sizes.
- **`.ph-b`** — a block of copy still to be written, marked with a dashed rule
  at the left edge so the body face stays legible underneath it.

Search the three HTML files for `class="ph` and `class="slot` to find every one.

Specific things to replace before this goes anywhere near a recruiter:

| Where | What |
|---|---|
| `index.html` positioning band | The four figures. See the note under *Disagreements*. |
| `index.html` availability | Start date, notice period, and `assets/cv.pdf` |
| `index.html` footer | Email address and LinkedIn URL |
| `work/case-study.html` | All nine sections; duplicate the file per project |
| Exit section | Point `Next` at the real next case study |
| `about.html` | Three paragraphs and the capability rows |

### The reels

Three galleries of five A4 sheets. Each sheet is an `<a>` pointing at a
full-size plate; all fifteen plates live at the bottom of `index.html`. To add a
sheet, add both the `.sheet` and its matching `.plate`, and keep the ids paired
(`#plate-evolab-1` ↔ `#s-evolab-1`). Five per reel is what the fan geometry is
tuned for; changing the count means regenerating the fan rules at the end of
`site.css`.

### The case study spine

Nine sections, identical order in every case study. Keep the order.

1. Opening — title, client, year, scope, and a **team-credit slot** that stays
   in even when the answer is "solo"
2. The constraint — one 60-character column, three sentences
3. The object — the one full bleed on the page
4. The tension — text left, macro crop at real size right
5. The route — three across, the system over multiple SKUs
6. Rejected — two up, muted, and one sentence on why it lost
7. Production — dieline strip plus a spec row in the mono
8. In context — the product at shelf position beside real competitors
9. Exit — one line of outcome, then the next case study

---

## The hero

**Concept: the mandatory panel.** The background is a dense field of the
regulatory furniture every pharmaceutical carton carries — composition, dosage,
storage, batch, expiry, barcode block, Braille position — tiled as carton
panels, set at 7.5pt at roughly 12% against the ground. It reads as texture
first and resolves into legible text on approach. It is the most characteristic
material in this subject's world and it is pure typographic control at the
smallest sizes.

The placeholder content is deliberately, visibly non-real: fictitious product
names, zero-filled codes, and `TEMPLATE PLACEHOLDER — NOT REAL PRODUCT
INFORMATION` sitting in the field itself. The panels run English, French, German
and Italian, which is what a carton sold in Switzerland actually looks like.

**Three lines were written for the display type:**

1. *I design pharmaceutical packaging. I want to do it in Switzerland.*
2. *Packaging and brand systems for pharmaceutical companies, moving to Switzerland.*
3. **Creative direction for pharmaceutical packaging, in Switzerland.** ← used

Three is the plainest. One states an intention rather than a capability and
splits into two sentences; two hedges "moving" into the middle of the claim.
Three names the job title he wants and the place, and nothing else.

**Braille.** The rule used as every section divider is set to Marburg Medium
geometry — the standard EU pharmaceutical cartons are held to: 1.6 mm dot,
2.5 mm pitch inside the cell, 6.0 mm cell pitch. The SVG viewBox is in
millimetres, so the geometry is literally correct rather than approximated. Each
divider spells a real word (`sheets`, `work`, `film`, `hire`, `evolab`…) and
carries a screen-reader label. On a carton the Braille sits at the left of the
panel with the rule running off it, which is where it sits here.

**Motion.** On load the field fades up over 700ms, then the display line, then
the batch code. On scroll the field stays fixed while the type moves over it.
Nothing else moves in the hero.

There is no `index-alt.html`. The mandatory-panel hero is the right one for this
brief and I did not find a better idea worth building alongside it.

---

## Contrast audit

Measured from the rendered DOM at 1440px across all three pages — effective
foreground composited over the effective background, not asserted from the
token table.

**Worst pair, real content text: 5.53:1** — `--ink-b #5A5853` on `--ink-d
#E4E3DF`, the 10–11px labels inside placeholder slots.

That pair only exists while the slots are placeholders. Once real images replace
them, the worst pair in the finished site is **6.29:1** — `--ink-b #5A5853` on
`--bone #F2F1EE`, used for muted body copy and captions.

| Pair | Ratio |
|---|---|
| Slot labels, `--ink-b` on `--ink-d` | 5.53:1 |
| Slot labels, `--bone-a` on `--bone-c` | 5.96:1 |
| Muted body and captions, `--ink-b` on `--bone` | 6.29:1 |
| Muted body and captions, `--bone-a` on `--ink` | 6.85:1 |
| Body, `--ink` on `--bone` / `--bone` on `--ink` | 17.52:1 |

Nothing that carries meaning falls below 4.5:1.

**One deliberate exception.** The mandatory-panel texture in the hero measures
**1.31:1**. That is the effect: the brief calls for 12–18% against the ground so
it reads as tone before it reads as text. It carries no information, it is
`aria-hidden`, and every word in it is placeholder legalese. It is called out
here rather than left for someone to find.

---

## Verified

Checked in headless Chromium at 375, 768, 1024, 1440 and 1920px across all three
pages:

- No horizontal overflow at any width
- No console errors, no failed local requests, no broken images
- Every scroll reveal fires
- Reel fan: hover and keyboard focus both shift the track and blur by distance;
  sheets never reorder
- Plate opens on click, focus moves to the close control, background scroll
  locks, Escape closes
- **JS disabled:** all content visible, and the plates still open — the overlay
  is CSS `:target`, not a script
- **`prefers-reduced-motion`:** everything static and instantly visible, no blur
  on the fan

---

## Disagreements with the brief

Five, all of them acted on.

**1. Fonts are self-hosted, not linked from Google.** The brief asked for no
dependencies and for a site that runs on a static server. A `<link>` to
`fonts.googleapis.com` is a third-party runtime dependency, and on a locked-down
corporate network — which is what a Basel agency will open this on — it fails
silently and the site renders in Times. That is not a fallback, it is a
different design. Three OFL faces, latin and latin-ext subsets, 268 KB total,
sitting in `assets/fonts/`. Swapping in a licensed face is still one token.

**2. The reel fan is pure CSS.** The brief allowed `site.js` for "only what
motion requires". I read that as a ceiling rather than a floor. `:has()` does
the whole fan — the centring shift, the constant push that opens one gap, and
the blur and dim by distance — with no JavaScript, so the signature interaction
survives the script being blocked or slow. The rules are generated and sit at
the end of `site.css`, commented as such.

**3. The lightbox is CSS `:target`, not a JS overlay.** The brief called
clicking a sheet open "non-negotiable", so I did not want it to depend on a
script loading. All fifteen plates are in the HTML and open on hash change. JS
adds only what CSS cannot: focus movement, scroll lock, and Escape.

**4. The live date is written twice, and this is the one place JS writes text.**
"Use the real current date" and "nothing rendered into the page by JavaScript
after load" cannot both hold without a server. The batch line is written into
the HTML when the file is generated, so it is correct with JS off, and refreshed
on load so it is correct on the day it is read. Everything else on all three
pages is in the HTML.

**5. The positioning band's SKU figure is a trap.** `240+` is a placeholder. If
the real number is materially smaller, swap the fact out rather than shrinking
it — a modest figure set at 64px in a serif does more damage than no figure at
all. Years, languages and qualification carry the band on their own. This is the
one place in the template where filling in an honest value can make the page
weaker, so it is worth deciding deliberately.

Everything the brief ruled out stays out: no lens or image-distortion effect of
any kind, no storage APIs, no cookie banner, no chat widget, no scroll-jacking,
no parallax, no cursor followers, no CMS, and no client logos strip.
