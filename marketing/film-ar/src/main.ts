// Arabic launch film, v3: five moments cut to the track's beats.
// 1 Make (the pen draws the app's own dieline, the camera pulls back into the
// real editor) · 2 Upload (the fold on the slider, close-ups, the best angle)
// · 3 Reference + depth · 4 Magnific · 5 The result and the end card.

import gsap from "gsap";
import { generate, DEFAULT_PARAMS } from "../../../dieline/src/lib/dieline";
import { loadCarton, type Carton } from "./nutri";
import { createBox, type Box3D, type Shot } from "./box3d";

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const $$ = (s: string) => Array.from(document.querySelectorAll(s)) as HTMLElement[];
const B = [0.23, 0.81, 1.32, 1.81, 2.28, 2.72, 3.23, 3.74, 4.32, 4.88, 5.36, 5.87, 6.39, 6.92, 7.41, 7.94, 8.43, 8.94, 9.43, 9.96, 10.45, 10.98, 11.47, 11.98, 12.49, 13.0, 13.49, 14.02, 14.51, 15.02, 15.51, 16.02, 16.56, 17.07, 17.58, 18.09, 18.58, 19.09, 19.6, 20.11, 20.62, 21.13, 21.59, 22.13, 22.64, 23.15, 23.64, 24.17, 24.71, 25.19, 25.68, 26.19, 26.68, 27.21, 27.72, 28.24, 28.75, 29.26, 29.74, 30.23, 30.74];
const HIT = 28.0;
const END = 31.11;
export const DURATION = 33.1;
const FPS = 60;
const W = (w: number) => `"wght" ${w}`;
const APP = "assets/app2";

const tl = gsap.timeline({ paused: true });
let now = 0;
let box: Box3D;
let carton: Carton;

type R = { x: number; y: number; w: number; h: number };
let META: { preview: R & { vb: string }; uploadBtn: R; dropZone: R; slider: R; canvas: R; productBtn: R };

// The browser window: the app captured at 1600 x 900, shown at 0.84.
const WS = 0.84;
const BAR = 46;
const WIN = { x: (1920 - 1344) / 2, y: (1080 - 802) / 2, w: 1344, h: 802 };
const app = (x: number, y: number) => ({ x: WIN.x + x * WS, y: WIN.y + BAR + y * WS });
const mid = (r: R) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

const io3 = gsap.parseEase("power3.inOut");
const in3 = gsap.parseEase("power3.in");
const io2 = gsap.parseEase("power2.inOut");
const outX = gsap.parseEase("expo.out");
const out3 = (k: number) => 1 - Math.pow(1 - k, 3);
const lin = (k: number) => k;
const clamp = (k: number) => Math.min(1, Math.max(0, k));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
type P = { x: number; y: number };
const lerpP = (a: P, b: P, k: number) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

/** Word entrance: from thin, large and soft to heavy and sharp. */
function word(el: Element | Element[] | string, at: number, opts: { from?: number; to?: number; scale?: number; dur?: number } = {}) {
  tl.fromTo(el, { opacity: 0, scale: opts.scale ?? 1.45, filter: "blur(14px)", fontVariationSettings: W(opts.from ?? 100) }, { opacity: 1, scale: 1, filter: "blur(0px)", fontVariationSettings: W(opts.to ?? 800), duration: opts.dur ?? 0.42, ease: "expo.out", immediateRender: false }, at);
}
function show(sel: string, from: number, to: number) {
  tl.set(sel, { autoAlpha: 1 }, from).set(sel, { autoAlpha: 0 }, to);
}

// ---------- Moment 1 + 2: the world (window, drawn line, cursor) ----------
const m1 = { p: 0, k: 0 };
let pen: (p: number) => P;
let cutPath: SVGPathElement;
let cutLen = 0;

