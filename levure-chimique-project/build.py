import math, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "svg")
os.makedirs(OUT, exist_ok=True)

W, H = 1460, 2180          # 146 x 218 mm incl. 3 mm bleed (1 unit = 0.1 mm)
TRIM = (30, 30, 1430, 2150)
SEAL_TOP, SEAL_BOT = 150, 2030
CX = 730

SCRIPT = "'Kaushan Script', cursive"
SANS = "Montserrat, Arial, sans-serif"
ARAB = "Cairo, 'Noto Kufi Arabic', Tahoma, sans-serif"

DARK = "#5A1A10"
CREAM = "#FFF4DC"
GOLD_LINE = "#E9C77A"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text(x, y, s, size, family, fill, weight=None, anchor="middle", extra=""):
    if family == ARAB:
        s = "\u200f" + s + "\u200f"
    w = f' font-weight="{weight}"' if weight else ""
    return (f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}"{w} '
            f'fill="{fill}" text-anchor="{anchor}"{extra}>{esc(s)}</text>')


def shadow_text(x, y, s, size, family, fill, weight=None, anchor="middle", dx=3, dy=5, op=0.4):
    return (text(x + dx, y + dy, s, size, family, "#3A0C06", weight, anchor, f' opacity="{op}"') +
            text(x, y, s, size, family, fill, weight, anchor))


def layer(name, body, extra=""):
    return (f'<g id="{name}" inkscape:groupmode="layer" inkscape:label="{name}"{extra}>\n'
            f'{body}\n</g>\n')


# ---------------------------------------------------------------- defs
def defs(glow_cy):
    return f'''<defs>
  <radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="{CX}" cy="{glow_cy}" r="1350">
    <stop offset="0" stop-color="#FFC866"/>
    <stop offset="0.12" stop-color="#F7A43F"/>
    <stop offset="0.32" stop-color="#E06C28"/>
    <stop offset="0.58" stop-color="#B43B20"/>
    <stop offset="0.85" stop-color="#8A2618"/>
    <stop offset="1" stop-color="#6E1C13"/>
  </radialGradient>
  <radialGradient id="rayGrad" gradientUnits="userSpaceOnUse" cx="{CX}" cy="{glow_cy}" r="1050">
    <stop offset="0" stop-color="#FFF1C2" stop-opacity="0.38"/>
    <stop offset="0.45" stop-color="#FFE3A0" stop-opacity="0.1"/>
    <stop offset="1" stop-color="#FFE3A0" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="patternFade" gradientUnits="userSpaceOnUse" cx="{CX}" cy="{glow_cy}" r="1150">
    <stop offset="0" stop-color="#000"/>
    <stop offset="0.3" stop-color="#222"/>
    <stop offset="0.75" stop-color="#fff"/>
  </radialGradient>
  <mask id="patternMask" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">
    <rect width="{W}" height="{H}" fill="url(#patternFade)"/>
  </mask>
  <linearGradient id="goldText" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFF2BE"/>
    <stop offset="0.3" stop-color="#F1D07C"/>
    <stop offset="0.55" stop-color="#C9993E"/>
    <stop offset="0.78" stop-color="#F6DE96"/>
    <stop offset="1" stop-color="#AE812E"/>
  </linearGradient>
  <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F9E3A1"/>
    <stop offset="0.5" stop-color="#C79A44"/>
    <stop offset="1" stop-color="#F3D88E"/>
  </linearGradient>
  <radialGradient id="goldSeal" cx="0.4" cy="0.35" r="0.75">
    <stop offset="0" stop-color="#FFF6CF"/>
    <stop offset="0.5" stop-color="#EDCF88"/>
    <stop offset="0.85" stop-color="#C69A45"/>
    <stop offset="1" stop-color="#9C7230"/>
  </radialGradient>
  <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#EAD6A8"/>
    <stop offset="0.5" stop-color="#FBF3DE"/>
    <stop offset="1" stop-color="#E5CF9C"/>
  </linearGradient>
  <linearGradient id="creamBase" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ECDDC3" stop-opacity="0"/>
    <stop offset="0.25" stop-color="#ECDDC3" stop-opacity="1"/>
    <stop offset="1" stop-color="#D8C19B" stop-opacity="1"/>
  </linearGradient>
{baking_pattern()}
</defs>'''


