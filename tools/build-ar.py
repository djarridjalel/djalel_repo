#!/usr/bin/env python3
"""Generate the Arabic site from the English one.

The Arabic pages are built, never hand-kept. Forking six files would mean
every later change to the English site had to be made twice, and the pair
would be out of step the first time one was forgotten. Here the English
pages stay the single source of structure; this file supplies direction,
typography and links; content/ar.json supplies the words.

Run:  python3 tools/build-ar.py
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ["index.html", "about.html", "archive.html", "contact.html",
         "work/laformul.html", "work/evolab.html", "work/natural-solution.html"]

NAV_EN = {"Work": "الأعمال", "Archive": "الأرشيف",
          "About": "عن الاستوديو", "Contact": "اتصل"}

# Strings with no data-ed key of their own: the head, and the hero headline,
# which sits inside the locked hero markup.
_HEAD_SEEN = set()
_HEAD_UNUSED = set()
HEAD = {
  "<title>Djarri Design Studio — Unlocking your brands' unrealised potential</title>":
    "<title>Djarri Design Studio — إطلاق الطاقات الكامنة في علاماتك</title>",
  "<title>About Abdeldjalil Djarri — Djarri Design Studio</title>":
    "<title>عن عبد الجليل جرّي — Djarri Design Studio</title>",
  "<title>Selected Archive — Djarri Design Studio</title>":
    "<title>مختارات من الأرشيف — Djarri Design Studio</title>",
  # brand names stay in Latin, as they do throughout the Arabic body copy
  "<title>Evolab Laboratories — Djarri Design Studio</title>":
    "<title>Evolab Laboratories — Djarri Design Studio</title>",
  "<title>Natural Solution + Natural Skin — Djarri Design Studio</title>":
    "<title>Natural Solution + Natural Skin — Djarri Design Studio</title>",
  "<title>Laformul + BioFormul — Djarri Design Studio</title>":
    "<title>Laformul + BioFormul — Djarri Design Studio</title>",
  "Creative Director and packaging designer for pharmaceutical, parapharmaceutical and consumer-health brands. Director of the filmmaking department at Revolution Agency.":
    "مدير إبداعي ومصمّم تغليف لعلامات الأدوية وشبه الصيدلانيات والصحة الاستهلاكية. مدير قسم الإنتاج السينمائي في Revolution Agency.",
  "Identities, campaigns, catalogues, brand systems and film work beyond the three featured case studies.":
    "هويات وحملات وكتالوجات وأنظمة علامات وأعمال فيلمية، إلى جانب دراسات الحالة الثلاث المعروضة.",
  "A full rebrand for a pharmaceutical laboratory: identity, a five-SKU packaging system, an exhibition build and a bilingual site.":
    "إعادة بناء كاملة لعلامة مخبر أدوية: هوية، ونظام تغليف لخمسة منتجات، وجناح معرض، وموقع بلغتين.",
  "A three-year parapharmaceutical partnership that scaled past thirty products without being redrawn, and the skincare sub-brand it produced — which kept the name, the typeface and almost nothing else.":
    "شراكة شبه صيدلانية امتدّت ثلاث سنوات وتجاوزت ثلاثين منتجًا دون إعادة رسم النظام، والعلامة الفرعية للعناية بالبشرة التي نتجت عنها — واحتفظت بالاسم والخط، ولا شيء آخر تقريبًا.",
  "A dermo-cosmetic brand built from zero, then extended into a science-led sibling once the first one had proved the market.":
    "علامة تجميل طبّي بُنيت من الصفر، ثم امتدّت إلى علامة شقيقة ذات منحى علمي بعد أن أثبتت الأولى السوق.",
  "Djarri Design Studio — brand identity and packaging systems for pharmaceutical and parapharmaceutical companies. Creative direction by Abdeldjalil Djarri.":
    "Djarri Design Studio — هوية علامات وأنظمة تغليف لشركات الأدوية وشبه الصيدلانيات. إدارة إبداعية: عبد الجليل جرّي.",
  "Unlocking your brands' unrealised potential — brand identity and packaging systems for regulated health markets.":
    "إطلاق الطاقات الكامنة في علاماتك — هوية علامات وأنظمة تغليف لأسواق صحية مقنّنة.",
  "<b>unlocking</b> your <b>brands'</b> unrealised <b>potential</b>":
    "<b>إطلاق</b> الطاقات <b>الكامنة</b> في <b>علاماتك</b>",
  "Abdeldjalil DJARRI · Creative Director<br>":
    "عبد الجليل جرّي · مدير إبداعي<br>",
  "Identity · Packaging · Creative direction":
    "هوية · تغليف · إدارة إبداعية",
  # the four proof tiles carry no data-ed of their own
  "<div class=\"l\">Years in<br>practice</div>": "<div class=\"l\">سنوات<br>ممارسة</div>",
  "<div class=\"l\">Products<br>on shelves</div>": "<div class=\"l\">منتجات<br>على الرفوف</div>",
  "<div class=\"l\">Brand<br>identities</div>": "<div class=\"l\">هويات<br>علامات</div>",
  "<div class=\"l\">Client<br>projects</div>": "<div class=\"l\">مشاريع<br>عملاء</div>",
  "<title>Start a project — Djarri Design Studio</title>":
    "<title>ابدأ مشروعًا — Djarri Design Studio</title>",
  "Commission brand identity and packaging systems for pharmaceutical, parapharmaceutical and dermo-cosmetic ranges. What to send, and where.":
    "كلّف الاستوديو بهوية علامة ونظام تغليف لتشكيلات الأدوية وشبه الصيدلانيات والتجميل الطبّي. ماذا ترسل، وإلى أين.",
  "<meta property=\"og:title\" content=\"Start a project — Djarri Design Studio\">":
    "<meta property=\"og:title\" content=\"ابدأ مشروعًا — Djarri Design Studio\">",
  "Bring the range while it is still an idea.":
    "اعرض التشكيلة وهي ما تزال فكرة.",
  "https://wa.me/213556956452?text=Hello%20%E2%80%94%20I%27d%20like%20to%20book%20a%20call%20about%20a%20project.":
    "https://wa.me/213556956452?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%20%E2%80%94%20%D8%A3%D9%88%D8%AF%D9%91%20%D8%AD%D8%AC%D8%B2%20%D9%85%D9%83%D8%A7%D9%84%D9%85%D8%A9%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D9%85%D8%B4%D8%B1%D9%88%D8%B9.",
  # the credentials list on About carries no data-ed keys either
  "<span class=\"k\">Position</span><span>Creative Director · Packaging &amp; Brand Designer</span>":
    "<span class=\"k\">المنصب</span><span>مدير إبداعي · مصمّم تغليف وعلامات</span>",
  "<span class=\"k\">Leadership</span><span>Director of the filmmaking department, Revolution Agency — product films, brand films and motion work</span>":
    "<span class=\"k\">القيادة</span><span>مدير قسم الإنتاج السينمائي، Revolution Agency — أفلام منتجات وأفلام علامات وأعمال حركة</span>",
  "<span class=\"k\">Experience</span><span>9+ years · 100+ products on shelves · 30+ brand identities · 100+ client projects</span>":
    "<span class=\"k\">الخبرة</span><span><span dir=\"ltr\">9+</span> سنوات · <span dir=\"ltr\">100+</span> منتج على الرفوف · <span dir=\"ltr\">30+</span> هوية علامة · <span dir=\"ltr\">100+</span> مشروع عميل</span>",
  "<span class=\"k\">Sectors</span><span>Pharmaceutical · Parapharmaceutical · Dermo-cosmetic · Consumer health</span>":
    "<span class=\"k\">القطاعات</span><span>أدوية · شبه صيدلانيات · تجميل جلدي · صحّة استهلاكية</span>",
  "<span class=\"k\">Education</span><span>Master\'s degree, Software Engineering — University of Constantine 2, 2018</span>":
    "<span class=\"k\">التكوين</span><span>ماجستير في هندسة البرمجيات — جامعة قسنطينة <span dir=\"ltr\">2</span>، <span dir=\"ltr\">2018</span></span>",
  "<span class=\"k\">Languages</span><span>Arabic · French · English</span>":
    "<span class=\"k\">اللغات</span><span>العربية · الفرنسية · الإنجليزية</span>",

  # --- strings with no data-ed key: links, row keys, tally labels ---
  ">Read the full background ": ">اقرأ الخلفية كاملة ",
  ">Browse the archive ": ">تصفّح الأرشيف ",
  ">Start with a case study ": ">ابدأ بدراسة حالة ",
  ">Back to the featured work ": ">عودة إلى الأعمال المختارة ",
  "</span> Scroll down": "</span> مرّر للأسفل",
  ">Email</a>": ">البريد</a>",

  "<div class=\"sys-k\">Mark</div>": "<div class=\"sys-k\">العلامة</div>",
  "<div class=\"sys-k\">Typography</div>": "<div class=\"sys-k\">الطباعة</div>",
  "<div class=\"sys-k\">Colour</div>": "<div class=\"sys-k\">اللون</div>",
  "<div class=\"sys-k\">Packaging</div>": "<div class=\"sys-k\">التغليف</div>",
  "<div class=\"sys-k\">Architecture</div>": "<div class=\"sys-k\">المعمار</div>",
  "<div class=\"sys-k\">Environment</div>": "<div class=\"sys-k\">البيئة</div>",
  "<div class=\"sys-k\">Digital</div>": "<div class=\"sys-k\">الرقميّ</div>",
  "<div class=\"sys-k\">Social</div>": "<div class=\"sys-k\">التواصل الاجتماعي</div>",
  "<div class=\"sys-k\">Wordmark</div>": "<div class=\"sys-k\">الشعار المكتوب</div>",
  "<div class=\"sys-k\">SKU system</div>": "<div class=\"sys-k\">نظام المنتجات</div>",
  "<div class=\"sys-k\">Carton</div>": "<div class=\"sys-k\">العلبة</div>",

  "<div class=\"l\">Identity systems</div>": "<div class=\"l\">أنظمة هوية</div>",
  "<div class=\"l\">Years apart</div>": "<div class=\"l\">سنوات بينهما</div>",
  "<div class=\"l\">Product categories</div>": "<div class=\"l\">فئات منتجات</div>",
  "<div class=\"l\">Outcome</div>": "<div class=\"l\">النتيجة</div>",
  "<div class=\"l\">SKUs on shelf</div>": "<div class=\"l\">منتجات على الرفّ</div>",
  "<div class=\"l\">Logo modes</div>": "<div class=\"l\">صيغ الشعار</div>",
  "<div class=\"l\">Languages</div>": "<div class=\"l\">لغات</div>",
  "<div class=\"l\">Products</div>": "<div class=\"l\">منتجات</div>",
  "<div class=\"l\">Logo formats</div>": "<div class=\"l\">صيغ الشعار</div>",
  "<div class=\"l\">Years to the sub-brand</div>": "<div class=\"l\">سنوات حتى العلامة الفرعية</div>",
  "<div class=\"l\">Brands in the family</div>": "<div class=\"l\">علامات في العائلة</div>",

  "Yellow-green → deep blue": "أخضر مصفرّ ← أزرق عميق",
  "60 / 30 / 10 — grey, grey, gold": "<span dir=\"ltr\">60 / 30 / 10</span> — رماديّ، رماديّ، ذهبيّ",
  "Deep ocean blue / yellow-green": "أزرق محيطيّ عميق / أخضر مصفرّ",
  "Coffee / skintone / sand / olive": "بُنّي / لون البشرة / رمليّ / زيتونيّ",

  ">Case 01 ": ">الحالة 01 ",
  ">Case 02 ": ">الحالة 02 ",
  ">Case 03 ": ">الحالة 03 ",
}


def inner_span(html, start):
    """Return (i, j) of the inner content of the element opening at `start`,
    walking nested tags so a value containing markup is matched whole."""
    tag = re.match(r'<([a-zA-Z0-9]+)', html[start:]).group(1)
    i = html.index('>', start) + 1
    depth, k = 1, i
    open_re = re.compile(r'<(/?)' + tag + r'[\s/>]', re.I)
    while depth:
        m = open_re.search(html, k)
        if not m:
            raise ValueError("unbalanced <%s> at %d" % (tag, start))
        depth += -1 if m.group(1) else 1
        k = m.end()
    return i, html.rindex('</', i, k)


def translate(html, words, page):
    """Swap every data-ed value this page has a translation for."""
    hit = miss = 0
    for key in sorted(words, key=len, reverse=True):
        pos = 0
        while True:
            m = re.search(r'<[a-zA-Z0-9]+[^>]*\bdata-ed="%s"' % re.escape(key),
                          html[pos:])
            if not m:
                break
            start = pos + m.start()
            try:
                i, j = inner_span(html, start)
            except ValueError as e:
                print("  ! %s %s: %s" % (page, key, e)); break
            html = html[:i] + words[key] + html[j:]
            pos = i + len(words[key])
            hit += 1
    return html, hit


def build(page, words):
    src = io.open(os.path.join(ROOT, page), encoding="utf-8").read()
    depth = page.count("/")                      # work/ pages sit one deeper

    html, hit = translate(src, words, page)

    # direction and language
    html = re.sub(r'<html[^>]*>', '<html lang="ar" dir="rtl">', html, count=1)

    # The pointer-light effect splits every character into its own span so it
    # can colour them one at a time. Latin survives that; Arabic does not —
    # it is a joined script, and a letter in a box of its own loses the
    # connections that make it part of a word. The whole page would render as
    # disconnected glyphs. So the effect is dropped here rather than guarded
    # in the shared script: a hover flourish is worth less than legible text.
    # The pointer-light stays. It used to be stripped here because its
    # splitter cut every glyph into its own span, which takes a joined
    # script apart; it now cuts Arabic at the spaces instead, so the
    # headings keep their shaping and the light travels word by word.

    # head copy, which carries no data-ed of its own
    for pat, rep in HEAD.items():
        if pat in src or pat in html:
            _HEAD_SEEN.add(pat); _HEAD_UNUSED.discard(pat)
        elif pat not in _HEAD_SEEN:
            _HEAD_UNUSED.add(pat)
        html = html.replace(pat, rep)

    # the Arabic face, alongside the Latin ones the artwork captions still need
    html = html.replace(
        "family=Poppins:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500",
        "family=Poppins:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500"
        "&family=IBM+Plex+Sans+Arabic:wght@300;400;600;700")

    # arrows point the other way in a right-to-left page
    html = html.replace("&#8594;", "&#8592;")

    # assets live at the repo root; an /ar/ page is one level further from them
    # An /ar/ page sits one level deeper than its English original, so the
    # hop back to assets/ is its own depth plus one - NOT the original's
    # ../ count plus one, which double-counted and gave the work pages
    # three hops where they need two. Served from a domain root the browser
    # clamps the extra hop at / and it still resolves, which is why this
    # survived a 12-page pass; it breaks on a filesystem and in any
    # subdirectory deployment.
    html = re.sub(r'(?<=["\'(])(\.\./)*assets/',
                  lambda m: "../" * (depth + 1) + "assets/", html)

    # nav labels, and the switch back to English
    for en, ar in NAV_EN.items():
        html = re.sub(r'(<a [^>]*>)%s(</a>)' % en, r'\1%s\2' % ar, html)
    back = "../" * depth + "../" + page
    # the English page already carries a link TO Arabic; on the Arabic page
    # that link is pointing at the page you are standing on, so it goes and
    # the way back takes its place
    html = re.sub(r'\s*<a class="nav-lang"[^>]*>[^<]*</a>\n?', '\n', html)
    html = html.replace(
        '</div>\n</nav>',
        '  <a class="nav-lang" href="%s" lang="en" dir="ltr">EN</a>\n'
        '  </div>\n</nav>' % back, 1)

    out = os.path.join(ROOT, "ar", page)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    io.open(out, "w", encoding="utf-8").write(html)
    return hit, len(re.findall(r'data-ed="', src))


def main():
    words = json.load(io.open(os.path.join(ROOT, "content/ar.json"),
                              encoding="utf-8"))
    total_hit = 0
    for page in PAGES:
        hit, keys = build(page, words.get(page, {}))
        total_hit += hit
        have = len(words.get(page, {}))
        print("  %-28s %3d/%-3d keys translated" % (page, hit, have))
    print("  %d substitutions" % total_hit)


if __name__ == "__main__":
    main()

if _HEAD_UNUSED:
    import sys
    print('\nERROR: %d <head>/unkeyed pattern(s) matched no English page.' % len(_HEAD_UNUSED),
          file=sys.stderr)
    print('The English copy was reworded; update the mapping or the Arabic pages '
          'keep the English (or a translation of dead copy):', file=sys.stderr)
    for k in sorted(_HEAD_UNUSED):
        print('  - ' + k[:120].replace('\n', ' '), file=sys.stderr)
    sys.exit(1)
