// node render.mjs <outDir> <fps> [from] [to] [step]  (serve this folder on :8765 first)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, fpsArg, fromArg, toArg, stepArg] = process.argv.slice(2);
const fps = Number(fpsArg ?? 60);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://127.0.0.1:8765/index.html');
await p.waitForFunction(() => window.ready === true || window.err, null, { timeout: 300000 });
const err = await p.evaluate(() => window.err);
if (err) { console.log(err); process.exit(1); }
const dur = await p.evaluate(() => window.duration);
const from = Number(fromArg ?? 0), to = Number(toArg ?? dur);
if (stepArg) {
  for (let t = from; t < to - 1e-6; t += Number(stepArg)) {
    await p.evaluate((t) => window.seek(t), t);
    await p.screenshot({ path: `${out}/${String(Math.round(t * 100)).padStart(5, '0')}.png` });
  }
} else {
  for (let i = Math.round(from * fps); i < Math.round(to * fps); i++) {
    await p.evaluate((t) => window.seek(t), i / fps);
    await p.screenshot({ path: `${out}/${String(i).padStart(5, '0')}.png` });
  }
}
await b.close();