# ---------------------------------------------------------------- baking icons (100x100 boxes, line art)
ICONS = {
    "whisk": '<path d="M50 62 C30 42 31 12 50 6 C69 12 70 42 50 62 Z M50 62 C41 42 41 15 50 6 C59 15 59 42 50 62"/>'
             '<rect x="44" y="62" width="12" height="34" rx="6"/>',
    "rolling_pin": '<rect x="22" y="38" width="56" height="24" rx="10"/><path d="M22 50 H6 M78 50 H94"/>'
                   '<path d="M34 44 V56 M66 44 V56"/>',
    "wheat": '<path d="M50 96 V18"/>'
             + "".join(f'<ellipse cx="{50+s*9}" cy="{y}" rx="6" ry="11" transform="rotate({s*30} {50+s*9} {y})"/>'
                       for y in (28, 44, 60, 76) for s in (-1, 1))
             + '<ellipse cx="50" cy="13" rx="5.5" ry="10"/>',
    "flour_sack": '<path d="M30 32 Q22 88 34 93 H66 Q78 88 70 32 Z"/><path d="M30 32 Q50 24 70 32"/>'
                  '<path d="M36 30 L31 14 M64 30 L69 14 M44 27 L46 12 M56 27 L54 12"/>'
                  '<path d="M50 78 V52 M50 58 l-6 -6 M50 58 l6 -6 M50 68 l-6 -6 M50 68 l6 -6"/>',
    "spoon": '<circle cx="30" cy="50" r="16"/><path d="M46 50 H90"/><circle cx="90" cy="50" r="4"/>',
    "egg": '<path d="M50 8 C74 8 86 58 80 74 C75 92 25 92 20 74 C14 58 26 8 50 8 Z"/>',
    "bowl": '<path d="M8 44 H92 Q88 90 50 90 Q12 90 8 44 Z"/><path d="M14 58 H86"/>'
            '<path d="M60 44 L78 10"/>',
    "mitt": '<path d="M30 90 V46 Q30 14 55 14 Q76 14 76 40 V90 Z"/><path d="M30 58 Q12 54 14 38 Q18 26 30 36"/>'
            '<path d="M27 78 H79"/>',
    "bread": '<path d="M14 70 Q8 34 50 30 Q92 34 86 70 Z"/><path d="M14 70 H86"/>'
             '<path d="M34 44 L41 60 M49 41 L56 58 M64 44 L71 60"/>',
}


def baking_pattern():
    T = 480
    spots = [
        ("whisk", 80, 80, -15), ("wheat", 240, 70, 10), ("rolling_pin", 400, 90, -25),
        ("egg", 160, 240, 12), ("flour_sack", 320, 245, -8),
        ("bowl", 0, 235, 6), ("bowl", 480, 235, 6),
        ("mitt", 80, 400, -12), ("spoon", 240, 405, 25), ("bread", 400, 395, -6),
    ]
    out = []
    for name, x, y, r in spots:
        out.append(f'<g transform="translate({x} {y}) rotate({r}) scale(0.9) translate(-50 -50)">{ICONS[name]}</g>')
        # wrap vertically for seamless tiling
        if y < 60:
            out.append(f'<g transform="translate({x} {y+T}) rotate({r}) scale(0.9) translate(-50 -50)">{ICONS[name]}</g>')
    body = "\n    ".join(out)
    return f'''  <pattern id="bakingPattern" patternUnits="userSpaceOnUse" width="{T}" height="{T}">
    <g fill="none" stroke="#4A0F0A" stroke-opacity="0.3" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    {body}
    </g>
  </pattern>'''


