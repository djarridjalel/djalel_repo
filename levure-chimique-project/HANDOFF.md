# Handoff: Levure Chimique bag (from the cloud session of 3 Oct 2026)

Read `CLAUDE.md` first for the project rules, specs and file map. This file covers what happened in the previous conversation and what is still open.

## Why this handoff
The user works in Adobe Illustrator on their own computer. The previous session ran in the cloud and could not see or control Illustrator. Continue in a local session with Computer use turned on, so the files can be checked in Illustrator itself.

## What was done
1. **Review of the original project** (140 × 212 mm version). Issues found then: no room for the back seam, barcode box too short, guides layer printable, Arabic overflowing the seal and the weight badge, small back text. The rebuild fixed most of these.
2. **Reference bag:** the user sent photos of the "Flocons" levure bag by SARL AGD Fruits. Everything on it is transcribed word for word in `reference/flocons/flocons-infos.md`, with the errors listed.
3. **User decisions:**
   - Design: keep ours (Rising Sun front, two-column back in the style of the Chantilly pouch) and add all the reference information, **without the word "Flocons"**.
   - Manufacturer: **SARL AGD Fruits** (their address, phones, email, consumer service, social pages and QR text).
   - Errors in the reference text and nutrition table: **copy everything as is**.
   - Layers: SVG with named groups, plus an Illustrator script that turns the groups into layers.
4. **Rebuild at 11.5 × 19 cm** (the dimensions the user gave). The back has two columns either side of a centred fin seal. Checks done:
   - every back paragraph matches the transcription word for word;
   - the QR code decodes to the reference text;
   - the word "Flocons" appears nowhere in the artwork;
   - the Arabic lines render right to left (RLE … PDF wrapping, verified against Chromium).
5. **Illustrator problem:** the user opened the SVG in Illustrator without the fonts installed. The title showed as symbols and the Arabic ran left to right with unjoined letters. The user chose **outlined + editable** files:
   - `svg/outlined/` holds both faces with all text as shapes, made by `outline.py` through Inkscape. They match the previews pixel for pixel in librsvg.
   - `fonts/` holds the three fonts for the editable files.

## Not yet checked
- Opening any of the files in Illustrator itself. Nobody has seen the outlined SVGs, the editable SVGs with the fonts installed, or `illustrator/svg-groups-to-layers.jsx` running in Illustrator. The script passes a syntax check only.
- Whether the RLE/PDF control characters show as stray marks in Illustrator. The user's screenshot showed small marks at the ends of Arabic lines. Also whether the Middle Eastern composer fixes the Arabic in the editable files.

## Suggested next steps (local session)
1. Ask the user to install the fonts from `fonts/`.
2. With Computer use, open `svg/outlined/levure-chimique-face-arriere-outlined.svg` in Illustrator, run the layers script, and compare with `previews/face-arriere.png`. Do the same for the front.
3. Open the editable SVGs and check the Arabic. If needed, write an Illustrator script that sets the Arabic text frames to the Middle Eastern composer and right-to-left and strips the U+202B/U+202C marks, but only after asking the user.

## Assumptions to confirm with the user or printer
- Top and bottom seals are 12 mm wide.
- The back seam zone is 14 mm wide, centred.
- The barcode is a placeholder: the product needs its own EAN-13, because the reference bag's code belongs to that product.
- The flag, GMO FREE, Clean & Green, hexagon icons and recycling symbols are simplified redraws, and the AGD logo is a placeholder.
- Back text is small: body 1.7–1.9 mm, nutrition table 1.5 mm.
- The QUALITÉ PREMIUM seal was dropped from the back for lack of room. The ℮ sign was added to the front weight badge.

## Questions asked but not answered yet
1. The title uses كيميائية but the copied text uses كميائية. Keep both spellings or unify them?
2. The front says "250 g" and the copied back block says "250 غرام GRS". Keep both?
3. The nutrition table is impossible (124 g per 100 g; 17 g sodium vs 0,40 g salt). Is "as is" final, or only until AGD sends real values?
4. Does AGD Fruits own the L'Étoile de l'Est brand, or only make the product? This affects the social pages, the QR code and "Marque et modèles déposés".
5. The QR code holds plain text with a phone number found nowhere else (0559 13 44 12). Keep it, or link it to the pages?
6. Is 11.5 × 19 cm the finished face with seals included? How wide are the seals and the seam?
7. Does the printer want separate faces, or one film layout (both faces, seam allowance, eye mark)?
8. Real metallic gold ink, or printed gold?
9. Are official files available for GMO FREE, Clean & Green, the recycling symbols and the AGD logo?
10. Is the small back text acceptable, or should the long "Idée générale" text be shortened?

## Tooling notes
- `python3 build.py` needs only the Python standard library. The paragraphs in it are pre-wrapped. The widths were measured with HarfBuzz (French 17 units, Arabic 19 units, 429 units wide); re-wrap by hand if the text changes.
- `python3 outline.py` needs Inkscape 1.x and the fonts. It gives the Arabic lines `direction="rtl"` for Inkscape only.
- Previews: `rsvg-convert -w 1200 svg/<file>.svg -o previews/<name>.png`.
- QR rows in `build.py` come from `segno.make(text, error='m')`. Regenerate them with segno if the text changes; never type them by hand.
- Git: repository `djarridjalel/djalel_repo`, branch `claude/focused-ptolemy-qkx1tq`.
