import math, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "svg")
os.makedirs(OUT, exist_ok=True)

# Pillow-bag face 115 x 190 mm (trim) + 3 mm bleed. 1 unit = 0.1 mm.
BLEED = 30
TRIM_W, TRIM_H = 1150, 1900
W, H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED          # 1210 x 1960
TRIM = (BLEED, BLEED, BLEED + TRIM_W, BLEED + TRIM_H)
SEAL_TOP, SEAL_BOT = TRIM[1] + 120, TRIM[3] - 120     # 12 mm crimped seals
CX = W / 2
SEAM = (CX - 70, CX + 70)                              # back fin seal, 14 mm zone kept clear

SCRIPT = "'Kaushan Script', cursive"
SANS = "Montserrat, Arial, sans-serif"
ARAB = "Cairo, 'Noto Kufi Arabic', Tahoma, sans-serif"

DARK = "#5A1A10"
INK = "#3A0C06"
CREAM = "#FFF4DC"
PAPER = "#F6EBD3"
GOLD_LINE = "#E9C77A"
GREY = "#B9B0A6"
RED = "#D52B1E"
GREEN = "#2E8B3E"

# width of the bold Arabic labels (Cairo 800) per unit of font size, and of a space
AR_LABEL_W = {"فكرة عامة:": 5.068, "بصفة عامة:": 5.223, "المكونات:": 4.495}
AR_SPACE_W = 0.219


def n(v):
    return f"{round(v, 1):g}"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text(x, y, s, size, family, fill, weight=None, anchor="middle", extra=""):
    if family == ARAB:
        s = "\u202b" + s + "\u202c"      # RLE ... PDF: lay the line out right to left
    w = f' font-weight="{weight}"' if weight else ""
    return (f'<text x="{n(x)}" y="{n(y)}" font-family="{family}" font-size="{n(size)}"{w} '
            f'fill="{fill}" text-anchor="{anchor}"{extra}>{esc(s)}</text>')


def runs(x, y, parts, size, family, fill, anchor):
    """One Latin line made of (text, weight) parts, e.g. a bold label followed by regular text."""
    spans = "".join(f'<tspan font-weight="{wt}">{esc(s)}</tspan>' for s, wt in parts)
    return (f'<text x="{n(x)}" y="{n(y)}" font-family="{family}" font-size="{n(size)}" '
            f'fill="{fill}" text-anchor="{anchor}" xml:space="preserve">{spans}</text>')


def shadow_text(x, y, s, size, family, fill, weight=None, anchor="middle", dx=3, dy=5, op=0.4):
    return (text(x + dx, y + dy, s, size, family, INK, weight, anchor, f' opacity="{op}"') +
            text(x, y, s, size, family, fill, weight, anchor))


def paragraph(gid, x, y, lines, size, family, fill, lh, anchor, weight, label=None):
    """Pre-wrapped lines. A label at the start of the first line is set in bold."""
    out = []
    for i, ln in enumerate(lines):
        yy = y + i * lh
        if i == 0 and label and ln.startswith(label) and family == ARAB:
            # two text objects: renderers lose the right-to-left order across tspans
            gap = (AR_LABEL_W[label] + AR_SPACE_W) * size
            out.append(text(x, yy, label, size, family, fill, 800, anchor)
                       + text(x - gap, yy, ln[len(label):].strip(), size, family, fill, weight, anchor))
        elif i == 0 and label and ln.startswith(label):
            out.append(runs(x, yy, [(label, 800), (ln[len(label):], weight)], size, family, fill, anchor))
        else:
            out.append(text(x, yy, ln, size, family, fill, weight, anchor))
    return group(gid, *out)


def group(gid, *body):
    return f'<g id="{gid}">' + "".join(body) + "</g>"


def layer(name, body, extra=""):
    return (f'<g id="{name}" inkscape:groupmode="layer" inkscape:label="{name}"{extra}>\n'
            f'{body}\n</g>\n')


def rect(x, y, w, h, fill, rx=0, extra=""):
    r = f' rx="{n(rx)}"' if rx else ""
    return f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}"{r} fill="{fill}"{extra}/>'


def panel(x0, y0, x1, y1):
    return rect(x0, y0, x1 - x0, y1 - y0, INK, 14, f' fill-opacity="0.5" stroke="{GOLD_LINE}" stroke-width="2.5"')


def rule(x0, x1, y):
    return f'<path d="M{n(x0)} {n(y)} H{n(x1)}" stroke="{GOLD_LINE}" stroke-width="1.5" opacity="0.6"/>'