# ---------------------------------------------------------------- shared pieces
def background_layers(glow_cy, rays=True):
    s = layer("Background", f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')
    s += layer("Pattern_baking",
               f'<rect width="{W}" height="{H}" fill="url(#bakingPattern)" mask="url(#patternMask)"/>')
    if rays:
        n, R = 56, 1800
        d = []
        for i in range(n):
            t = math.radians(i * 360 / n)
            w = math.radians(1.7 if i % 2 == 0 else 0.8)
            p1 = (CX + R * math.cos(t - w), glow_cy + R * math.sin(t - w))
            p2 = (CX + R * math.cos(t + w), glow_cy + R * math.sin(t + w))
            d.append(f"M{CX} {glow_cy} L{p1[0]:.1f} {p1[1]:.1f} L{p2[0]:.1f} {p2[1]:.1f} Z")
        s += layer("Sun_rays", f'<path d="{" ".join(d)}" fill="url(#rayGrad)"/>')
    return s


def scallop(cx, cy, R, n=40):
    pts = []
    for i in range(n):
        a0 = 2 * math.pi * i / n
        a1 = 2 * math.pi * (i + 0.5) / n
        a2 = 2 * math.pi * (i + 1) / n
        v0 = (cx + R * 0.94 * math.cos(a0), cy + R * 0.94 * math.sin(a0))
        c = (cx + R * 1.06 * math.cos(a1), cy + R * 1.06 * math.sin(a1))
        v1 = (cx + R * 0.94 * math.cos(a2), cy + R * 0.94 * math.sin(a2))
        if i == 0:
            pts.append(f"M{v0[0]:.1f} {v0[1]:.1f}")
        pts.append(f"Q{c[0]:.1f} {c[1]:.1f} {v1[0]:.1f} {v1[1]:.1f}")
    return " ".join(pts) + " Z"


def premium_seal(cx, cy, R):
    k = R / 150
    body = (f'<path d="{scallop(cx, cy, R)}" fill="url(#goldSeal)" stroke="#9C7230" stroke-width="{2*k:.1f}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{R*0.8:.1f}" fill="none" stroke="#9C7230" stroke-width="{3*k:.1f}" opacity="0.7"/>'
            + text(cx, cy - 32 * k, "QUALITÉ", round(40 * k), SANS, DARK, 800)
            + text(cx, cy + 14 * k, "PREMIUM", round(40 * k), SANS, DARK, 800)
            + text(cx, cy + 66 * k, "نوعية ممتازة", round(44 * k), ARAB, DARK, 700))
    return layer("Seal_Qualite_Premium", body)


def logo_placeholder(x, y, w, h):
    body = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="16" fill="#FFFFFF" fill-opacity="0.06" '
            f'stroke="{GOLD_LINE}" stroke-width="4" stroke-dasharray="18 12"/>'
            + text(x + w / 2, y + h / 2 + 10, "LOGO", 64, SANS, GOLD_LINE, 700)
            + text(x + w / 2, y + h / 2 + 52, "Placer le logo ici", 24, SANS, GOLD_LINE, 400))
    return layer("Logo_placeholder", body)


def guides():
    x0, y0, x1, y1 = TRIM
    body = (f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="none" stroke="#FF00FF" stroke-width="2" stroke-dasharray="14 8"/>'
            f'<path d="M{x0} {SEAL_TOP} H{x1} M{x0} {SEAL_BOT} H{x1}" stroke="#FF00FF" stroke-width="2" stroke-dasharray="6 6"/>'
            + text(x0 + 12, SEAL_TOP - 12, "Zone de soudure / seal", 20, SANS, "#FF00FF", 600, "start")
            + text(x0 + 12, SEAL_BOT + 30, "Zone de soudure / seal", 20, SANS, "#FF00FF", 600, "start"))
    return layer("GUIDES_do_not_print", body)


