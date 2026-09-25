#!/usr/bin/env python3
"""Build self-contained single-file previews of every page.

A preview page is published on its own, with no siblings to fetch, so
everything a page needs is inlined: the stylesheet (and what it points at),
the scripts, and every local asset as a data URI. Links between pages are
rewritten to the published previews listed in tools/preview-urls.json.

This lived in /tmp and was lost when the container was reclaimed; it belongs
with the other build scripts. Not shipped — tools/ is excluded from uploads.

Usage:  python3 tools/build-preview.py OUT_DIR
"""
import base64, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'preview')
OUT.mkdir(parents=True, exist_ok=True)
URLS = json.loads((ROOT / 'tools' / 'preview-urls.json').read_text())
MIME = {'.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.json': 'application/json'}
_cache = {}

def local(base, ref):
    """The file a reference points at, with any ?v= stamp taken off."""
    return (base / ref.split('?')[0]).resolve()

def datauri(path):
    if path not in _cache:
        _cache[path] = 'data:%s;base64,%s' % (MIME[path.suffix.lower()],
                                              base64.b64encode(path.read_bytes()).decode())
    return _cache[path]

def build(rel):
    base = (ROOT / rel).parent
    html = (ROOT / rel).read_text()

    def css(m):
        text = local(base, m.group(1)).read_text()
        cssdir = local(base, m.group(1)).parent
        text = re.sub(r'url\((["\']?)([^)"\']+)\1\)',
                      lambda u: 'url(%s)' % datauri((cssdir / u.group(2)).resolve())
                      if (cssdir / u.group(2)).resolve().suffix.lower() in MIME
                      and (cssdir / u.group(2)).resolve().exists() else u.group(0), text)
        return '<style>\n' + text + '\n</style>'
    html = re.sub(r'<link rel="stylesheet" href="((?:\.\./)*assets/[^"]+)">', css, html)
    html = re.sub(r'<script src="((?:\.\./)*assets/[^"]+)"[^>]*></script>',
                  lambda m: '<script>\n' + local(base, m.group(1)).read_text() + '\n</script>', html)

    # every remaining local asset — src, href and data-src alike
    def asset(m):
        p = local(base, m.group(1))
        return m.group(0).replace(m.group(1), datauri(p)) if p.exists() and p.suffix.lower() in MIME else m.group(0)
    html = re.sub(r'(?:src|href)="((?:\.\./)*assets/[^"]+)"', asset, html)

    # page links become the previews they were published as
    def link(m):
        href, frag = m.group(1), ''
        if '#' in href:
            href, frag = href.split('#', 1); frag = '#' + frag
        try:
            target = str((base / href).resolve().relative_to(ROOT)) if href else ''
        except ValueError:
            return m.group(0)
        url = URLS.get(target)
        if not url:
            return 'href="%s"' % (frag or '#')
        return 'href="%s%s" target="_top"' % (url, frag)
    html = re.sub(r'href="(?!https?:|mailto:|tel:|//|/|#)(?!editor\.html)([^":]*\.html(?:#[\w-]+)?)"', link, html)

    dest = OUT / rel.replace('/', '-')
    dest.write_text(html)
    return dest, len(html)

if __name__ == '__main__':
    for rel in URLS:
        dest, n = build(rel)
        print('  %-30s -> %-28s %5dKB' % (rel, dest.name, n // 1024))
