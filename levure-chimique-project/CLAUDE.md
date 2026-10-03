# Levure Chimique – L'Étoile de l'Est (نجمة الشرق) packaging

Flat, editable SVG artwork for the "Levure Chimique" (baking powder) bag. It is the sister product of the brand's "Poudre de Chantilly" pouch (see `reference/`).

## Working preferences (user)
- Do not explain what you have done unless asked.
- Ask the questions you need before giving detailed answers.
- Discuss and plan first. Do not write or generate code unless explicitly asked.
- Ask before generating or using any AI-generated asset.

## Files
- `build.py` generates both faces into `svg/`. Edit the script, then run `python3 build.py`.
- `svg/levure-chimique-face-avant.svg` is the front.
- `svg/levure-chimique-face-arriere.svg` is the back.
- `previews/` holds PNG renders. Regenerate them with `rsvg-convert -w 1200 svg/<file>.svg -o previews/<name>.png`.
- `reference/poudre-de-chantilly-reference.png` is the original brand reference (Chantilly pouch, navy and gold).
- `reference/flocons/` holds photos of the "Flocons" 250 g levure bag (SARL AGD Fruits), the content and format reference. `flocons-infos.md` has its copy transcribed word for word, plus the errors found in it.

## Approved design direction: "Rising Sun"
- Format: flexible glossy plastic pillow-pack bag, crimped heat seals top and bottom. Not the stand-up zip pouch.
- Net weight: 250 g.
- Palette: orange to red radial sunrise gradient (golden-orange glow behind the cake, deep red edges), gold foil text, sun rays on the front.
- Background pattern: baking tools and ingredients only (whisk, wheat, rolling pin, flour sack, egg, bowl, measuring spoon, oven mitt, bread). No cakes, cupcakes or sweets.
- Keep the "SANS GLUTEN" ribbon (top right of the front).
- Arabic product name: خميرة كيميائية.
- Front tagline: "Pour des pâtisseries bien levées" / لحلويات خفيفة ومنتفخة.
- Seal: QUALITÉ PREMIUM / نوعية ممتازة.

## Specs
- Each face is 140 × 212 mm trim plus 3 mm bleed, so the document is 146 × 218 mm.
- viewBox 0 0 1460 2180, where 1 unit = 0.1 mm.
- Seal zones are 12 mm at top and bottom. The magenta `GUIDES_do_not_print` layer marks trim and seals.
- Each top-level `<g id=…>` is one layer: Background, Pattern_baking, Sun_rays, Cream_base, Cake_image_placeholder, Logo_placeholder, badges, title, and so on.

## Placeholders the user will fill
- **Logo:** a dashed box. The user drops in the original vector logo.
- **Cake image:** a dashed box on the front. The user adds the cake photo later. The cake image was generated in Magnific: https://www.magnific.com/app/creation/mEgYq9MhJQ (16:9, 4K, cake on plate on beige).
- **Back copy:** the nutrition values (XX), the ingredients line and "Fabriqué par : [Nom – Adresse]" are placeholders to confirm with the client.

## Fonts (Google Fonts, free)
- Kaushan Script for the "Levure Chimique" script.
- Montserrat for French copy.
- Cairo for Arabic.
- Arabic strings are wrapped in RLM (U+200F) so punctuation and numbers order correctly. In Illustrator, use the Middle Eastern & South Asian composer for Arabic text.

## Magnific references
- Approved mockup (Rising Sun, plastic bag): https://www.magnific.com/app/creation/huSWFDAvqL
- Brand reference upload: creation `aFw0FihfSh`
- Generation model used: Nano Banana 2 (`imagen-nano-banana-2-flash`).
- Other plastic-bag variants:
  - EbOMKVSuuO (Classic Crimson)
  - LwzaJfaswO (Vibrant Orange)
  - Do56IZ4pcl (Diagonal Split)
  - xSAhwFCjfW (Burgundy & Orange)
  - tClnFaNmZJ (Color Block)
  - nVC7eV2YQD (Vintage Bakery)
  - 1lZtwSXr4r (Ingredient Hero)
  - SycuNNjUb8 (Algerian Heritage)
  - vQUcbk6a47 (Modern Rise)
