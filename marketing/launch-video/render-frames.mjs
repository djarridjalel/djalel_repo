// Renders the film frame by frame: node render-frames.mjs <outDir> [fps] [from] [to] [step]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const [out, fpsArg, fromArg, toArg, stepArg] = process.argv.slice(2);
const fps = Number(fpsArg ?? 60);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
await p.goto('file://' + path.resolve('index.html'));
await p.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
const dur = await p.evaluate(() => window.duration);
const from = Number(fromArg ?? 0), to = Number(toArg ?? dur), step = Number(stepArg ?? 1 / fps);
let i = Math.round(from * fps);
for (let t = from; t < to - 1e-6; t += step) {
  await p.evaluate((t) => window.seek(t), t);
  await p.screenshot({ path: `${out}/${String(stepArg ? Math.round(t * 100) : i).padStart(5, '0')}.png`, type: 'png' });
  i++;
}
await b.close();