def svg_doc(title, inner, glow_cy):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="146mm" height="218mm" viewBox="0 0 {W} {H}">
<title>{esc(title)}</title>
<!-- Pillow-pack face 140 x 212 mm (trim) + 3 mm bleed. 1 unit = 0.1 mm. Seal zones 12 mm top/bottom. -->
{defs(glow_cy)}
{inner}
</svg>
'''


# ---------------------------------------------------------------- FRONT
def front():
    gy = 1300
    s = background_layers(gy)
    s += layer("Cream_base", f'<rect x="0" y="1560" width="{W}" height="{H-1560}" fill="url(#creamBase)"/>')

    # cake placeholder (to be replaced by the photo)
    s += layer("Cake_image_placeholder",
               f'<rect x="230" y="1290" width="1000" height="720" rx="40" fill="#FFFFFF" fill-opacity="0.08" '
               f'stroke="{CREAM}" stroke-width="4" stroke-dasharray="20 14"/>'
               + text(CX, 1660, "IMAGE DU GÂTEAU", 46, SANS, "#7A4A2A", 700)
               + text(CX, 1712, "(gâteau + plateau, à placer ici)", 28, SANS, "#7A4A2A", 400))

    s += logo_placeholder(545, 190, 370, 270)

    # Sans gluten ribbon
    rx0, rx1, rcx = 1150, 1320, 1235
    ic = 300
    wheat = ("".join(f'<ellipse cx="{rcx+sx*9}" cy="{y}" rx="6" ry="11" transform="rotate({sx*30} {rcx+sx*9} {y})"/>'
                     for y in (ic - 22, ic - 6, ic + 10) for sx in (-1, 1))
             + f'<ellipse cx="{rcx}" cy="{ic-36}" rx="5.5" ry="10"/>')
    rib = (f'<path d="M{rx0} 0 H{rx1} V470 L{rcx} 528 L{rx0} 470 Z" fill="url(#ribbon)" stroke="url(#goldStroke)" stroke-width="5"/>'
           f'<path d="M{rx0+14} 0 V462 L{rcx} 512 L{rx1-14} 462 V0" fill="none" stroke="#C79A44" stroke-width="2.5"/>'
           f'<g fill="none" stroke="{DARK}" stroke-width="6" stroke-linecap="round">'
           f'<circle cx="{rcx}" cy="{ic}" r="54"/><path d="M{rcx} {ic+38} V{ic-30}"/></g>'
           f'<g fill="{DARK}">{wheat}</g>'
           f'<path d="M{rcx-38} {ic+38} L{rcx+38} {ic-38}" stroke="{DARK}" stroke-width="7" stroke-linecap="round"/>'
           + text(rcx, 405, "SANS", 32, SANS, DARK, 800)
           + text(rcx, 442, "GLUTEN", 32, SANS, DARK, 800))
    s += layer("Badge_Sans_Gluten", rib)

    # Title
    t = (text(CX + 5, 707, "Levure", 250, SCRIPT, "#3A0C06", None, "middle", ' opacity="0.45"')
         + text(CX + 6, 939, "Chimique", 300, SCRIPT, "#3A0C06", None, "middle", ' opacity="0.45"')
         + text(CX, 700, "Levure", 250, SCRIPT, "url(#goldText)")
         + text(CX, 930, "Chimique", 300, SCRIPT, "url(#goldText)"))
    s += layer("Title_FR", t)
    s += layer("Title_AR", shadow_text(CX, 1075, "خميرة كيميائية", 124, ARAB, CREAM, 800))
    s += layer("Tagline",
               shadow_text(CX, 1160, "Pour des pâtisseries bien levées", 54, SANS, CREAM, 600, dy=3, op=0.35)
               + shadow_text(CX, 1238, "لحلويات خفيفة ومنتفخة", 60, ARAB, CREAM, 700, dy=3, op=0.35))

    s += premium_seal(1090, 1395, 150)

    # Net weight shield
    sx0, sx1, scx = 165, 345, 255
    nw = (f'<path d="M{sx0} 1390 H{sx1} V1680 L{scx} 1752 L{sx0} 1680 Z" fill="#7A1E16" stroke="url(#goldStroke)" stroke-width="7"/>'
          f'<path d="M{sx0+12} 1402 H{sx1-12} V1673 L{scx} 1737 L{sx0+12} 1673 Z" fill="none" stroke="#C79A44" stroke-width="2.5"/>'
          + text(scx, 1442, "الوزن الصافي", 30, ARAB, CREAM, 700)
          + text(scx, 1482, "Poids net", 28, SANS, CREAM, 600)
          + text(scx, 1576, "250", 92, SANS, "url(#goldText)", 800)
          + text(scx, 1640, "g", 64, SANS, "url(#goldText)", 800)
          + text(scx, 1700, "250 غ", 26, ARAB, CREAM, 700))
    s += layer("Badge_Poids_net", nw)
    s += guides()
    return svg_doc("Levure Chimique – Face avant", s, gy)


# ---------------------------------------------------------------- BACK
def back():
    gy = 1350
    s = background_layers(gy, rays=False)
    s += logo_placeholder(905, 200, 380, 280)

    # title block
    tb = (text(195, 372, "Levure", 150, SCRIPT, "#3A0C06", None, "start", ' opacity="0.45"')
          + text(196, 538, "Chimique", 180, SCRIPT, "#3A0C06", None, "start", ' opacity="0.45"')
          + text(192, 368, "Levure", 150, SCRIPT, "url(#goldText)", None, "start")
          + text(192, 532, "Chimique", 180, SCRIPT, "url(#goldText)", None, "start")
          + shadow_text(500, 625, "خميرة كيميائية", 72, ARAB, CREAM, 800))
    s += layer("Title", tb)

    # ---- nutrition table
    x0, x1 = 190, 775
    y0 = 680
    rows = [("Énergie", "XX kJ / XX kcal", "الطاقة"),
            ("Matières grasses", "XX g", "الدهون"),
            ("Glucides", "XX g", "الكربوهيدرات"),
            ("dont sucres", "XX g", "منها السكريات"),
            ("Protéines", "XX g", "البروتينات"),
            ("Sel", "XX g", "الملح")]
    hdr_h, row_h = 120, 62
    y1 = y0 + hdr_h + row_h * len(rows)
    nt = (f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="18" fill="#3A0C06" fill-opacity="0.28" '
          f'stroke="{GOLD_LINE}" stroke-width="3"/>'
          f'<path d="M{x0+18} {y0} H{x1-18} Q{x1} {y0} {x1} {y0+18} V{y0+hdr_h} H{x0} V{y0+18} Q{x0} {y0} {x0+18} {y0} Z" fill="#F6EBD3"/>'
          + text((x0 + x1) / 2, y0 + 48, "Valeurs nutritionnelles moyennes pour 100 g", 21, SANS, DARK, 700)
          + text((x0 + x1) / 2, y0 + 96, "القيم الغذائية المتوسطة لكل 100 غ", 28, ARAB, DARK, 700))
    c1, c2 = x0 + 228, x0 + 410
    nt += f'<path d="M{c1} {y0+hdr_h} V{y1} M{c2} {y0+hdr_h} V{y1}" stroke="{GOLD_LINE}" stroke-width="1.5" opacity="0.6"/>'
    for i, (fr, val, ar) in enumerate(rows):
        ry = y0 + hdr_h + row_h * i
        if i > 0:
            nt += f'<path d="M{x0} {ry} H{x1}" stroke="{GOLD_LINE}" stroke-width="1.5" opacity="0.6"/>'
        by = ry + row_h / 2 + 8
        nt += text(x0 + 18, by, fr, 22, SANS, CREAM, 600, "start")
        nt += text((c1 + c2) / 2, by, val, 21, SANS, CREAM, 600)
        nt += text(x1 - 18, by + 2, ar, 25, ARAB, CREAM, 700, "end")
    s += layer("Nutrition_table", nt)

    # ---- info panel
    iy0 = y1 + 30
    info_lines = [
        ("ar", "المكونات: عوامل تخمير (ثنائي فوسفات ثنائي"),
        ("ar", "الصوديوم، بيكربونات الصوديوم)، نشا الذرة."),
        ("fr", "Ingrédients : agents levants (diphosphate disodique,"),
        ("fr", "carbonate acide de sodium), amidon de maïs."),
        ("rule", ""),
        ("ar", "يحفظ في مكان جاف وبارد."),
        ("fr", "À conserver dans un endroit sec et frais."),
        ("rule", ""),
        ("fr", "Fabriqué par : [Nom – Adresse du fabricant]"),
        ("ar", "صنع من طرف: [الاسم – العنوان]"),
    ]
    yy = iy0 + 46
    body = ""
    for kind, s_ in info_lines:
        if kind == "rule":
            body += f'<path d="M{x0+30} {yy-14} H{x1-30}" stroke="{GOLD_LINE}" stroke-width="1.5" opacity="0.6"/>'
            yy += 22
            continue
        if kind == "ar":
            body += text(x1 - 20, yy, s_, 23, ARAB, CREAM, 600, "end")
        else:
            body += text(x0 + 20, yy, s_, 19, SANS, CREAM, 500, "start")
        yy += 36
    iy1 = yy - 6
    info = (f'<rect x="{x0}" y="{iy0}" width="{x1-x0}" height="{iy1-iy0}" rx="18" fill="#3A0C06" fill-opacity="0.28" '
            f'stroke="{GOLD_LINE}" stroke-width="3"/>' + body)
    s += layer("Ingredients_info", info)

    # ---- white boxes
    b1 = iy1 + 30
    bh = (1990 - b1 - 25) / 2
    wb = (f'<rect x="{x0+4}" y="{b1:.0f}" width="{x1-x0-8}" height="{bh:.0f}" rx="16" fill="#FFFFFF"/>'
          + text((x0 + x1) / 2, b1 + bh / 2 + 8, "Code-barres", 24, SANS, "#B9B0A6", 600)
          + f'<rect x="{x0+4}" y="{b1+bh+25:.0f}" width="{x1-x0-8}" height="{bh:.0f}" rx="16" fill="#FFFFFF"/>'
          + text((x0 + x1) / 2, b1 + bh * 1.5 + 25 - 6, "N° de lot / Date de fabrication", 22, SANS, "#B9B0A6", 600)
          + text((x0 + x1) / 2, b1 + bh * 1.5 + 25 + 26, "À consommer de préférence avant", 22, SANS, "#B9B0A6", 600))
    s += layer("Barcode_and_lot_boxes", wb)

    # ---- right panel: description + mode d'emploi
    px0, px1 = 835, 1290
    pcx = (px0 + px1) / 2
    py0, py1 = 680, 1790
    rp = (f'<rect x="{px0}" y="{py0}" width="{px1-px0}" height="{py1-py0}" rx="18" fill="#3A0C06" fill-opacity="0.28" '
          f'stroke="{GOLD_LINE}" stroke-width="3"/>')
    desc = [("ar", "خميرة كيميائية نجمة الشرق لحلويات"), ("ar", "وكعكات طرية ومنتفخة بشكل مثالي."),
            ("fr", "Levure chimique L'Étoile de l'Est"), ("fr", "pour des gâteaux moelleux"),
            ("fr", "et parfaitement levés.")]
    yy = py0 + 58
    for kind, s_ in desc:
        if kind == "ar":
            rp += text(px1 - 22, yy, s_, 25, ARAB, CREAM, 600, "end")
        else:
            rp += text(px0 + 22, yy, s_, 21, SANS, CREAM, 500, "start")
        yy += 38
    rp += f'<path d="M{px0+30} {yy} H{px1-30}" stroke="{GOLD_LINE}" stroke-width="1.5" opacity="0.6"/>'
    ly = yy + 30
    rp += (f'<rect x="{pcx-150}" y="{ly}" width="300" height="86" rx="43" fill="#F6EBD3"/>'
           + text(pcx, ly + 38, "طريقة الاستعمال", 28, ARAB, DARK, 700)
           + text(pcx, ly + 70, "MODE D'EMPLOI", 21, SANS, DARK, 800))
    steps = [(["ملعقة صغيرة (حوالي 5 غ)", "لكل 250 غ من الدقيق."], ["1 cuillère à café (≈ 5 g)", "pour 250 g de farine."]),
             (["اخلطها مع الدقيق", "وانخلهما معاً."], ["Mélangez-la à la farine", "et tamisez ensemble."]),
             (["اخبز مباشرة في", "فرن مسخن مسبقاً."], ["Enfournez aussitôt dans", "un four préchauffé."])]
    sy = ly + 86 + 62
    for i, (ars, frs) in enumerate(steps):
        rp += (f'<circle cx="{pcx}" cy="{sy}" r="32" fill="#F6EBD3" stroke="url(#goldStroke)" stroke-width="4"/>'
               + text(pcx, sy + 14, str(i + 1), 38, SANS, DARK, 800))
        rp += text(pcx, sy + 72, ars[0], 23, ARAB, CREAM, 600)
        rp += text(pcx, sy + 104, ars[1], 23, ARAB, CREAM, 600)
        rp += text(pcx, sy + 138, frs[0], 19, SANS, CREAM, 500)
        rp += text(pcx, sy + 164, frs[1], 19, SANS, CREAM, 500)
        sy += 226
    s += layer("Description_and_Mode_emploi", rp)

    s += premium_seal(1180, 1905, 100)
    s += guides()
    return svg_doc("Levure Chimique – Face arrière", s, gy)


open(f"{OUT}/levure-chimique-face-avant.svg", "w", encoding="utf-8").write(front())
open(f"{OUT}/levure-chimique-face-arriere.svg", "w", encoding="utf-8").write(back())
print("written")
