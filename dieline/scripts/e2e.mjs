// End-to-end check of the editor (accounts switched off).
// Usage: npx -y playwright@1.56.1 install chromium   (once, if no Chromium is available)
//        node scripts/e2e.mjs https://djarri-dielines.vercel.app e2e-out
// Set PW_CHROMIUM to a Chromium binary to skip the download.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = process.argv[3] || 'e2e';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, proxy: process.env.HTTPS_PROXY && !BASE.includes('localhost') ? { server: process.env.HTTPS_PROXY } : undefined });
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ignoreHTTPSErrors: false });
const p = await ctx.newPage();
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

// Landing
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
const landingText = await p.textContent('body');
ok('landing has no sign-in / sign-up', !/Sign in|Sign up|Create a free account/.test(landingText));
ok('landing CTA opens the editor', await p.getByRole('link', { name: 'Open the editor' }).count() > 0);
await p.getByRole('link', { name: 'Open the editor' }).first().click();
await p.waitForURL('**/editor');
ok('CTA lands on /editor', p.url().endsWith('/editor'));

// Redirects
for (const path of ['/login', '/signup', '/projects', '/projects/abc', '/demo']) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  ok(`${path} redirects to /editor`, new URL(p.url()).pathname === '/editor', new URL(p.url()).pathname);
}

// Editor basics
await p.evaluate(() => localStorage.clear());
await p.goto(BASE + '/editor', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const vb = await p.evaluate(() => document.querySelector('.dieline-preview svg')?.getAttribute('width'));
ok('preview fits its frame', vb === '100%', vb);

const stat = async (label) => (await p.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd').textContent())?.trim();
const flat0 = await stat('Flat size');
for (const s of ['Straight tuck end', 'Crash-lock', 'Snap-lock', 'Shelf-ready tray', 'Gable box', 'Pillow pack', 'Mailer box', 'Counter display', 'Reverse tuck end']) {
  await p.getByRole('button', { name: new RegExp(s) }).first().click();
  await p.waitForTimeout(250);
  const flat = await stat('Flat size');
  const blocking = await p.getByText('Blocking').count();
  ok(`style ${s} renders without blocking checks`, !!flat && blocking === 0, flat);
  await p.screenshot({ path: `${OUT}/style-${s.split(' ')[0].toLowerCase()}.png` });
}

for (const [label, v] of [['Length', '60'], ['Width', '25'], ['Height', '110']]) await p.getByLabel(label).first().fill(v);
await p.waitForTimeout(300);

// Lock tab
const cutD = async () => p.locator('.dieline-preview #Cut path').evaluateAll((els) => els.reduce((a, e) => a + (e.getAttribute('d')?.length ?? 0), 0));
const cutA = await cutD();
await p.getByText('Lock tab through the lid fold').click();
await p.waitForTimeout(300);
ok('lock tab adds its cuts', (await cutD()) > cutA);
await p.getByText('Lock tab through the lid fold').click();
await p.waitForTimeout(300);

// Dimension change updates stats
await p.getByLabel('Length').first().fill('90');
await p.waitForTimeout(300);
ok('changing length updates flat size', (await stat('Flat size')) !== flat0, await stat('Flat size'));

// A check with a one-click fix
await p.getByRole('button', { name: 'Closures' }).isVisible();
await p.getByLabel('Tuck depth').fill('200');
await p.waitForTimeout(300);
const fixBtn = p.getByRole('button', { name: /^Use .* mm$/ }).first();
ok('oversized tuck shows a fix', await fixBtn.count() > 0);
if (await fixBtn.count()) { await fixBtn.click(); await p.waitForTimeout(300); }
ok('fix applied clears the warning', (await p.getByRole('button', { name: /^Use .* mm$/ }).count()) === 0);
await p.locator('button[title="Back to automatic"]').first().click().catch(() => {});

// Pharma layers
await p.getByRole('button', { name: /^Braille/ }).click();
await p.getByText('Add Braille (Marburg Medium)').click();
await p.getByLabel('Text').fill('Paracétamol 500 mg');
await p.getByRole('button', { name: /^Coding window/ }).click();
await p.getByText('Varnish-free coding area').click();
await p.getByRole('button', { name: /^Pharmacode/ }).click();
await p.getByText('Pharmacode zone').click();
await p.waitForTimeout(400);
const dots = await p.locator('.dieline-preview #Braille circle').count();
ok('Braille dots drawn', dots > 20, `${dots} dots`);
ok('coding window drawn', await p.locator('.dieline-preview #VarnishFree polygon').count() > 0);
ok('pharmacode drawn', await p.locator('.dieline-preview #Pharmacode polygon').count() > 0);

// Tamper evidence
await p.getByRole('button', { name: /^Tamper evidence/ }).click();
await p.getByRole('button', { name: 'Tear strip', exact: true }).click();
await p.waitForTimeout(300);
ok('tear strip adds perforations', await p.locator('.dieline-preview #Perforation path').count() > 0);

// Carton options: hang tab, window, zip strip, dispenser
const cutLen = async () => (await p.locator('.dieline-preview #Cut path').evaluate((e) => e.getAttribute('d')?.length ?? 0).catch(() => 0));
const cut0 = await cutLen();
await p.getByRole('button', { name: /^Hang tab/ }).click();
await p.getByText('Hanger above the front panel').click();
await p.getByRole('button', { name: /^Window/ }).click();
await p.getByText('Window cut-out').click();
await p.waitForTimeout(400);
ok('hang tab drawn', await p.locator('.dieline-preview text', { hasText: 'HANGER' }).count() > 0);
ok('window and slot add cut lines', (await cutLen()) > cut0);
await p.getByRole('button', { name: /^Zip opening/ }).click();
await p.getByText('Zip strip round the body').click();
await p.getByRole('button', { name: /^Dispenser opening/ }).click();
await p.getByText('Perforated push-in opening').click();
await p.waitForTimeout(400);
ok('dispenser drawn', await p.locator('.dieline-preview text', { hasText: 'PUSH' }).count() > 0);
ok('carton options leave no errors', await p.locator('[data-severity="error"]').count() === 0);
for (const t of ['Hanger above the front panel', 'Window cut-out', 'Zip strip round the body', 'Perforated push-in opening']) await p.getByText(t).click();
await p.waitForTimeout(300);

// Size from contents
await p.getByRole('button', { name: 'Size from blister + leaflet' }).click();
await p.getByRole('button', { name: 'Use these dimensions' }).click();
await p.waitForTimeout(300);
ok('size from contents applied', (await p.getByLabel('Length').first().inputValue()) === '51.5', await p.getByLabel('Length').first().inputValue());

// Layer toggle
await p.getByRole('button', { name: 'Bleed' }).first().click();
ok('layer toggle hides bleed', await p.locator('.dieline-preview #Bleed').count() === 0);
await p.getByRole('button', { name: 'Bleed' }).first().click();

// Zoom controls
await p.getByRole('button', { name: 'Zoom in' }).click();
const vbZoom = await p.evaluate(() => document.querySelector('.dieline-preview svg')?.getAttribute('viewBox'));
await p.getByRole('button', { name: 'Fit' }).click();
const vbFit = await p.evaluate(() => document.querySelector('.dieline-preview svg')?.getAttribute('viewBox'));
ok('zoom and fit change the view', vbZoom !== vbFit);

// Name + version + persistence
await p.getByLabel('Project name').fill('Paracetamol 500 mg x16');
await p.getByPlaceholder(/Note for v1/).fill('first proof');
await p.getByRole('button', { name: 'Save v1' }).click();
await p.waitForTimeout(1500);
ok('version v1 listed', await p.getByText('first proof').count() > 0);
await p.screenshot({ path: `${OUT}/editor-full.png` });
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(600);
ok('work survives a reload (name)', (await p.getByLabel('Project name').inputValue()) === 'Paracetamol 500 mg x16');
ok('work survives a reload (Braille)', await p.locator('.dieline-preview #Braille circle').count() > 20);
ok('versions survive a reload', await p.getByText('first proof').count() > 0);

// Downloads
for (const k of ['PDF', 'SVG', 'DXF']) {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.getByRole('button', { name: k, exact: true }).click()]);
  const f = `${OUT}/${dl.suggestedFilename()}`;
  await dl.saveAs(f);
  const head = fs.readFileSync(f).subarray(0, 12).toString();
  const good = k === 'PDF' ? head.startsWith('%PDF') : k === 'SVG' ? head.startsWith('<svg') : head.startsWith('0');
  ok(`${k} download`, good, `${dl.suggestedFilename()} ${fs.statSync(f).size} bytes`);
}
await p.getByRole('button', { name: 'Die-maker only' }).click();
const [dl2] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'SVG', exact: true }).click()]);
await dl2.saveAs(`${OUT}/diemaker.svg`);
const dm = fs.readFileSync(`${OUT}/diemaker.svg`, 'utf8');
ok('die-maker export keeps only production layers', dm.includes('id="Cut"') && !dm.includes('id="Bleed"') && !dm.includes('id="SafeArea"'));

