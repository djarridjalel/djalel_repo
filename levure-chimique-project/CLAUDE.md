# Levure Chimique – L'Étoile de l'Est (نجمة الشرق) packaging

Flat, editable SVG artwork for the "Levure Chimique" (baking powder) bag. It is the sister product of the brand's "Poudre de Chantilly" pouch (see `reference/`).

## Working preferences (user)
- Do not explain what you have done unless asked.
- Ask the questions you need before giving detailed answers.
- Discuss and plan first. Do not write or generate code unless explicitly asked.
- Ask before generating or using any AI-generated asset.

## Files
- `build.py` generates both faces into `svg/`. Edit the script, then run `python3 build.py`. The back paragraphs are pre-wrapped lists of lines, so re-break the lines by hand when the text changes.
- `svg/levure-chimique-face-avant.svg` is the front.
- `svg/levure-chimique-face-arriere.svg` is the back.
- `illustrator/svg-groups-to-layers.jsx` turns the top-level groups of an opened SVG into real Illustrator layers and makes the guides layer non-printing. Run it with File > Scripts > Other Script…
- `previews/` holds PNG renders. Regenerate them with `rsvg-convert -w 1200 svg/<file>.svg -o previews/<name>.png`.
- `reference/poudre-de-chantilly-reference.png` is the original brand reference (Chantilly pouch, navy and gold).
- `reference/flocons/` holds photos of the "Flocons" 250 g levure bag (SARL AGD Fruits), the content and format reference. `flocons-infos.md` has its copy transcribed word for word, plus the errors found in it.

## Approved design direction: "Rising Sun"
- Format: flexible glossy plastic pillow-pack bag, 11.5 × 19 cm, crimped heat seals top and bottom and a fin seal down the middle of the back. Not the stand-up zip pouch.
- Net weight: 250 g.
- Palette: orange to red radial sunrise gradient (golden-orange glow behind the cake, deep red edges), gold foil text, sun rays on the front.
- Background pattern: baking tools and ingredients only (whisk, wheat, rolling pin, flour sack, egg, bowl, measuring spoon, oven mitt, bread). No cakes, cupcakes or sweets.
- Keep the "SANS GLUTEN" ribbon (top right of the front).
- Arabic product name: خميرة كيميائية.
- Front tagline: "Pour des pâtisseries bien levées" / لحلويات خفيفة ومنتفخة.
- Seal: QUALITÉ PREMIUM / نوعية ممتازة.

## Specs
- Each face is 115 × 190 mm trim plus 3 mm bleed, so the document is 121 × 196 mm.
- viewBox 0 0 1210 1960, where 1 unit = 0.1 mm.
- Seal zones are 12 mm at top and bottom. On the back, a 14 mm zone in the middle is kept clear for the fin seal; its exact width and side are still to confirm with the printer. The magenta `GUIDES_do_not_print` layer marks the trim, seals and seam.
- Each top-level `<g id=…>` is one layer (Background, Pattern_baking, Sun_rays, Title_FR, Nutrition_table, Manufacturer, Icons…). Inside each layer, every element is its own named group (`nt_row_01`, `step_2`, `maker_fr`, `icon_gmo_free`…).
- The back has two columns, one on each side of the seam. Left: title, nutrition table, ingredients, storage, lot and date box, barcode with net weight, trademark line, icons, sorting banners. Right: logo, description, mode d'emploi, manufacturer and consumer service, QR code and social pages.

## Placeholders the user will fill
- **Logo:** a dashed box on each face. The user drops in the original vector logo.
- **Cake image:** a dashed box on the front. The user adds the cake photo later. The cake image was generated in Magnific: https://www.magnific.com/app/creation/mEgYq9MhJQ (16:9, 4K, cake on plate on beige).
- **Barcode:** a white box sized for an EAN-13 at 80 %. The product needs its own code; the reference bag's EAN belongs to that product.
- **AGD logo:** a dashed circle in the manufacturer block.
- **Lot and dates:** printed at packing in the white box.

## Back copy
- Taken from the reference bag in `reference/flocons/`, word for word. The client chose to keep its errors (nutrition values, ingredient roles, typos); they are listed in `flocons-infos.md`. Only the reference's brand word is left out.
- Manufacturer: SARL AGD Fruits Company (address, phones, email, consumer service, social pages, QR text as on the reference).
- Kept from our own design: the 3-step mode d'emploi, the logo and title. The QUALITÉ PREMIUM seal is on the front only, for lack of room on the back.

## Fonts (Google Fonts, free)
- Kaushan Script for the "Levure Chimique" script.
- Montserrat for French copy.
- Cairo for Arabic.
- Arabic strings are wrapped in RLE … PDF (U+202B … U+202C) so each line is laid out right to left, including lines that start or end with Latin text such as "(SIN500I)". Bold Arabic labels are separate text objects, because renderers lose the right-to-left order across tspans. In Illustrator, use the Middle Eastern & South Asian composer for Arabic text.
- The ℮ sign is drawn as a path, because the fonts lack U+212E.

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
