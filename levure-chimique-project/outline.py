"""Writes copies of both faces with every text turned into vector shapes, into svg/outlined/.
They open the same in any app, without the fonts. Needs Inkscape 1.x on the PATH and the three
fonts from fonts/ installed. Run after build.py: python3 outline.py"""
import os, re, subprocess, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "svg")
OUT = os.path.join(SRC, "outlined")
os.makedirs(OUT, exist_ok=True)


def rtl_for_inkscape(svg):
    # Inkscape ignores the RLE ... PDF marks around the Arabic lines and misplaces their numbers,
    # so give those lines direction="rtl" and swap start/end anchors to keep the same alignment.
    def fix(m):
        tag = m.group(0)
        if "‫" not in tag:
            return tag
        head = re.match(r"<text[^>]*>", tag).group(0)
        a = re.search(r'text-anchor="(\w+)"', head).group(1)
        b = {"end": "start", "start": "end"}.get(a, a)
        return tag.replace(head, head.replace(f'text-anchor="{a}"', f'text-anchor="{b}" direction="rtl"'), 1)
    return re.sub(r"<text[^>]*>.*?</text>", fix, svg, flags=re.S)


for face in ("avant", "arriere"):
    name = f"levure-chimique-face-{face}"
    with open(os.path.join(SRC, name + ".svg"), encoding="utf-8") as f:
        svg = rtl_for_inkscape(f.read())
    with tempfile.TemporaryDirectory() as d:
        tmp = os.path.join(d, name + ".svg")
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(svg)
        subprocess.run(["inkscape", tmp, "--export-text-to-path", "--export-type=svg",
                        f"--export-filename={os.path.join(OUT, name + '-outlined.svg')}"],
                       check=True, capture_output=True)
print("written")