# ---------------------------------------------------------------- defs
def defs(glow_cy):
    return f'''<defs>
  <radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="{n(CX)}" cy="{glow_cy}" r="1150">
    <stop offset="0" stop-color="#FFC866"/>
    <stop offset="0.12" stop-color="#F7A43F"/>
    <stop offset="0.32" stop-color="#E06C28"/>
    <stop offset="0.58" stop-color="#B43B20"/>
    <stop offset="0.85" stop-color="#8A2618"/>
    <stop offset="1" stop-color="#6E1C13"/>
  </radialGradient>
  <radialGradient id="rayGrad" gradientUnits="userSpaceOnUse" cx="{n(CX)}" cy="{glow_cy}" r="900">
    <stop offset="0" stop-color="#FFF1C2" stop-opacity="0.38"/>
    <stop offset="0.45" stop-color="#FFE3A0" stop-opacity="0.1"/>
    <stop offset="1" stop-color="#FFE3A0" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="patternFade" gradientUnits="userSpaceOnUse" cx="{n(CX)}" cy="{glow_cy}" r="980">
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
  <linearGradient id="instaGrad" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#FEDA75"/>
    <stop offset="0.35" stop-color="#FA7E1E"/>
    <stop offset="0.65" stop-color="#D62976"/>
    <stop offset="1" stop-color="#4F5BD5"/>
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
    T = 420
    spots = [
        ("whisk", 70, 70, -15), ("wheat", 210, 61, 10), ("rolling_pin", 350, 79, -25),
        ("egg", 140, 210, 12), ("flour_sack", 280, 214, -8),
        ("bowl", 0, 206, 6), ("bowl", 420, 206, 6),
        ("mitt", 70, 350, -12), ("spoon", 210, 354, 25), ("bread", 350, 346, -6),
    ]
    body = "\n    ".join(f'<g transform="translate({x} {y}) rotate({r}) scale(0.79) translate(-50 -50)">{ICONS[name]}</g>'
                         for name, x, y, r in spots)
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
        k, R = 56, 1600
        d = []
        for i in range(k):
            t = math.radians(i * 360 / k)
            w = math.radians(1.7 if i % 2 == 0 else 0.8)
            p1 = (CX + R * math.cos(t - w), glow_cy + R * math.sin(t - w))
            p2 = (CX + R * math.cos(t + w), glow_cy + R * math.sin(t + w))
            d.append(f"M{n(CX)} {glow_cy} L{n(p1[0])} {n(p1[1])} L{n(p2[0])} {n(p2[1])} Z")
        s += layer("Sun_rays", f'<path d="{" ".join(d)}" fill="url(#rayGrad)"/>')
    return s


def scallop(cx, cy, R, k=40):
    pts = []
    for i in range(k):
        a0 = 2 * math.pi * i / k
        a1 = 2 * math.pi * (i + 0.5) / k
        a2 = 2 * math.pi * (i + 1) / k
        v0 = (cx + R * 0.94 * math.cos(a0), cy + R * 0.94 * math.sin(a0))
        c = (cx + R * 1.06 * math.cos(a1), cy + R * 1.06 * math.sin(a1))
        v1 = (cx + R * 0.94 * math.cos(a2), cy + R * 0.94 * math.sin(a2))
        if i == 0:
            pts.append(f"M{n(v0[0])} {n(v0[1])}")
        pts.append(f"Q{n(c[0])} {n(c[1])} {n(v1[0])} {n(v1[1])}")
    return " ".join(pts) + " Z"


def premium_seal(cx, cy, R):
    # sizes and baselines scale with R so all three lines stay inside the inner ring
    body = (f'<path d="{scallop(cx, cy, R)}" fill="url(#goldSeal)" stroke="#9C7230" stroke-width="{n(R/75)}"/>'
            f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(R*0.84)}" fill="none" stroke="#9C7230" stroke-width="{n(R/50)}" opacity="0.7"/>'
            + text(cx, cy - R * 0.23, "QUALITÉ", R * 0.245, SANS, DARK, 800)
            + text(cx, cy + R * 0.08, "PREMIUM", R * 0.245, SANS, DARK, 800)
            + text(cx, cy + R * 0.38, "نوعية ممتازة", R * 0.23, ARAB, DARK, 700))
    return layer("Seal_Qualite_Premium", group("seal_qualite_premium", body))


def logo_placeholder(x, y, w, h, size=52):
    body = (rect(x, y, w, h, "#FFFFFF", 16, f' fill-opacity="0.06" stroke="{GOLD_LINE}" stroke-width="4" stroke-dasharray="18 12"')
            + text(x + w / 2, y + h / 2 + size * 0.15, "LOGO", size, SANS, GOLD_LINE, 700)
            + text(x + w / 2, y + h / 2 + size * 0.75, "Placer le logo ici", size * 0.38, SANS, GOLD_LINE, 400))
    return layer("Logo_placeholder", group("logo_placeholder", body))


def estimated_sign(x, y, h, color):
    """The ℮ mark as a path (most fonts lack U+212E). x, y = bottom-left corner, h = height."""
    r = h * 0.44
    cx, cy = x + h * 0.5, y - h * 0.5
    ex, ey = cx + r * math.cos(math.radians(40)), cy + r * math.sin(math.radians(40))
    return (f'<path d="M{n(cx-r)} {n(cy)} H{n(cx+r)} A{n(r)} {n(r)} 0 1 0 {n(ex)} {n(ey)}" '
            f'fill="none" stroke="{color}" stroke-width="{n(h*0.13)}"/>')


def guides(seam=False):
    x0, y0, x1, y1 = TRIM
    body = (f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="none" stroke="#FF00FF" stroke-width="2" stroke-dasharray="14 8"/>'
            f'<path d="M{x0} {SEAL_TOP} H{x1} M{x0} {SEAL_BOT} H{x1}" stroke="#FF00FF" stroke-width="2" stroke-dasharray="6 6"/>'
            + text(x0 + 12, SEAL_TOP - 12, "Zone de soudure / seal", 18, SANS, "#FF00FF", 600, "start")
            + text(x0 + 12, SEAL_BOT + 28, "Zone de soudure / seal", 18, SANS, "#FF00FF", 600, "start"))
    if seam:
        sx0, sx1 = SEAM
        body += (f'<rect x="{n(sx0)}" y="{y0}" width="{n(sx1-sx0)}" height="{y1-y0}" fill="#FF00FF" fill-opacity="0.06" '
                 f'stroke="#FF00FF" stroke-width="2" stroke-dasharray="6 6"/>'
                 + text(CX, H / 2 + 6, "Soudure dorsale / fin seal (à confirmer)", 18, SANS, "#FF00FF", 600, "middle",
                        f' transform="rotate(-90 {n(CX)} {n(H/2)})"'))
    return layer("GUIDES_do_not_print", body)


def svg_doc(title, inner, glow_cy):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="121mm" height="196mm" viewBox="0 0 {W} {H}">
<title>{esc(title)}</title>
<!-- Pillow-bag face 115 x 190 mm (trim) + 3 mm bleed. 1 unit = 0.1 mm. Seals 12 mm top/bottom; back fin seal centred. -->
{defs(glow_cy)}
{inner}
</svg>
'''


