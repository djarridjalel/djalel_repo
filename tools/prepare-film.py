#!/usr/bin/env python3
"""Turn a source video into the stand's screen film.

The film plays on the stand's screen in the homepage hero, in the screen's
close-up (see "the film on the screen" in assets/booth/booth.js). This writes
what the page needs from one source file:

  assets/booth/screen-film.mp4          H.264 + AAC, 1280x720, fast start:
                                        what every browser plays
  assets/booth/screen-film-still.webp   one frame at the screen texture's
                                        size (1600x892), shown at rest
  tools/.film-preview.mp4               a light copy for the single-file
                                        previews, which must stay under 16 MB
                                        (not shipped; tools/ is not uploaded)

The screen is 1.79:1, a hair wider than 16:9, so a 16:9 source fills it with
a sliver cropped top and bottom rather than being stretched.

Needs ffmpeg: on PATH, or `pip install imageio-ffmpeg`.

Usage:  python3 tools/prepare-film.py SOURCE [--still SECONDS]
Then set data-film / data-film-still on #stage in index.html (the script
prints the attributes) and run build-ar.py and stamp-assets.py as usual.
"""
import argparse, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'booth'


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('ffmpeg not found: install it, or `pip install imageio-ffmpeg`')


def run(*args):
    subprocess.run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('source')
    ap.add_argument('--still', type=float, default=1.0, help='time of the resting frame, in seconds')
    a = ap.parse_args()
    src = str(pathlib.Path(a.source).resolve())
    fill = 'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1'

    film = OUT / 'screen-film.mp4'
    run('-i', src, '-vf', fill.format(w=1280, h=720), '-r', '25',
        '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', str(film))

    still = OUT / 'screen-film-still.webp'
    run('-ss', str(a.still), '-i', src, '-frames:v', '1', '-vf', fill.format(w=1600, h=892),
        '-c:v', 'libwebp', '-quality', '82', str(still))

    preview = ROOT / 'tools' / '.film-preview.mp4'
    run('-i', src, '-vf', fill.format(w=640, h=360), '-r', '24',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '32', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-movflags', '+faststart', str(preview))

    for f in (film, still, preview):
        print('  %-40s %6d KB' % (f.relative_to(ROOT), f.stat().st_size // 1024))
    print('\n#stage attributes:\n  data-film="assets/booth/screen-film.mp4" '
          'data-film-still="assets/booth/screen-film-still.webp"')


if __name__ == '__main__':
    main()