function sceneM1() {
  // The app's own dieline for this carton, placed exactly where its preview draws it.
  const d = generate({ ...DEFAULT_PARAMS, style: "rte", L: 60, W: 59.5, H: 139.5, dimMode: "inside", showDimensions: false });
  const [vx, vy, vw, vh] = META.preview.vb.split(/\s+/).map(Number);
  const pv = META.preview;
  const s = Math.min(pv.w / vw, pv.h / vh);
  const ox = pv.x + (pv.w - vw * s) / 2, oy = pv.y + (pv.h - vh * s) / 2;
  const toW = (q: P) => app(ox + (q.x - vx) * s, oy + (q.y - vy) * s);
  const cuts = d.outline.map((g) => ({ a: toW(g.a), b: toW(g.b) }));
  const order: { a: P; b: P }[] = [];
  let cur = cuts.reduce((m, l) => (l.a.x + l.a.y < m.x + m.y ? l.a : m), cuts[0].a);
  while (cuts.length) {
    let best = 0, flip = false, dist = Infinity;
    cuts.forEach((l, i) => {
      const da = Math.hypot(l.a.x - cur.x, l.a.y - cur.y), db = Math.hypot(l.b.x - cur.x, l.b.y - cur.y);
      if (da < dist) (dist = da), (best = i), (flip = false);
      if (db < dist) (dist = db), (best = i), (flip = true);
    });
    const l = cuts.splice(best, 1)[0];
    const sg = flip ? { a: l.b, b: l.a } : l;
    order.push(sg);
    cur = sg.b;
  }
  let path = "";
  let last: P | null = null;
  for (const sg of order) {
    if (!last || Math.hypot(last.x - sg.a.x, last.y - sg.a.y) > 0.5) path += `M${sg.a.x.toFixed(2)} ${sg.a.y.toFixed(2)}`;
    path += `L${sg.b.x.toFixed(2)} ${sg.b.y.toFixed(2)}`;
    last = sg.b;
  }
  const creases = d.strokes
    .filter((k) => k.layer === "crease")
    .map((k) => {
      const a = toW(k.seg.a), b = toW(k.seg.b);
      return `<path class="crz" d="M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${b.x.toFixed(2)} ${b.y.toFixed(2)}"/>`;
    })
    .join("");
  $("#draw").innerHTML = `<g id="crzG" fill="none" stroke="#00a651" stroke-dasharray="6 4">${creases}</g><path id="cutP" d="${path}" fill="none" stroke="#ffce00" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 0.6px rgba(110,84,0,0.9))"/>`;
  cutPath = $("#cutP") as unknown as SVGPathElement;
  cutLen = cutPath.getTotalLength();
  cutPath.style.strokeDasharray = `${cutLen}`;
  pen = (p: number) => {
    const q = cutPath.getPointAtLength(clamp(p) * cutLen);
    return { x: q.x, y: q.y };
  };
  const crz = $$(".crz");
  gsap.set(crz, { opacity: 0 });
  gsap.set("#win", { opacity: 0 });
  gsap.set(["#mcur", "#fileIcon", "#ripple"], { opacity: 0 });

  show("#m1", 0, B[23] - 0.01);
  show("#m1", B[27] - 0.01, B[36] - 0.01);
  tl.fromTo(m1, { p: 0 }, { p: 1, duration: B[7] - 0.05, ease: "power1.inOut", immediateRender: false }, 0.05)
    .fromTo(m1, { k: 0 }, { k: 1, duration: B[9] - B[6], ease: "power3.inOut", immediateRender: false }, B[6])
    .to(crz, { opacity: 1, duration: 0.2, stagger: (B[6] - B[1]) / crz.length }, B[1])
    .fromTo("#win", { opacity: 0 }, { opacity: 1, duration: B[8] - B[6], ease: "power2.inOut", immediateRender: false }, B[6])
    .to("#draw", { opacity: 0, duration: 0.35, ease: "power2.in" }, B[8]);

  // «كلّ علبة تبدأ مسطّحة.»
  const w1 = $$("#cap1 .w");
  gsap.set(w1, { opacity: 0 });
  word(w1[0], B[2], { to: 600 });
  word(w1[1], B[3], { to: 900, scale: 1.7 });
  tl.to("#cap1", { opacity: 0, filter: "blur(10px)", duration: 0.3, ease: "power2.in" }, B[7] - 0.3).set("#cap1", { autoAlpha: 0 }, B[7]);

  // «أظهِر أفضل زاوية.» over the app, on the turn to the best angle.
  const w2 = $$("#cap2 .w");
  gsap.set(w2, { opacity: 0 });
  gsap.set("#cap2", { autoAlpha: 0 });
  tl.set("#cap2", { autoAlpha: 1 }, B[28] - 0.02);
  tl.fromTo("#cap2", { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "expo.out", immediateRender: false }, B[28] - 0.02);
  word(w2[0], B[28], { to: 600 });
  word(w2[1], B[28] + 0.25, { to: 900, scale: 1.8 });
  word(w2[2], B[29], { to: 600 });
  tl.fromTo("#cap2 .u", { "--k": 0 }, { "--k": 1, duration: 0.35, ease: "expo.out", immediateRender: false }, B[29] + 0.1)
    .to("#cap2", { opacity: 0, y: 20, duration: 0.25, ease: "power2.in" }, B[32] - 0.25)
    .set("#cap2", { autoAlpha: 0 }, B[32]);
  tl.fromTo("#flash", { opacity: 0.85 }, { opacity: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, B[34]);
}

/** The camera on the world: centre C, zoom Z, roll. */
type Cam = { x: number; y: number; z: number; r: number };
let camKeys: [number, number, Cam, Cam, (k: number) => number][] = [];
function worldKeys() {
  const C = mid({ x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h });
  const full = { x: C.x, y: C.y, z: 1, r: 0 };
  const cv = mid(META.canvas);
  const cw = app(cv.x, cv.y);
  const canvasAt = (z: number) => ({ x: cw.x, y: cw.y, z, r: 0 });
  // The best angle sits between the canvas and the product button.
  const best = { x: lerp(cw.x, C.x, 0.45), y: lerp(cw.y, C.y, 0.6), z: 1.12, r: 0 };
  camKeys = [
    [B[9], B[16], full, { ...full, z: 1.04 }, lin],
    [B[16], B[22], { ...full, z: 1.04 }, canvasAt(1.22), io2],
    [B[22], B[23], canvasAt(1.22), canvasAt(2.6), in3],
    [B[27], B[30], { ...best, z: 1.6, r: -2 }, best, outX],
    [B[30], B[36], best, { ...best, z: 1.07 }, lin],
  ];
}
function worldCam(t: number): Cam {
  if (t < B[9]) {
    // Behind the pen: a short trailing average, so jumps between cuts read as a glide.
    let ax = 0, ay = 0, n = 0;
    for (let j = 0; j <= 10; j++) {
      const q = pen(m1.p - j * 0.0012);
      const w = 1 - j / 11;
      ax += q.x * w;
      ay += q.y * w;
      n += w;
    }
    const Zc = 5.2;
    const k = m1.k;
    const C = mid({ x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h });
    return { x: lerp(ax / n, C.x, k), y: lerp(ay / n, C.y, k), z: Zc + (1 - Zc) * k, r: -8 * (1 - k) };
  }
  const seg = camKeys.find(([t0, t1]) => t >= t0 && t < t1) ?? camKeys[camKeys.length - 1];
  const [t0, t1, a, b, e] = seg;
  const k = e(clamp((t - t0) / (t1 - t0)));
  // Zoom moves in log space so a push reads at an even speed.
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)), r: lerp(a.r, b.r, k) };
}