# ---------------------------------------------------------------- FRONT
def ribbon_sans_gluten(x0, w):
    k = w / 170
    x1, cx = x0 + w, x0 + w / 2
    ic = 300 * k
    wheat = ("".join(f'<ellipse cx="{n(cx+sx*9*k)}" cy="{n(y)}" rx="{n(6*k)}" ry="{n(11*k)}" '
                     f'transform="rotate({sx*30} {n(cx+sx*9*k)} {n(y)})"/>'
                     for y in (ic - 22 * k, ic - 6 * k, ic + 10 * k) for sx in (-1, 1))
             + f'<ellipse cx="{n(cx)}" cy="{n(ic-36*k)}" rx="{n(5.5*k)}" ry="{n(10*k)}"/>')
    body = (f'<path d="M{n(x0)} 0 H{n(x1)} V{n(470*k)} L{n(cx)} {n(528*k)} L{n(x0)} {n(470*k)} Z" fill="url(#ribbon)" '
            f'stroke="url(#goldStroke)" stroke-width="{n(5*k)}"/>'
            f'<path d="M{n(x0+14*k)} 0 V{n(462*k)} L{n(cx)} {n(512*k)} L{n(x1-14*k)} {n(462*k)} V0" fill="none" '
            f'stroke="#C79A44" stroke-width="{n(2.5*k)}"/>'
            f'<g fill="none" stroke="{DARK}" stroke-width="{n(6*k)}" stroke-linecap="round">'
            f'<circle cx="{n(cx)}" cy="{n(ic)}" r="{n(54*k)}"/><path d="M{n(cx)} {n(ic+38*k)} V{n(ic-30*k)}"/></g>'
            f'<g fill="{DARK}">{wheat}</g>'
            f'<path d="M{n(cx-38*k)} {n(ic+38*k)} L{n(cx+38*k)} {n(ic-38*k)}" stroke="{DARK}" stroke-width="{n(7*k)}" stroke-linecap="round"/>'
            + text(cx, 405 * k, "SANS", 32 * k, SANS, DARK, 800)
            + text(cx, 442 * k, "GLUTEN", 32 * k, SANS, DARK, 800))
    return layer("Badge_Sans_Gluten", group("badge_sans_gluten", body))


def net_weight_shield(x0, x1, top, bottom, tip):
    cx = (x0 + x1) / 2
    e_h = 32
    body = (f'<path d="M{x0} {top} H{x1} V{bottom} L{n(cx)} {tip} L{x0} {bottom} Z" fill="#7A1E16" stroke="url(#goldStroke)" stroke-width="6"/>'
            f'<path d="M{x0+10} {top+10} H{x1-10} V{bottom-6} L{n(cx)} {tip-13} L{x0+10} {bottom-6} Z" fill="none" stroke="#C79A44" stroke-width="2"/>'
            + text(cx, top + 38, "الوزن الصافي", 21, ARAB, CREAM, 700)
            + text(cx, top + 64, "Poids net", 20, SANS, CREAM, 600)
            + text(cx, top + 136, "250", 64, SANS, "url(#goldText)", 800)
            + text(cx - 20, top + 190, "g", 50, SANS, "url(#goldText)", 800)
            + estimated_sign(cx + 6, top + 190, e_h, "#E8C676")
            + text(cx, top + 234, "250 غ", 19, ARAB, CREAM, 700))
    return layer("Badge_Poids_net", group("badge_poids_net", body))


def front():
    gy = 1110
    s = background_layers(gy)
    s += layer("Cream_base", rect(0, 1330, W, H - 1330, "url(#creamBase)"))

    # cake placeholder (to be replaced by the photo)
    s += layer("Cake_image_placeholder", group(
        "cake_placeholder",
        rect(185, 1095, 840, 695, "#FFFFFF", 34, f' fill-opacity="0.08" stroke="{CREAM}" stroke-width="4" stroke-dasharray="20 14"'),
        text(CX, 1505, "IMAGE DU GÂTEAU", 38, SANS, "#7A4A2A", 700),
        text(CX, 1548, "(gâteau + plateau, à placer ici)", 23, SANS, "#7A4A2A", 400)))

    s += logo_placeholder(455, 180, 300, 200)
    s += ribbon_sans_gluten(950, 140)

    s += layer("Title_FR", group(
        "title_levure",
        text(CX + 4, 606, "Levure", 205, SCRIPT, INK, None, "middle", ' opacity="0.45"'),
        text(CX, 600, "Levure", 205, SCRIPT, "url(#goldText)")) + group(
        "title_chimique",
        text(CX + 5, 798, "Chimique", 245, SCRIPT, INK, None, "middle", ' opacity="0.45"'),
        text(CX, 790, "Chimique", 245, SCRIPT, "url(#goldText)")))
    s += layer("Title_AR", group("title_ar", shadow_text(CX, 915, "خميرة كيميائية", 102, ARAB, CREAM, 800, dx=2.5, dy=4)))
    s += layer("Tagline", group(
        "tagline_fr", shadow_text(CX, 987, "Pour des pâtisseries bien levées", 44, SANS, CREAM, 600, dy=2.5, op=0.35)) + group(
        "tagline_ar", shadow_text(CX, 1052, "لحلويات خفيفة ومنتفخة", 50, ARAB, CREAM, 700, dy=2.5, op=0.35)))

    s += premium_seal(895, 1215, 122)
    s += net_weight_shield(125, 275, 1180, 1430, 1490)
    s += guides()
    return svg_doc("Levure Chimique – Face avant", s, gy)


# ---------------------------------------------------------------- BACK copy
# Copied word for word from the reference bag (errors kept, as the client asked) and pre-wrapped
# to the 43 mm column. See reference/flocons/flocons-infos.md for the source text.
AR_DESC = ["فكرة عامة: خميرة كميائية، ومسحوق الخميرة أو",
           "خميرة العجائن هو خليط يتكون أساسا من عامل",
           "أساسي (مثل بيكربونات الصوديوم)، عامل الحمضية",
           "(حمض الطرطريك، بيروفوسفات الصوديوم) وعامل",
           "استقرار (مثل النشا)، في شكل مسحوق أبيض تستعمل",
           "أساسا لتضخيم المعجنات. على عكس الخميرة، الذي",
           "يعتمد العمل على الكائنات الحية المجهرية، ومسحوق",
           "الخبز ويشمل التفاعلات الكيميائية فقط من العامل",
           "الحمضي القاعدي. حيث ما زال مسحوق جاف، فإن رد",
           "فعل لا تبدأ. عندما مبلل، وحمض يتفاعل مع بيكربونات",
           "الصوديوم وإطلاق غاز ثاني أكسيد الكربون يحدث، مما",
           "يجعل العجين. ثم يأخذ كوك على الفور."]
AR_DOSE = ["بصفة عامة: 10 غرام من مسحوق خميرة كميائية،",
           "تتطابق مع 500غ من الدقيق."]
