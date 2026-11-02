# Dielines launch film

33 s, 1920 × 1080, 60 fps, cut to the launch track (117.5 BPM). Every frame is
rendered from `index.html`: one paused GSAP timeline (`src/main.ts`) seeked frame
by frame, with the carton drawn and folded by the app's own dieline and 3D code
(`../../dieline/src/lib/dieline`).

```
npm install
npx esbuild src/main.ts --bundle --format=iife --outfile=dist/main.js --alias:clipper-lib=../../dieline/node_modules/clipper-lib
node render-frames.mjs frames 60          # PNG per frame (Chromium via Playwright)
ffmpeg -framerate 60 -i frames/%05d.png -i music.mp3 -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest dielines-launch.mp4
```

The product (NOVA paracetamol) is made up for the film.
