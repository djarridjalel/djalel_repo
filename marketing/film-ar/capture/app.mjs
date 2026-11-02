// Captures the real Dielines app (Arabic) frame by frame for the film.
// node capture/app.mjs <outDir>   (app served on http://localhost:3123)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2];
const B = [0.23, 0.81, 1.32, 1.81, 2.28, 2.72, 3.23, 3.74, 4.32, 4.88, 5.36, 5.87, 6.39, 6.92, 7.41, 7.94, 8.43, 8.94, 9.43, 9.96, 10.45, 10.98, 11.47, 11.98, 12.49, 13.0, 13.49, 14.02, 14.51, 15.02, 15.51, 16.02, 16.56, 17.07, 17.58, 18.09, 18.58, 19.09];
const FPS = 60;
const PDF = '/home/user/djalel_repo/marketing/film-ar/assets/nutriboost.pdf';
for (const d of ['make', 'drop', 'fold', 'angle']) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });
const meta = {};
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('dielines.lang', 'ar'); localStorage.removeItem('dielines.draft'); } catch {} });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:3123/editor', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const rect = async (loc) => { const r = await loc.first().boundingBox(); return r && { x: r.x, y: r.y, w: r.width, h: r.height }; };

// The Nutriboost carton's size: reverse tuck end, inside 60 x 59.5 x 139.5 mm.
await p.getByRole('button', { name: 'داخلي', exact: true }).click();
for (const [l, v] of [['الطول', '60'], ['العرض', '59.5'], ['الارتفاع', '139.5']]) await p.getByLabel(l, { exact: true }).first().fill(v);
await p.getByLabel('اسم المشروع').fill('NutriBoost 35 ml');
await p.mouse.move(1590, 890);
await p.waitForTimeout(800);
// Where the preview draws the dieline (to land the film's drawn line exactly on it).
meta.preview = await p.evaluate(() => { const s = document.querySelector('.dieline-preview svg'); const r = s.getBoundingClientRect(); return { vb: s.getAttribute('viewBox'), x: r.x, y: r.y, w: r.width, h: r.height }; });
meta.uploadBtn = await rect(p.getByRole('button', { name: 'رفع تصميم' }));
const shoot = async (dir, n) => { for (let i = 0; i < n; i++) await p.screenshot({ path: `${OUT}/${dir}/${String(i).padStart(4, '0')}.png` }); };
const frames = (t0, t1) => Math.round((t1 - t0) * FPS);

// 1. The editor, while the camera pulls back and holds (B7 -> B15).
await shoot('make', frames(B[7], B[15]));

// 2. Upload mode, the drop zone; the file is read on B16 (B15 -> B17).
await p.getByRole('button', { name: 'رفع تصميم' }).click();
await p.waitForTimeout(400);
meta.dropZone = await rect(p.getByText('أفلت ملف PDF للتغليف هنا'));
const nDrop = frames(B[15], B[17]);
const atDrop = frames(B[15], B[16]);
for (let i = 0; i < nDrop; i++) {
  if (i === atDrop) await p.locator('input[type="file"]').setInputFiles(PDF);
  await p.screenshot({ path: `${OUT}/drop/${String(i).padStart(4, '0')}.png` });
}
await p.waitForSelector('[role="status"]', { timeout: 120000 });
await p.waitForTimeout(1500);

// Slider and orbit helpers.
const slider = p.locator('input[type="range"]');
meta.slider = await rect(slider);
const setFold = (v) => slider.evaluate((el, v) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(el, String(Math.round(v * 1000)));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, v);
const canvas = await rect(p.locator('main canvas'));
meta.canvas = canvas;
const cx = canvas.x + canvas.w / 2, cy = canvas.y + canvas.h / 2;
let drag = null;
const orbit = async (dx, dy) => {
  if (!drag) { drag = { x: cx, y: cy }; await p.mouse.move(cx, cy); await p.mouse.down(); }
  drag = { x: drag.x + dx, y: drag.y + dy };
  await p.mouse.move(drag.x, drag.y);
};
const release = async () => { if (drag) { await p.mouse.up(); drag = null; } };
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const fold = (t) => {
  // Flat -> closed (B17 -> B19), open a little on B20, closed again on B21.
  if (t < B[19]) return easeOut((t - B[17]) / (B[19] - B[17]));
  if (t < B[20]) return 1 - 0.45 * easeOut((t - B[19]) / (B[20] - B[19]));
  if (t < B[21]) return 0.55 + 0.45 * easeOut((t - B[20]) / (B[21] - B[20]));
  return 1;
};

// 3. The fold on the beats, then a slow turn (B17 -> B23).
await setFold(0);
await p.waitForTimeout(600);
const nFold = frames(B[17], B[23]);
for (let i = 0; i < nFold; i++) {
  const t = B[17] + i / FPS;
  await setFold(fold(t));
  if (t >= B[21]) await orbit(-1.2, 0);
  await p.screenshot({ path: `${OUT}/fold/${String(i).padStart(4, '0')}.png` });
}
await release();

// 4. The turn to the best angle and the export (B27 -> B36).
meta.productBtn = await rect(p.getByRole('button', { name: 'صورة المنتج' }));
const nAngle = frames(B[27], B[36]);
let downloaded = null;
for (let i = 0; i < nAngle; i++) {
  const t = B[27] + i / FPS;
  if (t < B[30]) {
    const k0 = easeOut((t - B[27]) / (B[30] - B[27]));
    const k1 = easeOut(Math.min(1, (t + 1 / FPS - B[27]) / (B[30] - B[27])));
    await orbit(-430 * (k1 - k0), -40 * (k1 - k0));
  } else await release();
  if (!downloaded && t >= B[34]) {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'صورة المنتج' }).click()]);
    downloaded = `${OUT}/product.png`;
    await dl.saveAs(downloaded);
  }
  await p.screenshot({ path: `${OUT}/angle/${String(i).padStart(4, '0')}.png` });
}
const [dd] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'خريطة العمق' }).click()]);
await dd.saveAs(`${OUT}/depth.png`);
fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta, null, 1));
await b.close();
console.log('done', JSON.stringify(meta));