FR_DESC = ["Idée générale: La levure chimique, poudre à",
           "lever ou poudre à pâte est un mélange composé",
           "essentiellement d'un agent basique (tel que le",
           "bicarbonate de sodium), un agent acide (acide",
           "tartrique, pyrophosphate de sodium) et un agent",
           "stabilisant (tel que l'amidon), se présentant sous",
           "forme de poudre blanche et servant à faire",
           "gonfler les gâteau pâtisseries."]
FR_DOSE = ["En général: un sachet de levure chimique",
           "contient 10 g de poudre, ce qui correspond à la",
           "dose pour 500g de farine."]
FR_STOCK = ["Stockage: A conserver dans un endroit",
            "frais et sec."]
AR_INGR = ["المكونات: عامل التخمير: بيكربونات الصوديوم",
           "(SIN500I)، مستحلب: بيروفوسفات الصوديوم (SIN450)،",
           "نشاء الذرة، حافظ حمض الليمون (SIN330)."]
FR_INGR = ["Ingrédients: Agent levant: bicarbonate de",
           "sodium (SIN500i), émulsifiant: pyrophosphate de",
           "sodium (SIN450), amidon de maïs, conservateur:",
           "acide citrique (330)"]
NUTRITION = [("Energie kj", "2324,66", "الطاقة كج"),
             ("Energie en Kcal", "342", "الطاقة كح"),
             ("Protéine", "12 g", "البروتينات"),
             ("Glucide", "76 g", "الكربوهيدرات"),
             ("- Dont sucres", "18 g", "السكريات"),
             ("Lipides", "1,3 g", "الدسم"),
             ("- Dont acide gras saturés", "0,2 g", "الدسم المشبعة"),
             ("Fibres", "18 g", "الالياف"),
             ("Sodium", "17 g", "الصوديوم"),
             ("Soit l’équivalent en sel", "00,40g", "الملح")]
STEPS = [("ملعقة صغيرة (حوالي 5 غ) لكل 250 غ من الدقيق.", "1 cuillère à café (≈ 5 g) pour 250 g de farine."),
         ("اخلطها مع الدقيق وانخلهما معاً.", "Mélangez-la à la farine et tamisez ensemble."),
         ("اخبز مباشرة في فرن مسخن مسبقاً.", "Enfournez aussitôt dans un four préchauffé.")]

# QR code of the reference bag, same content: "AGD Fruits Company\nFabrication des produits de
# patisserie\n0559 13 44 12" (version 5-M). Regenerate with segno if the text changes.
QR_ROWS = (
    "1111111010000001000110111101001111111",
    "1000001001110100111101001110001000001",
    "1011101001011111011001011010101011101",
    "1011101010001100100010010110101011101",
    "1011101010110100111000010111101011101",
    "1000001010010000010100100110001000001",
    "1111111010101010101010101010101111111",
    "0000000011111001000011110001100000000",
    "1000101111001001100111010010011111001",
    "0111100011101100001100011000010011001",
    "1110101100010011010101110111000101100",
    "1001000111110001110111010001010010101",
    "0101101111001000110011101000111000111",
    "1110110011011011100000110101110011000",
    "0101101011010111010001110011010101100",
    "1110110000110001111011100011001011110",
    "0010011111011101001101001011011100101",
    "1010010000010100100110111001110011001",
    "0000001001100110110011011001010000100",
    "0110000111011110010001100011101101100",
    "0010011000011101010111100111001100101",
    "1110100111011011110000010111100010000",
    "1100111110000111001001110011010101110",
    "0000100000010111000001000010001100101",
    "0010101100011000100111000011011000001",
    "1001000010010100001101111001100010001",
    "0010101111011001000101111101110101100",
    "0011100011010001110111010000110000101",
    "1111101000010100110011101100111111111",
    "0000000010010011101010010010100011010",
    "1111111011100111110000111000101011000",
    "1000001000110001011111110010100010110",
    "1011101010011000001010000010111111111",
    "1011101001111010110111011111111000001",
    "1011101001100010101000010111110101100",
    "1000001001000100011001010000000010110",
    "1111111011001001010111101001011110111",
)


# ---------------------------------------------------------------- BACK pieces
def qr_code(x, y, size):
    k = len(QR_ROWS) + 8                 # 4-module quiet zone each side
    m = size / k
    d = []
    for r, row in enumerate(QR_ROWS):
        c = 0
        while c < len(row):
            if row[c] == "1":
                e = c
                while e < len(row) and row[e] == "1":
                    e += 1
                d.append(f"M{n(x+(c+4)*m)} {n(y+(r+4)*m)}h{n((e-c)*m)}v{n(m)}h{n(-(e-c)*m)}z")
                c = e
            else:
                c += 1
    return rect(x, y, size, size, "#FFFFFF", 10) + f'<path d="{"".join(d)}" fill="#000000"/>'


def hexagon(cx, cy, R):
    pts = [(cx + R * math.cos(math.radians(a)), cy + R * math.sin(math.radians(a))) for a in range(-90, 270, 60)]
    return "M" + " L".join(f"{n(px)} {n(py)}" for px, py in pts) + " Z"


def icon_flag(cx, cy):
    w, h = 66, 44
    x0, y0 = cx - w / 2, cy - h / 2
    R1, R2, d = h / 4, h * 0.2, h / 10
    a = (R1 ** 2 - R2 ** 2 + d ** 2) / (2 * d)
    hh = math.sqrt(R1 ** 2 - a ** 2)
    top, bot = (cx + a, cy - hh), (cx + a, cy + hh)
    crescent = (f'<path d="M{n(top[0])} {n(top[1])} A{n(R1)} {n(R1)} 0 1 0 {n(bot[0])} {n(bot[1])} '
                f'A{n(R2)} {n(R2)} 0 1 1 {n(top[0])} {n(top[1])} Z" fill="#D21034"/>')
    sx, sr = cx + h * 0.11, h / 9
    star = " L".join(f"{n(sx + (sr if i % 2 == 0 else sr * 0.4) * math.cos(math.radians(180 + i * 36)))} "
                     f"{n(cy + (sr if i % 2 == 0 else sr * 0.4) * math.sin(math.radians(180 + i * 36)))}" for i in range(10))
    return group("icon_drapeau_algerie",
                 rect(x0, y0, w / 2, h, "#006233"), rect(cx, y0, w / 2, h, "#FFFFFF"),
                 crescent, f'<path d="M{star} Z" fill="#D21034"/>',
                 rect(x0, y0, w, h, "none", 0, ' stroke="#1A1A1A" stroke-width="1.5"'))


