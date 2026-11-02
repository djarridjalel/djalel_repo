"""Lens transitions on the rendered frames: barrel distortion with radial
chromatic aberration and a light zoom blur, peaking on each cut's beat.

python3 post.py <in_dir> <out_dir> [first_frame last_frame]
"""
import os
import sys
import numpy as np
from PIL import Image

FPS = 60
# Scene cuts (s) and strength: the transitions land exactly on these beats.
CUTS = [
    (3.74, 0.9),   # dieline -> words
    (5.87, 1.0),   # words -> size (dark)
    (7.41, 1.0),   # size -> fold
    (9.43, 0.8),   # fold -> verbs
    (11.47, 0.9),  # verbs -> lockup
    (13.49, 1.0),  # lockup -> AI (dark)
    (15.98, 1.1),  # AI -> macro
    (21.13, 0.7),  # whole -> best angle
    (23.15, 0.8),  # shutter -> reference card
    (24.17, 0.9),  # -> Magnific
    (28.00, 1.4),  # the hit: Generate -> burst
    (30.23, 0.8),  # -> end card
]
W, H = 1920, 1080
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = W / 2, H / 2
nx, ny = (xx - cx) / cx, (yy - cy) / cx
r2 = nx * nx + ny * ny


def amount(t):
    a = 0.0
    for c, s in CUTS:
        d = t - c
        # Rises fast into the cut and settles after it.
        if -0.12 <= d <= 0.3:
            k = np.exp(-((d / 0.05) ** 2)) if d < 0 else np.exp(-d / 0.08)
            a = max(a, s * k)
    return a


def sample(img, mx, my):
    """Bilinear sample of img at (mx, my)."""
    mx = np.clip(mx, 0, W - 1.001)
    my = np.clip(my, 0, H - 1.001)
    x0 = mx.astype(np.int32)
    y0 = my.astype(np.int32)
    fx = (mx - x0)[..., None]
    fy = (my - y0)[..., None]
    a = img[y0, x0]
    b = img[y0, x0 + 1]
    c = img[y0 + 1, x0]
    d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def lens(img, a):
    k = 0.22 * a
    zoom = 1 + 0.06 * a
    out = np.empty_like(img)
    # One warp per channel: red pulled out, blue pushed in (radial aberration).
    for ch, extra in ((0, 0.018 * a), (1, 0.0), (2, -0.018 * a)):
        f = (1 + k * r2 + extra * np.sqrt(r2) * 2) / zoom
        mx = cx + nx * f * cx
        my = cy + ny * f * cx
        out[..., ch] = sample(img[..., ch : ch + 1], mx, my)[..., 0]
    # Zoom blur towards the centre, a few taps.
    if a > 0.15:
        acc = out.copy()
        n = 4
        for i in range(1, n + 1):
            s = 1 - 0.012 * a * i
            mx = cx + (xx - cx) * s
            my = cy + (yy - cy) * s
            acc += sample(out, mx, my)
        out = acc / (n + 1)
    # A brief lift of exposure on the strongest frames.
    out = out * (1 + 0.08 * a)
    return out


def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    files = sorted(f for f in os.listdir(src) if f.endswith(".png"))
    lo = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    hi = int(sys.argv[4]) if len(sys.argv) > 4 else 10**9
    for f in files:
        i = int(f[:5])
        if i < lo or i >= hi:
            continue
        t = i / FPS
        a = amount(t)
        out = os.path.join(dst, f)
        if a < 0.01:
            if not os.path.exists(out):
                os.link(os.path.join(src, f), out)
            continue
        img = np.asarray(Image.open(os.path.join(src, f)).convert("RGB"), dtype=np.float32)
        res = lens(img, a)
        Image.fromarray(np.clip(res, 0, 255).astype(np.uint8)).save(out)


if __name__ == "__main__":
    main()
