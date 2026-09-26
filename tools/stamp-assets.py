#!/usr/bin/env python3
"""Stamp the shared CSS and JS links with a short hash of the file they point at.

The asset filenames carry no content hash of their own, and the serving rules
let a browser keep a stylesheet for a day. Those two together mean a visitor
can be handed this version's markup with last version's CSS — which does not
fail loudly, it just renders the parts the old file happens to know about.

A hash in the query string ends that: the URL changes whenever the bytes do,
so a page can never be served alongside a stale copy of its own stylesheet.
Re-run after editing site.css or site.js; it is idempotent.
"""
import hashlib, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'about.html', 'archive.html', 'contact.html', 'editor.html',
         'work/evolab.html', 'work/natural-solution.html', 'work/laformul.html']
ASSETS = ['assets/site.css', 'assets/site.js', 'assets/content.js', 'assets/logo3d.js',
          'assets/booth/booth.js']

def short(rel):
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:8]

def main():
    ver = {a: short(a) for a in ASSETS}
    changed = 0
    for page in PAGES:
        p = ROOT / page
        if not p.exists():
            continue
        s = orig = p.read_text()
        for a in ASSETS:
            # any depth of ../, with or without a version already on it
            s = re.sub(r'((?:\.\./)*' + re.escape(a) + r')(\?v=[0-9a-f]+)?(?=["\'])',
                       lambda m: m.group(1) + '?v=' + ver[a], s)
        if s != orig:
            p.write_text(s); changed += 1
            print('  stamped', page)
    print('%d page(s) stamped: %s' % (changed,
          ', '.join('%s=%s' % (a.split("/")[-1], v) for a, v in ver.items())))

if __name__ == '__main__':
    main()