def icon_gmo_free(cx, cy):
    x0, y0 = cx - 33, cy - 24
    return group("icon_gmo_free",
                 rect(x0, y0, 66, 48, "#FFFFFF", 8, f' stroke="{GREEN}" stroke-width="2"'),
                 text(cx, y0 + 23, "GMO", 21, SANS, "#2E9E3E", 800),
                 rect(x0 + 5, y0 + 28, 56, 15, GREEN, 4),
                 text(cx, y0 + 40, "FREE", 13, SANS, "#FFFFFF", 800))


def arc_text(cx, cy, r, s, size, fill):
    """Capitals set along the top of a circle, one rotated letter at a time."""
    adv = [size * (0.3 if ch == " " else 0.34 if ch == "I" else 0.68) for ch in s]
    pos, out = -sum(adv) / 2, []
    for ch, a in zip(s, adv):
        t = (pos + a / 2) / r
        x, y = cx + r * math.sin(t), cy - r * math.cos(t)
        if ch != " ":
            out.append(text(x, y, ch, size, SANS, fill, 800, "middle", f' transform="rotate({n(math.degrees(t))} {n(x)} {n(y)})"'))
        pos += a
    return "".join(out)


def icon_clean_green(cx, cy):
    r = 30
    leaf_r = (f'<path d="M{n(cx-1)} {n(cy+12)} C{n(cx-24)} {n(cy+12)} {n(cx-23)} {n(cy-9)} {n(cx-4)} {n(cy-11)} '
              f'C{n(cx-1)} {n(cy-2)} {n(cx-1)} {n(cy+5)} {n(cx-1)} {n(cy+12)} Z" fill="#C8102E"/>')
    leaf_g = (f'<path d="M{n(cx+1)} {n(cy+12)} C{n(cx+24)} {n(cy+12)} {n(cx+23)} {n(cy-9)} {n(cx+4)} {n(cy-11)} '
              f'C{n(cx+1)} {n(cy-2)} {n(cx+1)} {n(cy+5)} {n(cx+1)} {n(cy+12)} Z" fill="{GREEN}"/>'
              f'<path d="M{n(cx+3)} {n(cy+10)} Q{n(cx+9)} {n(cy)} {n(cx+16)} {n(cy-6)}" stroke="#FFFFFF" stroke-width="1" fill="none"/>')
    binc = rect(cx - 14, cy - 1, 8, 10, "#FFF4DC", 1) + f'<circle cx="{n(cx-15)}" cy="{n(cy-7)}" r="2" fill="#FFF4DC"/>'
    return group("icon_clean_green",
                 f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{r}" fill="#FFFFFF" stroke="{GREEN}" stroke-width="1.5"/>',
                 arc_text(cx, cy + 2, 22, "KEEP YOUR CITY", 6.5, GREEN),
                 leaf_r, leaf_g, binc,
                 rect(cx - 26, cy + 13, 52, 10, GREEN, 2),
                 text(cx, cy + 20.5, "CLEAN & GREEN", 6.5, SANS, "#FFFFFF", 800))


def picto(gid, cx, cy, art, label, top_label=None):
    body = f'<path d="{hexagon(cx, cy, 36)}" fill="none" stroke="{CREAM}" stroke-width="2.2"/>' + art
    body += text(cx, cy + 21, label, 7.5, SANS, CREAM, 800)
    if top_label:
        body += text(cx, cy - 19, top_label, 8, ARAB, CREAM, 700)
    return group(gid, body)


def picto_row(x0, x1, cy):
    slot = (x1 - x0) / 6
    c = [x0 + slot * (i + 0.5) for i in range(6)]
    st = f'fill="none" stroke="{CREAM}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    gy = cy - 3
    glass = (f'<path {st} d="M{n(c[3]-14)} {n(gy-11)} V{n(gy-5)} Q{n(c[3]-14)} {n(gy+2)} {n(c[3]-7)} {n(gy+3)} '
             f'Q{n(c[3])} {n(gy+2)} {n(c[3])} {n(gy-5)} V{n(gy-11)} Z M{n(c[3]-7)} {n(gy+3)} V{n(gy+11)} '
             f'M{n(c[3]-12)} {n(gy+11)} H{n(c[3]-2)} M{n(c[3]+6)} {n(gy-11)} V{n(gy-4)} Q{n(c[3]+6)} {n(gy)} '
             f'{n(c[3]+10)} {n(gy)} Q{n(c[3]+14)} {n(gy)} {n(c[3]+14)} {n(gy-4)} V{n(gy-11)} M{n(c[3]+10)} {n(gy-11)} V{n(gy+11)}"/>')
    tidy = (f'<path {st} d="M{n(c[4]-17)} {n(cy-3)} L{n(c[4]-15)} {n(cy+13)} H{n(c[4]-5)} L{n(c[4]-3)} {n(cy-3)} Z '
            f'M{n(c[4]-12)} {n(cy+1)} V{n(cy+10)} M{n(c[4]-8)} {n(cy+1)} V{n(cy+10)}"/>'
            f'<circle cx="{n(c[4]+9)}" cy="{n(cy-17)}" r="3.5" fill="{CREAM}"/>'
            f'<path {st} d="M{n(c[4]+8)} {n(cy-12)} L{n(c[4]+5)} {n(cy+2)} L{n(c[4]+12)} {n(cy+14)} M{n(c[4]+5)} {n(cy+2)} '
            f'L{n(c[4])} {n(cy+14)} M{n(c[4]+7)} {n(cy-9)} L{n(c[4]-6)} {n(cy-9)} L{n(c[4]-9)} {n(cy-7)}"/>')
    arrows = (f'<path {st} d="M{n(c[5]-11)} {n(cy+1)} A12 12 0 0 1 {n(c[5]+8)} {n(cy-11)} M{n(c[5]+11)} {n(cy-5)} '
              f'A12 12 0 0 1 {n(c[5]-8)} {n(cy+9)}"/>'
              f'<path d="M{n(c[5]+4)} {n(cy-15)} L{n(c[5]+12)} {n(cy-11)} L{n(c[5]+5)} {n(cy-6)} Z '
              f'M{n(c[5]-4)} {n(cy+13)} L{n(c[5]-12)} {n(cy+9)} L{n(c[5]-5)} {n(cy+4)} Z" fill="{CREAM}"/>')
    merci_band = (rect(c[4] - 22, cy + 17, 44, 12, CREAM, 2, f' transform="rotate(-18 {n(c[4])} {n(cy+23)})"')
                  + text(c[4], cy + 26.5, "Merci", 8.5, SANS, INK, 800, "middle", f' transform="rotate(-18 {n(c[4])} {n(cy+23)})"'))
    return (icon_flag(c[0], cy) + icon_gmo_free(c[1], cy) + icon_clean_green(c[2], cy)
            + picto("picto_alimentaire", c[3], cy, glass, "Alimentaire", "غذائي")
            + group("picto_merci", f'<path d="{hexagon(c[4], cy, 36)}" fill="none" stroke="{CREAM}" stroke-width="2.2"/>', tidy, merci_band)
            + picto("picto_recycle", c[5], cy, arrows, "Recyclé"))