/** The fold as the capture drove the slider (flat -> closed, open a little, closed). */
function foldAt(t: number) {
  if (t < B[17]) return 0;
  if (t < B[19]) return out3((t - B[17]) / (B[19] - B[17]));
  if (t < B[20]) return 1 - 0.45 * out3((t - B[19]) / (B[20] - B[19]));
  if (t < B[21]) return 0.55 + 0.45 * out3((t - B[20]) / (B[21] - B[20]));
  return 1;
}

/** The cursor, in app pixels: [x, y, opacity, press]. */
function cursorAt(t: number): [number, number, number, number] {
  const up = mid(META.uploadBtn);
  const dz = mid(META.dropZone);
  const sl = META.slider;
  const thumb = (f: number) => ({ x: sl.x + sl.w / 2, y: sl.y + 7 + (sl.h - 14) * (1 - f) });
  const cv = mid(META.canvas);
  const pb = mid(META.productBtn);
  const press = (tc: number) => (t >= tc && t < tc + 0.16 ? 1 - Math.abs((t - tc) / 0.08 - 1) : 0);
  const start = { x: 1180, y: 640 };
  if (t < B[12]) return [start.x, start.y, 0, 0];
  if (t < B[13]) return [start.x, start.y, clamp((t - B[12]) / 0.25), 0];
  if (t < B[15]) {
    const p = lerpP(start, up, io3(clamp((t - B[13]) / (B[15] - 0.06 - B[13]))));
    return [p.x, p.y, 1, press(B[15] - 0.04)];
  }
  if (t < B[16]) {
    const p = lerpP(up, dz, io3(clamp((t - B[15] - 0.1) / (B[16] - 0.06 - B[15] - 0.1))));
    return [p.x, p.y, 1, press(B[16] - 0.04)];
  }
  if (t < B[17]) {
    const p = lerpP(dz, thumb(0), io3(clamp((t - B[16] - 0.05) / (B[17] - 0.05 - B[16] - 0.05))));
    return [p.x, p.y, 1, t > B[17] - 0.12 ? 0.6 : 0];
  }
  if (t < B[21] + 0.3) {
    const p = thumb(foldAt(t));
    return [p.x, p.y, clamp((B[21] + 0.3 - t) / 0.2), 0.6];
  }
  if (t < B[27]) return [0, 0, 0, 0];
  if (t < B[30] + 0.1) {
    // Dragging the carton round to the best angle (the capture's own orbit).
    const k = out3(clamp((t - B[27]) / (B[30] - B[27])));
    return [cv.x - 430 * k, cv.y - 40 * k, 1, 0.6];
  }
  const from = { x: cv.x - 430, y: cv.y - 40 };
  if (t < B[34] + 0.4) {
    const p = lerpP(from, pb, io3(clamp((t - B[32]) / (B[34] - 0.06 - B[32]))));
    return [p.x, p.y, 1, press(B[34] - 0.04)];
  }
  return [pb.x, pb.y, clamp((B[34] + 0.6 - t) / 0.2), 0];
}