// New carton
p.once('dialog', d => d.accept());
await p.getByRole('button', { name: 'New', exact: true }).click();
await p.waitForTimeout(500);
ok('New resets the carton', (await p.getByLabel('Project name').inputValue()) === 'Untitled carton' && await p.locator('.dieline-preview #Braille').count() === 0);

// Mobile
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await m.newPage();
mp.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
await mp.goto(BASE + '/editor', { waitUntil: 'networkidle' });
await mp.waitForTimeout(500);
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok('mobile: no sideways scrolling', !overflow);
await mp.getByRole('button', { name: 'Design', exact: true }).tap();
const fs16 = await mp.evaluate(() => getComputedStyle(document.querySelector('input')).fontSize);
ok('mobile: inputs are 16px (no iOS zoom)', fs16 === '16px', fs16);
await mp.getByRole('button', { name: /Checks/ }).tap();
ok('mobile: checks tab opens', await mp.getByText('Download').count() > 0);
await mp.screenshot({ path: `${OUT}/mobile-checks.png` });
await mp.getByRole('button', { name: 'Preview', exact: true }).tap();
await mp.screenshot({ path: `${OUT}/mobile-preview.png` });
await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
ok('mobile: landing has no sideways scrolling', !(await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
await mp.screenshot({ path: `${OUT}/mobile-landing.png`, fullPage: true });

ok('no browser errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close();
console.log(results.join('\n'));
console.log(`\n${results.filter(r => r.startsWith('PASS')).length}/${results.length} passed`);