def sorting_banners(x0, x1, y, h=62):
    w = (x1 - x0 - 12) / 2
    bx = x0 + w + 12
    dot_c = (x0 + w - 26, y + h / 2)
    dot = (f'<circle cx="{n(dot_c[0])}" cy="{n(dot_c[1])}" r="19" fill="#FFFFFF"/>'
           f'<path d="M{n(dot_c[0]-12)} {n(dot_c[1]+2)} A12 12 0 0 1 {n(dot_c[0]+8)} {n(dot_c[1]-9)}" fill="none" stroke="#6BBE45" stroke-width="5"/>'
           f'<path d="M{n(dot_c[0]+12)} {n(dot_c[1]-2)} A12 12 0 0 1 {n(dot_c[0]-8)} {n(dot_c[1]+9)}" fill="none" stroke="#1E7B34" stroke-width="5"/>')
    bag_c = (bx + w - 24, y + h / 2)
    bag = (f'<path d="M{n(bag_c[0]-13)} {n(bag_c[1]-4)} Q{n(bag_c[0]-15)} {n(bag_c[1]+16)} {n(bag_c[0])} {n(bag_c[1]+16)} '
           f'Q{n(bag_c[0]+15)} {n(bag_c[1]+16)} {n(bag_c[0]+13)} {n(bag_c[1]-4)} Q{n(bag_c[0])} {n(bag_c[1]-10)} {n(bag_c[0]-13)} {n(bag_c[1]-4)} Z '
           f'M{n(bag_c[0]-5)} {n(bag_c[1]-8)} L{n(bag_c[0]-9)} {n(bag_c[1]-17)} L{n(bag_c[0])} {n(bag_c[1]-12)} L{n(bag_c[0]+9)} {n(bag_c[1]-17)} '
           f'L{n(bag_c[0]+5)} {n(bag_c[1]-8)} Z" fill="#E2363B"/>')
    tx = x0 + (w - 52) / 2 + 2
    return (group("banner_pensez_au_tri", rect(x0, y, w, h, RED, 8, ' stroke="#FFFFFF" stroke-width="2"'),
                  text(tx, y + 27, "PENSEZ", 17, SANS, "#FFFFFF", 800), text(tx, y + 48, "AU TRI !", 17, SANS, "#FFFFFF", 800), dot)
            + group("banner_emballage", rect(bx, y, w, h, "#1B1B1B", 8, ' stroke="#FFFFFF" stroke-width="2"'),
                    text(bx + (w - 48) / 2, y + 21, "EMBALLAGE", 12.5, SANS, CREAM, 800),
                    text(bx + (w - 48) / 2, y + 37, "PLASTIQUE", 12.5, SANS, CREAM, 800),
                    text(bx + (w - 48) / 2, y + 53, "À JETER", 12.5, SANS, CREAM, 800), bag))


