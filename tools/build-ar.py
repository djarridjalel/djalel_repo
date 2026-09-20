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
PAGES = ["index.html", "about.html", "archive.html",
         "work/laformul.html", "work/evolab.html", "work/natural-solution.html"]

NAV_EN = {"Work": "الأعمال", "Archive": "الأرشيف",
          "About": "عن الاستوديو", "Contact": "اتصل"}

# Strings with no data-ed key of their own: the head, and the hero headline,
# which sits inside the locked hero markup.
HEAD = {
  "<title>Djarri Design Studio — Ranges that still hold at the thirty-first product</title>":
    "<title>Djarri Design Studio — تشكيلات تصمد عند المنتج الحادي والثلاثين</title>",
  "<title>About — Djarri Design Studio</title>":
    "<title>عن الاستوديو — Djarri Design Studio</title>",
  "<title>Archive — Djarri Design Studio</title>":
    "<title>الأرشيف — Djarri Design Studio</title>",
  "Djarri Design Studio — brand identity and packaging systems for pharmaceutical and parapharmaceutical companies. Creative direction by Abdeldjalil Djarri.":
    "Djarri Design Studio — هوية علامات وأنظمة تغليف لشركات الأدوية وشبه الصيدلانيات. إدارة إبداعية: عبد الجليل جرّي.",
  "Ranges that still hold at the thirty-first product — brand identity and packaging systems for regulated health markets.":
    "تشكيلات تصمد عند المنتج الحادي والثلاثين — هوية علامات وأنظمة تغليف لأسواق صحية مقنّنة.",
  "<b>ranges</b> that still <b>hold</b> at the <b>thirty-first</b> product":
    "<b>تشكيلات</b> ما تزال <b>تصمد</b> عند المنتج <b>الحادي والثلاثين</b>",
  "Abdeldjalil DJARRI · Creative Director<br>":
    "عبد الجليل جرّي · مدير إبداعي<br>",
  "Identity · Packaging · Creative direction":
    "هوية · تغليف · إدارة إبداعية",
  # the four proof tiles carry no data-ed of their own
  "<div class=\"l\">Years in<br>practice</div>": "<div class=\"l\">سنوات<br>ممارسة</div>",
  "<div class=\"l\">Products<br>on shelves</div>": "<div class=\"l\">منتجات<br>على الرفوف</div>",
  "<div class=\"l\">Brand<br>identities</div>": "<div class=\"l\">هويات<br>علامات</div>",
  "<div class=\"l\">Client<br>projects</div>": "<div class=\"l\">مشاريع<br>عملاء</div>",
  # the credentials list on About carries no data-ed keys either
  "<span class=\"k\">Position</span><span>Creative Director · Packaging &amp; Brand Designer</span>":
    "<span class=\"k\">المنصب</span><span>مدير إبداعي · مصمّم تغليف وعلامات</span>",
  "<span class=\"k\">Leadership</span><span>Co-General Director, Revolution Agency</span>":
    "<span class=\"k\">القيادة</span><span>مدير عام مشارك، Revolution Agency</span>",
  "<span class=\"k\">Also</span><span>Head of the filmmaking department — product films, brand films and motion work</span>":
    "<span class=\"k\">وأيضًا</span><span>رئيس قسم الإنتاج السينمائي — أفلام منتجات وأفلام علامات وأعمال حركة</span>",
  "<span class=\"k\">Experience</span><span>9+ years · 100+ products on shelves · 30+ brand identities · 100+ client projects</span>":
    "<span class=\"k\">الخبرة</span><span><span dir=\"ltr\">9+</span> سنوات · <span dir=\"ltr\">100+</span> منتج على الرفوف · <span dir=\"ltr\">30+</span> هوية علامة · <span dir=\"ltr\">100+</span> مشروع عميل</span>",
  "<span class=\"k\">Sectors</span><span>Pharmaceutical · Parapharmaceutical · Dermo-cosmetic · Consumer health</span>":
    "<span class=\"k\">القطاعات</span><span>أدوية · شبه صيدلانيات · تجميل جلدي · صحّة استهلاكية</span>",
  "<span class=\"k\">Education</span><span>Master\'s degree, Software Engineering — University of Constantine 2, 2018</span>":
    "<span class=\"k\">التكوين</span><span>ماجستير في هندسة البرمجيات — جامعة قسنطينة <span dir=\"ltr\">2</span>، <span dir=\"ltr\">2018</span></span>",
  "<span class=\"k\">Languages</span><span>Arabic · French · English</span>":
    "<span class=\"k\">اللغات</span><span>العربية · الفرنسية · الإنجليزية</span>",
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
    html = re.sub(r'\s+gt-zone\b', '', html)
    html = re.sub(r'\s+gt\b(?=[\s"])', '', html)

    # head copy, which carries no data-ed of its own
    for pat, rep in HEAD.items():
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
