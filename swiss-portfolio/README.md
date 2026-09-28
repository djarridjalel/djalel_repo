# Abdeldjalil Djarri — portfolio template (Swiss job search)

A static site: HTML, one stylesheet and one small script, with no build step. Open `index.html` through any static server, for example `python3 -m http.server` from this folder.

## Pages

| File | Page |
|---|---|
| `index.html` | Home: hero, 3 case studies, capabilities, clients, film, experience, references, contact |
| `work/evolab.html` | Case study: Evolab Laboratories |
| `work/natural-solution.html` | Case study: Natural Solution + Natural Skin |
| `work/laformul.html` | Case study: Laformul + BioFormul |
| `about.html` | About and CV |
| `contact.html` | Contact |

## Still to add

- **Portrait:** add a real photo as `assets/img/portrait.webp`. The other images are in place; see `IMAGES.md`.
- **CV PDFs:** `assets/cv/djarri-cv-en.pdf` and `assets/cv/djarri-cv-fr.pdf`.
- **Yellow-highlighted text:** every `class="fill"` span is a fact to supply (dates, language levels, team sizes, results, reference names, LinkedIn URL). Search for `class="fill"` and remove the class once the text is real.
- **French version:** the language switch is a label for now. Add a `fr/` folder with the same pages.
- **Fonts:** Hanken Grotesk and IBM Plex Mono load from Google Fonts. Before launch, self-host them so no visitor data goes to Google (Swiss nFADP).

## Logos

`assets/logos/` holds the real client logo files. The home page client row and each case-study title use them directly.