# ---------------------------------------------------------------- BACK
def back():
    gy = 1214
    s = background_layers(gy, rays=False)
    top = SEAL_TOP + 30

    # ======== left column (as seen from the back)
    x0, x1 = 65, SEAM[0] - 5
    lc = (x0 + x1) / 2
    s += layer("Title", group(
        "title_levure",
        text(lc + 3, top + 76, "Levure", 82, SCRIPT, INK, None, "middle", ' opacity="0.45"'),
        text(lc, top + 72, "Levure", 82, SCRIPT, "url(#goldText)")) + group(
        "title_chimique",
        text(lc + 3, top + 164, "Chimique", 98, SCRIPT, INK, None, "middle", ' opacity="0.45"'),
        text(lc, top + 160, "Chimique", 98, SCRIPT, "url(#goldText)")) + group(
        "title_ar", shadow_text(lc, top + 225, "خميرة كيميائية", 40, ARAB, CREAM, 800, dx=1.5, dy=2.5)))

    # nutrition table
    y0 = top + 252
    band, head, row_h = 64, 50, 25
    y1 = y0 + band + head + row_h * len(NUTRITION)
    vx = x0 + 262
    nt = group("nt_frame",
               rect(x0, y0, x1 - x0, y1 - y0, INK, 14, f' fill-opacity="0.5" stroke="{GOLD_LINE}" stroke-width="2.5"'),
               f'<path d="M{n(x0+14)} {n(y0)} H{n(x1-14)} Q{n(x1)} {n(y0)} {n(x1)} {n(y0+14)} V{n(y0+band)} H{n(x0)} '
               f'V{n(y0+14)} Q{n(x0)} {n(y0)} {n(x0+14)} {n(y0)} Z" fill="{PAPER}"/>')
    nt += group("nt_title",
                text(lc, y0 + 26, "Valeur nutritionnelle et énergétique pour 100g", 15, SANS, DARK, 700),
                text(lc, y0 + 52, "القيمة الغذائية والطاقوية لـ 100غ", 18, ARAB, DARK, 700))
    hy = y0 + band
    nt += group("nt_header",
                text(x0 + 12, hy + 21, "المعايير", 15, ARAB, GOLD_LINE, 700, "start"),
                text(x0 + 12, hy + 41, "Critères", 14, SANS, GOLD_LINE, 700, "start"),
                text(vx, hy + 21, "المقدار المتوسط لـ 100غ", 15, ARAB, GOLD_LINE, 700),
                text(vx, hy + 41, "Valeur moyenne 100g", 14, SANS, GOLD_LINE, 700))
    for i, (fr, val, ar) in enumerate(NUTRITION):
        ry = hy + head + row_h * i
        nt += group(f"nt_row_{i+1:02d}",
                    rule(x0, x1, ry),
                    text(x0 + 12, ry + 17.5, fr, 15, SANS, CREAM, 500, "start"),
                    text(vx, ry + 17.5, val, 15, SANS, CREAM, 700),
                    text(x1 - 12, ry + 18, ar, 17, ARAB, CREAM, 600, "end"))
    s += layer("Nutrition_table", nt)

    # ingredients
    iy0 = y1 + 12
    ing_ar_y = iy0 + 30
    ing_fr_y = ing_ar_y + 27 * (len(AR_INGR) - 1) + 38
    iy1 = ing_fr_y + 22 * (len(FR_INGR) - 1) + 16
    s += layer("Ingredients", group("ingredients_panel", panel(x0, iy0, x1, iy1), rule(x0 + 24, x1 - 24, ing_fr_y - 24))
               + paragraph("ingredients_ar", x1 - 14, ing_ar_y, AR_INGR, 19, ARAB, CREAM, 27, "end", 600, "المكونات:")
               + paragraph("ingredients_fr", x0 + 14, ing_fr_y, FR_INGR, 17, SANS, CREAM, 22, "start", 500, "Ingrédients:"))

    # storage and disclaimer
    sy0 = iy1 + 12
    s += layer("Storage_notice", group(
        "storage_panel", panel(x0, sy0, x1, sy0 + 148)) + group(
        "storage_ar", text(lc, sy0 + 28, "يحفظ في مكان بارد وجاف بعيدا عن أشعة الشمس", 17, ARAB, CREAM, 700)) + group(
        "storage_fr", text(lc, sy0 + 50, "CONSERVER DANS UN ENDROIT FRAIS", 15, SANS, CREAM, 700),
        text(lc, sy0 + 69, "ET SEC À L'ABRI DES RAYONS DU SOLEIL", 15, SANS, CREAM, 700)) + group(
        "disclaimer_ar", text(lc, sy0 + 96, "المنتج غير مسؤول عن سوء التخزين", 17, ARAB, CREAM, 700)) + group(
        "disclaimer_fr", text(lc, sy0 + 117, "Le producteur n’est pas responsable", 14, SANS, CREAM, 700),
        text(lc, sy0 + 135, "du mauvais stockage", 14, SANS, CREAM, 700)))

    # lot / dates box (filled in at packing)
    ly0 = sy0 + 160
    lot = rect(x0, ly0, x1 - x0, 130, "#FFFFFF", 12)
    for i, (fr, ar) in enumerate([("Date de Fab.:", "تاريخ الإنتاج:"), ("Date d’Exp.:", "تاريخ نهاية الحصة:"), ("N° de Lot:", "رقم الحصة:")]):
        yy = ly0 + 32 + 43 * i
        lot += group(f"lot_line_{i+1}", text(x0 + 14, yy, fr, 15, SANS, "#4A2A20", 700, "start"),
                     text(x1 - 14, yy + 1, ar, 16, ARAB, "#4A2A20", 700, "end"))
    s += layer("Lot_dates_box", group("lot_dates_box", lot))

    # barcode (placeholder, the product needs its own EAN-13) + net weight
    by0 = ly0 + 142
    bw, bh = 330, 225
    s += layer("Barcode_box", group(
        "barcode_box", rect(x0, by0, bw, bh, "#FFFFFF", 12),
        rect(x0 + (bw - 298) / 2, by0 + (bh - 207) / 2, 298, 207, "none", 0,
             f' stroke="{GREY}" stroke-width="1.5" stroke-dasharray="8 6"'),
        text(x0 + bw / 2, by0 + bh / 2 - 4, "Code-barres EAN-13", 17, SANS, GREY, 600),
        text(x0 + bw / 2, by0 + bh / 2 + 20, "(80 % min. : 29,8 × 20,7 mm)", 13, SANS, GREY, 500)))
    wx = (x0 + bw + x1) / 2 + 4
    s += layer("Net_weight", group(
        "net_weight",
        text(wx, by0 + 52, "الوزن الصافي", 19, ARAB, CREAM, 800),
        text(wx, by0 + 122, "250", 54, SANS, "url(#goldText)", 800),
        text(wx - 22, by0 + 154, "غرام", 18, ARAB, CREAM, 700),
        text(wx - 22, by0 + 178, "GRS", 17, SANS, CREAM, 700),
        estimated_sign(wx + 6, by0 + 180, 40, "#E8C676")))

    my = by0 + bh + 26
    s += layer("Trademark_notice", group(
        "trademark_notice", text(lc, my, "Marque et modèles déposés", 15, SANS, CREAM, 600),
        text(lc, my + 23, "علامة و نموذج مسجلان", 16, ARAB, CREAM, 600)))

    icy = my + 82
    s += layer("Icons", picto_row(x0, x1, icy))
    s += layer("Sorting_banners", sorting_banners(x0, x1, icy + 49))

    # ======== right column
    x0, x1 = SEAM[1] + 5, 1145
    rc = (x0 + x1) / 2
    s += logo_placeholder(x0 + 70, top, x1 - x0 - 140, 120, 44)

    py0 = top + 132
    ay = py0 + 32
    dose_ar_y = ay + 27 * len(AR_DESC) + 6
    fr_y = dose_ar_y + 27 * len(AR_DOSE) + 22
    dose_fr_y = fr_y + 22 * len(FR_DESC) + 6
    stock_y = dose_fr_y + 22 * len(FR_DOSE) + 6
    rule_y = stock_y + 22 * (len(FR_STOCK) - 1) + 20
    desc = (paragraph("description_ar", x1 - 16, ay, AR_DESC, 19, ARAB, CREAM, 27, "end", 600, "فكرة عامة:")
            + paragraph("dosage_ar", x1 - 16, dose_ar_y, AR_DOSE, 19, ARAB, CREAM, 27, "end", 600, "بصفة عامة:")
            + group("description_rule", rule(x0 + 24, x1 - 24, fr_y - 24))
            + paragraph("description_fr", x0 + 16, fr_y, FR_DESC, 17, SANS, CREAM, 22, "start", 500, "Idée générale:")
            + paragraph("dosage_fr", x0 + 16, dose_fr_y, FR_DOSE, 17, SANS, CREAM, 22, "start", 500, "En général:")
            + paragraph("stockage_fr", x0 + 16, stock_y, FR_STOCK, 17, SANS, CREAM, 22, "start", 500, "Stockage:"))

    # mode d'emploi
    hy = rule_y + 14
    me = group("mode_emploi_header",
               rect(rc - 135, hy, 270, 60, PAPER, 30),
               text(rc, hy + 26, "طريقة الاستعمال", 20, ARAB, DARK, 700),
               text(rc, hy + 49, "MODE D'EMPLOI", 14, SANS, DARK, 800))
    sy = hy + 86
    for i, (ar, fr) in enumerate(STEPS):
        me += group(f"step_{i+1}",
                    f'<circle cx="{n(x0+35)}" cy="{n(sy+12)}" r="19" fill="{PAPER}" stroke="url(#goldStroke)" stroke-width="3"/>',
                    text(x0 + 35, sy + 21, str(i + 1), 26, SANS, DARK, 800),
                    text(x1 - 16, sy + 12, ar, 18, ARAB, CREAM, 600, "end"),
                    text(x0 + 66, sy + 36, fr, 16, SANS, CREAM, 500, "start"))
        sy += 62
    py1 = sy - 6
    s += layer("Description_and_Mode_emploi",
               group("description_panel", panel(x0, py0, x1, py1), rule(x0 + 24, x1 - 24, rule_y)) + desc + me)

    # manufacturer + consumer service
    my0 = py1 + 12
    mk = group("maker_panel", panel(x0, my0, x1, my0 + 248))
    mk += group("maker_ar",
                text(x1 - 16, my0 + 30, "صنع من طرف : شركة أجي دي فروتس كومباني", 18, ARAB, CREAM, 700, "end"),
                text(x1 - 16, my0 + 55, "حي مواسية قسم 03 مجموعة ملكية 280 و 281", 18, ARAB, CREAM, 600, "end"),
                text(x1 - 16, my0 + 80, "حمادي - بومرداس", 18, ARAB, CREAM, 600, "end"))
    mk += group("maker_fr",
                text(x0 + 16, my0 + 108, "Fabriqué par la : SARL AGD FRUITS COMPANY", 15.5, SANS, CREAM, 700, "start"),
                text(x0 + 16, my0 + 128, "Cité Mouaissia section 03 groupe - propriétaire 280 et 281", 14.5, SANS, CREAM, 500, "start"),
                text(x0 + 16, my0 + 148, "Hamadi - W de Boumerdes", 14.5, SANS, CREAM, 500, "start"))
    mk += group("maker_contact",
                text(x0 + 16, my0 + 168, "Tél.:0561672661/ 0776357233", 14.5, SANS, CREAM, 600, "start"),
                text(x0 + 16, my0 + 188, "Email : sarlagdfruits@gmail.com", 14.5, SANS, CREAM, 500, "start"))
    mk += group("maker_logo_placeholder",
                f'<circle cx="{n(x1-52)}" cy="{n(my0+168)}" r="30" fill="none" stroke="{GOLD_LINE}" stroke-width="2" stroke-dasharray="6 5"/>',
                text(x1 - 52, my0 + 166, "Logo", 11, SANS, GOLD_LINE, 700),
                text(x1 - 52, my0 + 180, "AGD", 11, SANS, GOLD_LINE, 700))
    svy = my0 + 212
    mk += group("consumer_service",
                text(x0 + 16, svy + 18, "Service consommateurs", 14, SANS, CREAM, 700, "start"),
                rect(x0 + 200, svy, 113, 26, RED, 13, ' stroke="#FFFFFF" stroke-width="1.5"'),
                text(x0 + 256.5, svy + 19, "0561672661", 16, SANS, "#FFFFFF", 700),
                text(x1 - 16, svy + 19, "مصلحة المستهلك:", 15, ARAB, CREAM, 700, "end"))
    s += layer("Manufacturer", mk)

    # social pages + QR
    qy = my0 + 260
    qs = 162
    so = group("qr_code", qr_code(x0, qy, qs),
               rect(x0 + qs / 2 - 45, qy + qs - 8, 90, 18, "#1B1B1B", 9),
               text(x0 + qs / 2, qy + qs + 5, "SCAN ME", 11, SANS, "#FFFFFF", 800))
    bx0 = x0 + qs + 12
    bcx = (bx0 + x1) / 2
    so += group("recipes_banner",
                rect(bx0, qy, x1 - bx0, 62, RED, 8),
                text(bcx, qy + 26, "لمزيد من الوصفات زورو صفحاتنا", 16, ARAB, "#FFD9D2", 700),
                text(bcx, qy + 50, "على الفيسبوك و الأنستغرام", 16, ARAB, "#FFD9D2", 700))
    fy = qy + 80
    so += group("social_facebook",
                rect(bx0 + 4, fy, 26, 26, "#1877F2", 6),
                text(bx0 + 19, fy + 22, "f", 24, SANS, "#FFFFFF", 800),
                text(bx0 + 40, fy + 19, "Sarl agd fruits", 15, SANS, CREAM, 700, "start"))
    iy = fy + 40
    so += group("social_instagram",
                rect(bx0 + 4, iy, 26, 26, "url(#instaGrad)", 7),
                rect(bx0 + 9, iy + 5, 16, 16, "none", 5, ' stroke="#FFFFFF" stroke-width="2"'),
                f'<circle cx="{n(bx0+17)}" cy="{n(iy+13)}" r="4" fill="none" stroke="#FFFFFF" stroke-width="2"/>'
                f'<circle cx="{n(bx0+22)}" cy="{n(iy+8)}" r="1.3" fill="#FFFFFF"/>',
                text(bx0 + 40, iy + 19, "Sarl agd fruits", 15, SANS, CREAM, 700, "start"))
    s += layer("Social_and_QR", so)

    s += guides(seam=True)
    return svg_doc("Levure Chimique – Face arrière", s, gy)


open(f"{OUT}/levure-chimique-face-avant.svg", "w", encoding="utf-8").write(front())
open(f"{OUT}/levure-chimique-face-arriere.svg", "w", encoding="utf-8").write(back())
print("written")
