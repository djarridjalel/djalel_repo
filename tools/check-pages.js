/* Page checks. These lived in a scratch directory and were lost when the
   container was reclaimed, twice over; they belong with the build scripts
   that need them. Not shipped — tools/ is excluded from the upload bundle.

   Run:  node tools/check-pages.js            (serves the repo itself)
*/
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html','about.html','archive.html','contact.html',
  'work/evolab.html','work/natural-solution.html','work/laformul.html'];
const ALL = PAGES.concat(PAGES.map(p => 'ar/' + p));
const TYPES = {'.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.glb':'model/gltf-binary'};

function serve(port){
  return http.createServer((rq,rs)=>{
    const f = path.join(ROOT, decodeURIComponent(rq.url.split('?')[0]));
    fs.readFile(f,(e,d)=>{ if(e){rs.writeHead(404);return rs.end();}
      rs.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});rs.end(d);});
  }).listen(port);
}

(async () => {
  const srv = serve(8951);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const fail = [];
  for (const rel of ALL) {
    const pg = await b.newPage({ viewport:{width:1440,height:900} });
    const errs = [];
    pg.on('pageerror', e => errs.push('JS: ' + e.message.slice(0,90)));
    pg.on('response', r => { if (r.status() >= 400) errs.push(r.status()+' '+r.url().split('/').pop()); });
    await pg.goto('http://localhost:8951/' + rel, { waitUntil:'networkidle' });
    const r = await pg.evaluate(() => {
      const dead = [...document.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => !h || h === '#' || h.trim() === '');
      const imgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0).length;
      return { dir: document.documentElement.dir || 'ltr',
               lang: document.documentElement.lang,
               ov: document.documentElement.scrollWidth > innerWidth,
               dead: dead.length, imgs,
               cta: document.querySelectorAll('.case-cta .close-actions a').length,
               sheet: [...document.styleSheets].some(s => { try { return s.cssRules.length > 100; } catch(e){ return false; } }),
               title: document.title.slice(0,38) };
    });
    const isCase = /work\//.test(rel);
    const bad = [];
    if (!r.sheet) bad.push('STYLESHEET NOT APPLIED');
    if (r.ov) bad.push('H-OVERFLOW');
    if (r.dead) bad.push(r.dead + ' dead href');
    if (r.imgs) bad.push(r.imgs + ' broken img');
    if (isCase && r.cta !== 2) bad.push('case CTA has ' + r.cta + ' actions, want 2');
    if (/^ar\//.test(rel) && r.dir !== 'rtl') bad.push('not rtl');
    errs.forEach(e => bad.push(e));
    console.log('  ' + rel.padEnd(30) + (bad.length ? 'FAIL  ' + bad.join(' | ') : 'ok'));
    if (bad.length) fail.push(rel);
    await pg.close();
  }
  console.log(fail.length ? '\n' + fail.length + ' page(s) failed' : '\nall ' + ALL.length + ' pages clean');
  await b.close(); srv.close();
  process.exit(fail.length ? 1 : 0);
})();