function updateWorld() {
  if (!pen || now > B[36]) return;
  const c = worldCam(now);
  const world = $("#world");
  world.style.transform = `translate(960px, 540px) rotate(${c.r}deg) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;
  // Constant on-screen weights at any zoom.
  if (now < B[9] + 0.5) {
    cutPath.style.strokeWidth = `${3.4 / c.z}`;
    cutPath.style.strokeDashoffset = `${cutLen * (1 - m1.p)}`;
    ($("#crzG") as unknown as SVGGElement).style.strokeWidth = `${2.2 / c.z}`;
    ($("#crzG") as unknown as SVGGElement).style.strokeDasharray = `${7 / c.z} ${5 / c.z}`;
  }
  const P0 = pen(m1.p);
  const penEl = $("#pen");
  penEl.style.left = `${P0.x}px`;
  penEl.style.top = `${P0.y}px`;
  penEl.style.transform = `scale(${1 / c.z})`;
  penEl.style.opacity = m1.p < 0.998 ? "1" : `${clamp(1 - (now - B[7]) / 0.2)}`;

  const [ax, ay, op, pr] = cursorAt(now);
  const cp = app(ax, ay);
  const cur = $("#mcur");
  cur.style.left = `${cp.x - 2}px`;
  cur.style.top = `${cp.y - 2}px`;
  cur.style.opacity = `${op}`;
  cur.style.transform = `scale(${(1 - 0.15 * pr) / c.z})`;

  // The PDF arrives from the right edge and lands in the drop zone with the cursor.
  const icon = $("#fileIcon");
  if (now >= B[15] && now < B[16] + 0.3) {
    const k = io3(clamp((now - B[15] - 0.1) / (B[16] - 0.06 - B[15] - 0.1)));
    const dz = app(mid(META.dropZone).x, mid(META.dropZone).y);
    const from = { x: c.x + 1100 / c.z, y: c.y + 120 / c.z };
    const p = lerpP(from, dz, k);
    const land = clamp((now - B[16]) / 0.2);
    icon.style.left = `${p.x - 75}px`;
    icon.style.top = `${p.y - 95}px`;
    icon.style.opacity = `${1 - land}`;
    icon.style.transform = `scale(${(0.72 - 0.3 * land) / c.z}) rotate(${-8 * (1 - k)}deg)`;
  } else icon.style.opacity = "0";

  // Click ripples.
  const clicks: [number, R][] = [[B[15], META.uploadBtn], [B[16], META.dropZone], [B[34], META.productBtn]];
  const rp = $("#ripple");
  rp.style.opacity = "0";
  for (const [tc, r] of clicks) {
    const e = (now - tc) / 0.5;
    if (e >= 0 && e < 1) {
      const p = app(mid(r).x, mid(r).y);
      rp.style.left = `${p.x}px`;
      rp.style.top = `${p.y}px`;
      rp.style.opacity = `${1 - e}`;
      rp.style.transform = `scale(${(1 + 2.4 * out3(e)) / c.z})`;
    }
  }
}

// The real app, frame by frame.
const SEQ: [string, number, number][] = [
  ["make", B[7], B[15]],
  ["drop", B[15], B[17]],
  ["fold", B[17], B[23]],
  ["angle", B[27], B[36]],
];
let appShown = "";
async function renderApp() {
  if (now > B[36]) return;
  let src = `${APP}/make/0000.png`;
  for (const [d, t0, t1] of SEQ) {
    if (now >= t0 && now < t1) {
      const n = Math.round((t1 - t0) * FPS);
      const i = Math.min(n - 1, Math.max(0, Math.floor((now - t0) * FPS + 1e-6)));
      src = `${APP}/${d}/${String(i).padStart(4, "0")}.png`;
      // Once the file lands, the blank shows flat (the app's brief "reading" state would flash).
      if (d === "drop" && i >= Math.round((B[16] - B[15]) * FPS)) src = `${APP}/fold/0000.png`;
    }
  }
  if (src === appShown) return;
  appShown = src;
  const img = $("#appImg") as HTMLImageElement;
  img.src = src;
  await img.decode();
}

// ---------- Close-ups: the 3D render, shallow focus ----------
type Seg = [number, number, Shot, Shot, (k: number) => number];
const cam: Seg[] = [];
const at = (x: number, y: number) => ({ x, y });
const DOF = { aperture: 0.0011, maxblur: 0.007, background: "#e6e5e2" };

function sceneCloseups() {
  show("#c3d", B[23] - 0.01, B[27] - 0.01);
  cam.push([B[23] - 0.01, B[25], { at: at(60, 106), az: -46, el: 12, dist: 135, fov: 30, roll: -4 }, { at: at(64, 108), az: -30, el: 8, dist: 112, fov: 30, roll: -1 }, lin]);
  cam.push([B[25], B[27], { at: at(72, 158), az: 34, el: 20, dist: 140, fov: 30, roll: 4 }, { at: at(72, 154), az: 20, el: 10, dist: 118, fov: 30, roll: 1 }, lin]);
}
function render3D() {
  if (now < B[23] - 0.02 || now >= B[27]) return;
  box.setGround(false);
  box.setDof(DOF);
  box.setFold(1);
  const seg = cam.find(([t0, t1]) => now >= t0 && now < t1) ?? cam[cam.length - 1];
  const [t0, t1, a, b, ease] = seg;
  box.setBlend(a, b, ease(clamp((now - t0) / (t1 - t0))));
  box.render();
}

// ---------- Moment 3: the reference image and its depth map ----------
function sceneM3() {
  show("#s3", B[36] - 0.01, B[44] - 0.01);
  gsap.set("#scan", { opacity: 0 });
  gsap.set(".cardLbl", { opacity: 0 });
  const w = $$("#s3Cap .w");
  gsap.set(w, { opacity: 0 });
  tl.fromTo("#card", { scale: 1.18, y: 30 }, { scale: 1, y: 0, duration: 0.6, ease: "expo.out", immediateRender: false }, B[36])
    .to("#lblImg", { opacity: 1, duration: 0.3 }, B[36] + 0.4)
    .set("#scan", { opacity: 1 }, B[38] - 0.01)
    .fromTo("#cardDepth", { clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 50%)", duration: 0.8, ease: "power2.inOut", immediateRender: false }, B[38])
    .fromTo("#scan", { left: "100%" }, { left: "50%", duration: 0.8, ease: "power2.inOut", immediateRender: false }, B[38])
    .to("#lblDep", { opacity: 1, duration: 0.3 }, B[38] + 0.4)
    .to("#scan", { opacity: 0.35, duration: 0.3 }, B[39] + 0.4)
    .fromTo("#card", { scale: 1 }, { scale: 1.04, duration: B[44] - B[39], ease: "none", immediateRender: false }, B[39] + 0.01)
    .to(".cardLbl", { opacity: 0, duration: 0.15 }, B[44] - 0.15);
  word(w[0], B[40], { to: 600, scale: 1.25 });
  word(w[1], B[40] + 0.3, { to: 900, scale: 1.6 });
}

// ---------- Moment 4: Magnific ----------
function sceneM4() {
  show("#mag", B[44] - 0.01, HIT - 0.01);
  show("#fly", B[44] - 0.01, B[45] + 0.02);
  tl.set("#dark", { opacity: 1 }, B[44] - 0.01).set("#dark", { opacity: 0 }, HIT - 0.01);
  const mag = $("#mag");
  mag.style.transform = "none";
  const sr = $("#refSlot").getBoundingClientRect();
  const pr = $("#prompt").getBoundingClientRect();
  const gr = $("#gen").getBoundingClientRect();
  const zoomOn = (cx: number, cy: number, Z: number) => ({ x: 960 - cx * Z, y: 540 - cy * Z, scale: Z });
  const Z1 = 2.1;
  const v1 = zoomOn(sr.left + sr.width / 2, sr.top + sr.height / 2 + 60, Z1);
  const v2 = zoomOn(pr.left + pr.width / 2, pr.top + pr.height / 2, 1.85);
  gsap.set(mag, { x: v1.x, y: v1.y, scale: Z1, transformOrigin: "0 0" });
  const target = { x: v1.x + sr.left * Z1, y: v1.y + sr.top * Z1, w: sr.width * Z1, h: sr.height * Z1 };
  gsap.set("#flyCard", { x: 0, y: 0, scale: 1 });
  tl.fromTo("#mag", { opacity: 0, scale: Z1 * 1.12 }, { opacity: 1, scale: Z1, duration: 0.4, ease: "expo.out", immediateRender: false }, B[44])
    .fromTo("#flyCard", { x: 0, y: 0, width: 1100, height: 619, borderRadius: 18 }, { x: target.x - (960 - 550), y: target.y - (540 - 309), width: target.w, height: target.h, borderRadius: 10 * Z1, duration: 0.5, ease: "expo.inOut", immediateRender: false }, B[44] + 0.02)
    .set("#refImg", { opacity: 1 }, B[45])
    .set("#refPlus", { opacity: 0 }, B[45])
    .fromTo("#refSlot", { scale: 1.25 }, { scale: 1, duration: 0.3, ease: "back.out(3)", immediateRender: false }, B[45])
    .to(mag, { x: v2.x, y: v2.y, scale: 1.85, duration: 0.5, ease: "power3.inOut" }, B[46] - 0.25)
    .to(mag, { x: 0, y: 0, scale: 1, duration: 0.5, ease: "power3.inOut" }, B[52] - 0.1);
  gsap.set(["#refImg", "#refTag"], { opacity: 0 });
  tl.set("#refTag", { opacity: 1 }, B[45] + 0.1);
  const prompt =
    "A sudden burst of iridescent liposomal bubbles explodes outward from directly behind the white NutriBoost box, spraying toward the camera in all directions. Large glossy golden-green oil spheres with colorful inner droplets shoot past the lens, smaller soap-like bubbles scatter and spin with rainbow reflections. At the moment of the burst, the camera makes a quick, punchy pull-back with a subtle shake, then settles smoothly. Soft white studio background, photorealistic, premium pharmaceutical commercial.";
  const marks = ["NutriBoost box", "burst", "photorealistic"];
  const typed = { n: 0 };
  const draw = () => {
    let s = prompt.slice(0, Math.round(typed.n));
    for (const m of marks) s = s.replace(m, `<mark>${m}</mark>`);
    $("#prompt").innerHTML = `<span style="color:#9aa0ff">@img1</span> ${s}<span class="caret"></span>`;
  };
  tl.fromTo(typed, { n: 0 }, { n: prompt.length, duration: B[51] - B[46], ease: "none", onUpdate: draw, immediateRender: false }, B[46]);
  tl.call(draw, [], B[44]);
  gsap.set("#cursor", { x: 1500, y: 760, opacity: 0 });
  tl.to("#cursor", { opacity: 1, duration: 0.1 }, B[52] + 0.3)
    .to("#cursor", { x: gr.left + gr.width * 0.42, y: gr.top + gr.height * 0.45, duration: 0.6, ease: "power3.inOut" }, B[52] + 0.35)
    .to("#gen", { scale: 0.95, backgroundColor: "#6d7bff", duration: 0.06 }, B[54])
    .to("#gen", { scale: 1, duration: 0.15 }, B[54] + 0.06)
    .to("#cursor", { scale: 0.85, duration: 0.06 }, B[54])
    .to("#cursor", { scale: 1, duration: 0.12 }, B[54] + 0.06);
  gsap.set("#genRow", { opacity: 0, y: 30 });
  const pct = { v: 0 };
  tl.to("#genRow", { opacity: 1, y: 0, duration: 0.18, ease: "expo.out" }, B[54] + 0.04)
    .fromTo(pct, { v: 0 }, { v: 100, duration: HIT - B[54] - 0.04, ease: "power1.in", onUpdate: () => ($("#pct").textContent = `Generating · ${Math.round(pct.v)}%`), immediateRender: false }, B[54] + 0.04)
    .fromTo("#shim", { backgroundPosition: "200% 0" }, { backgroundPosition: "-100% 0", duration: 0.3, ease: "none", immediateRender: false }, B[54] + 0.04);
}

// ---------- Moment 5: the result, then the end card ----------
function sceneM5() {
  show("#s12", HIT - 0.01, DURATION + 1);
  gsap.set("#g1", { opacity: 0, y: 30 });
  gsap.set("#s12 .w", { opacity: 0 });
  tl.to("#g1", { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, B[57]);
  $$("#g1 .w").forEach((e, i) => word(e, B[57] + i * 0.3, { to: i ? 900 : 600, scale: 1.25 }));
  tl.to("#g1", { opacity: 0, duration: 0.25 }, END - 0.25)
    .fromTo("#burst", { filter: "blur(0px)" }, { filter: "blur(14px)", duration: 0.5, ease: "power2.out", immediateRender: false }, END - 0.1)
    .fromTo("#endBg", { backgroundColor: "rgba(230,229,226,0)" }, { backgroundColor: "rgba(230,229,226,0.8)", duration: 0.5, ease: "power2.out", immediateRender: false }, END - 0.1);
  show("#end", END - 0.02, DURATION + 1);
  const we = $$("#end .w");
  gsap.set(we, { opacity: 0 });
  gsap.set(["#end .url", "#end .studio"], { opacity: 0, y: 20 });
  word(we[0], END, { from: 100, to: 900, scale: 2, dur: 0.5 });
  word(we[1], END + 0.4, { to: 700, scale: 1.3 });
  word(we[2], END + 0.75, { to: 500, scale: 1.15 });
  tl.to("#end .url", { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, END + 0.95)
    .to("#end .studio", { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, END + 1.15)
    .fromTo("#end", { scale: 1.06 }, { scale: 1, duration: DURATION - END, ease: "power2.out", immediateRender: false }, END)
    .to("#fade", { opacity: 1, duration: 0.6, ease: "power1.in" }, DURATION - 0.6);
}

function grain() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let seed = 11;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = 96 + (seed % 160);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  $("#grain").style.backgroundImage = `url(${c.toDataURL()})`;
}

const BURST_FRAMES = 238;
let burstShown = -1;
async function renderBurst() {
  if (now < HIT - 0.05) return;
  const clip = BURST_FRAMES / 60;
  const t = now < END ? now - HIT : END - HIT + (now - END) * ((clip - (END - HIT)) / (DURATION - END));
  const i = Math.min(BURST_FRAMES, Math.max(1, Math.floor(t * 60) + 1));
  if (i === burstShown) return;
  burstShown = i;
  const img = $("#burst") as HTMLImageElement;
  img.src = `assets/burst/${String(i).padStart(4, "0")}.jpg`;
  await img.decode();
}

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
/** The object's bounds in an exported image (alpha, or anything brighter than black for depth). */
function bboxOf(img: HTMLImageElement, depth: boolean) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y += 2)
    for (let x = 0; x < c.width; x += 2) {
      const i = (y * c.width + x) * 4;
      const on = depth ? d[i] + d[i + 1] + d[i + 2] > 24 && d[i + 3] > 20 : d[i + 3] > 20;
      if (on) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** Centre an export on a 16:9 card, the object's height at 76% of the frame. */
function framed(img: HTMLImageElement, depth: boolean) {
  const bb = bboxOf(img, depth);
  const c = document.createElement("canvas");
  c.width = 1920;
  c.height = 1080;
  const g = c.getContext("2d")!;
  if (depth) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 1920, 1080);
  } else {
    const gr = g.createRadialGradient(700, 300, 50, 960, 540, 1300);
    gr.addColorStop(0, "#fbfaf7");
    gr.addColorStop(1, "#dcdad4");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1920, 1080);
  }
  const s = (1080 * 0.76) / bb.h;
  g.drawImage(img, 960 - (bb.x + bb.w / 2) * s, 540 - (bb.y + bb.h / 2) * s, img.naturalWidth * s, img.naturalHeight * s);
  return c.toDataURL(depth ? "image/png" : "image/jpeg", 0.95);
}

async function init() {
  await document.fonts.load('400 40px "Alexandria Variable"');
  await document.fonts.ready;
  grain();
  META = await (await fetch(`${APP}/meta.json`)).json();
  Object.assign($("#win").style, { left: `${WIN.x}px`, top: `${WIN.y}px`, width: `${WIN.w}px`, height: `${WIN.h}px` });
  carton = await loadCarton("assets/nutriboost.pdf", 8192);
  box = createBox($("#c3d"), carton, { w: 1920, h: 1080 });
  const [prod, dep] = await Promise.all([loadImg(`${APP}/product.png`), loadImg(`${APP}/depth.png`)]);
  const ref = framed(prod, false);
  const depth = framed(dep, true);
  for (const id of ["#cardImg", "#flyImg", "#refImg"]) ($(id) as HTMLImageElement).src = ref;
  ($("#cardDepth") as HTMLImageElement).src = depth;
  ($("#appImg") as HTMLImageElement).src = `${APP}/make/0000.png`;
  await Promise.all($$("img").map((i) => ((i as HTMLImageElement).complete ? null : new Promise((r) => (i.onload = r)))));

  gsap.set(".layer:not(#light):not(#grain)", { autoAlpha: 0 });
  gsap.set(["#dark", "#fade", "#flash"], { visibility: "visible", opacity: 0 });
  gsap.set("#endBg", { visibility: "visible", opacity: 1 });
  worldKeys();
  sceneM1();
  sceneCloseups();
  sceneM3();
  sceneM4();
  sceneM5();
  await seek(0);
  (window as unknown as { ready: boolean }).ready = true;
}

async function seek(t: number) {
  now = t;
  tl.seek(t, false);
  updateWorld();
  const f = Math.floor(t * 24);
  $("#grain").style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  render3D();
  await renderApp();
  await renderBurst();
}
(window as unknown as { seek: (t: number) => Promise<void> }).seek = seek;
(window as unknown as { duration: number }).duration = DURATION;
init().catch((e) => ((window as unknown as { err: string }).err = String(e?.stack ?? e)));
