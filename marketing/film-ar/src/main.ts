// Arabic launch film: one paused GSAP timeline seeked frame by frame, cut to
// the track's beats. The carton is the Nutriboost upload, read and folded by
// the app's own code. Close on the action first, then the whole.

import gsap from "gsap";
import { generate, DEFAULT_PARAMS } from "../../../dieline/src/lib/dieline";
import { loadCarton, type Carton } from "./nutri";
import { createBox, type Box3D, type Shot } from "./box3d";

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const $$ = (s: string) => Array.from(document.querySelectorAll(s)) as HTMLElement[];
const B = [0.23, 0.81, 1.32, 1.81, 2.28, 2.72, 3.23, 3.74, 4.32, 4.88, 5.36, 5.87, 6.39, 6.92, 7.41, 7.94, 8.43, 8.94, 9.43, 9.96, 10.45, 10.98, 11.47, 11.98, 12.49, 13.0, 13.49, 14.02, 14.51, 15.02, 15.51, 16.02, 16.56, 17.07, 17.58, 18.09, 18.58, 19.09, 19.6, 20.11, 20.62, 21.13, 21.59, 22.13, 22.64, 23.15, 23.64, 24.17, 24.71, 25.19, 25.68, 26.19, 26.68, 27.21, 27.72, 28.24, 28.75, 29.26, 29.74, 30.23, 30.74];
const HIT = 28.0;
export const DURATION = 33.1;
const W = (w: number) => `"wght" ${w}`;

const tl = gsap.timeline({ paused: true });
let now = 0;
let box: Box3D;
let carton: Carton;

/** Word entrance: from thin, large and soft to heavy and sharp. */
function word(el: Element | Element[] | string, at: number, opts: { from?: number; to?: number; scale?: number; dur?: number } = {}) {
  tl.fromTo(el, { opacity: 0, scale: opts.scale ?? 1.45, filter: "blur(14px)", fontVariationSettings: W(opts.from ?? 100) }, { opacity: 1, scale: 1, filter: "blur(0px)", fontVariationSettings: W(opts.to ?? 800), duration: opts.dur ?? 0.42, ease: "expo.out", immediateRender: false }, at);
}
function show(sel: string, from: number, to: number) {
  tl.set(sel, { autoAlpha: 1 }, from).set(sel, { autoAlpha: 0 }, to);
}

// ---------- S1: the dieline drawn, the camera on the pen ----------
const s1 = { p: 0, k: 0 };
let pen: (p: number) => { x: number; y: number };
let s1Scale = 1;
let s1Off = { x: 0, y: 0 };
let cutPath: SVGPathElement;
function sceneS1() {
  const { box: bb, lines } = carton;
  s1Scale = 900 / bb.h;
  s1Off = { x: 960 - (bb.w * s1Scale) / 2 - bb.x0 * s1Scale, y: 540 - (bb.h * s1Scale) / 2 - bb.y0 * s1Scale };
  // Chain the cuts into one pen path, nearest end first.
  const cuts = lines.filter((l) => l.kind === "cut").map((l) => ({ ...l }));
  const order: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  let cur = cuts.reduce((m, l) => (l.a.x + l.a.y < m.x + m.y ? l.a : m), cuts[0].a);
  while (cuts.length) {
    let best = 0, flip = false, dist = Infinity;
    cuts.forEach((l, i) => {
      const da = Math.hypot(l.a.x - cur.x, l.a.y - cur.y), db = Math.hypot(l.b.x - cur.x, l.b.y - cur.y);
      if (da < dist) (dist = da), (best = i), (flip = false);
      if (db < dist) (dist = db), (best = i), (flip = true);
    });
    const l = cuts.splice(best, 1)[0];
    const s = flip ? { a: l.b, b: l.a } : { a: l.a, b: l.b };
    order.push(s);
    cur = s.b;
  }
  let d = "";
  let last: { x: number; y: number } | null = null;
  for (const s of order) {
    if (!last || Math.hypot(last.x - s.a.x, last.y - s.a.y) > 0.3) d += `M${s.a.x} ${s.a.y}`;
    d += `L${s.b.x} ${s.b.y}`;
    last = s.b;
  }
  const creases = lines.filter((l) => l.kind === "crease").map((l) => `<path d="M${l.a.x} ${l.a.y}L${l.b.x} ${l.b.y}" class="crz"/>`).join("");
  $("#dieCam").innerHTML = `<svg width="1920" height="1080" viewBox="0 0 1920 1080"><g transform="translate(${s1Off.x} ${s1Off.y}) scale(${s1Scale})"><g id="crz" fill="none" stroke="#00a651" stroke-dasharray="2.2 1.4">${creases}</g><path id="cutP" d="${d}" fill="none" stroke="#e30613" stroke-linecap="round" stroke-linejoin="round"/></g></svg><div id="pen"></div><div id="penRead" class="mono"></div>`;
  cutPath = $("#cutP") as unknown as SVGPathElement;
  const L = cutPath.getTotalLength();
  cutPath.style.strokeDasharray = `${L}`;
  pen = (p: number) => {
    const q = cutPath.getPointAtLength(p * L);
    return { x: q.x, y: q.y };
  };
  const crz = $$(".crz");
  gsap.set(crz, { opacity: 0 });
  gsap.set(".tag", { opacity: 0, x: 30 });
  tl.set("#s1", { autoAlpha: 1 }, 0)
    .fromTo(s1, { p: 0 }, { p: 0.94, duration: B[6] - 0.05, ease: "power1.inOut", immediateRender: false }, 0.05)
    .fromTo(s1, { k: 0 }, { k: 1, duration: B[7] - B[3], ease: "power3.inOut", immediateRender: false }, B[3])
    .to(crz, { opacity: 1, duration: 0.18, stagger: (B[7] - B[4]) / crz.length }, B[4])
    .to("#tag1", { opacity: 1, x: 0, duration: 0.4, ease: "expo.out" }, B[1])
    .to("#tag2", { opacity: 1, x: 0, duration: 0.4, ease: "expo.out" }, B[4])
    .to("#s1", { opacity: 0.12, filter: "blur(6px)", duration: 0.35, ease: "power2.out" }, B[7] - 0.05)
    .set("#s1", { autoAlpha: 0 }, B[11] - 0.02);
}
function updateS1() {
  if (!pen || now > B[11]) return;
  const p = pen(s1.p);
  const P = { x: s1Off.x + p.x * s1Scale, y: s1Off.y + p.y * s1Scale };
  // The camera trails the pen smoothly (an average of where it has just been), so jumps between cuts read as a glide.
  let ax = 0, ay = 0, n = 0;
  for (let j = 0; j <= 24; j++) {
    const q = pen(Math.max(0, s1.p - j * 0.004));
    const w = 1 - j / 25;
    ax += (s1Off.x + q.x * s1Scale) * w;
    ay += (s1Off.y + q.y * s1Scale) * w;
    n += w;
  }
  const C = { x: ax / n, y: ay / n };
  const Zc = 5.5;
  const k = s1.k;
  const Z = Zc + (1 - Zc) * k;
  const A = { x: C.x + (960 - C.x) * k, y: C.y + (540 - C.y) * k };
  const rot = -10 * (1 - k);
  const cam = $("#dieCam");
  cam.style.transform = `translate(${960 - Z * A.x}px, ${540 - Z * A.y}px) scale(${Z})`;
  cam.style.transformOrigin = "0 0";
  $("#s1").style.transform = `rotate(${rot}deg)`;
  // Constant on-screen line weights at any zoom.
  cutPath.style.strokeWidth = `${3.6 / (s1Scale * Z)}`;
  cutPath.style.strokeDashoffset = `${cutPath.getTotalLength() * (1 - s1.p)}`;
  ($("#crz") as unknown as SVGGElement).style.strokeWidth = `${2.6 / (s1Scale * Z)}`;
  const penEl = $("#pen");
  penEl.style.left = `${P.x}px`;
  penEl.style.top = `${P.y}px`;
  penEl.style.transform = `scale(${1 / Z})`;
  penEl.style.opacity = s1.p < 0.935 ? "1" : "0";
  const rd = $("#penRead");
  rd.style.left = `${P.x + 26 / Z}px`;
  rd.style.top = `${P.y + 16 / Z}px`;
  rd.style.transform = `scale(${1 / Z})`;
  rd.style.transformOrigin = "0 0";
  rd.textContent = `X ${p.x.toFixed(1)}  Y ${p.y.toFixed(1)} mm`;
  rd.style.opacity = `${1 - k}`;
}

// ---------- S2 ----------
function sceneS2() {
  const w = $$("#s2 .w");
  gsap.set(w, { opacity: 0 });
  show("#s2", B[7] - 0.05, B[11] - 0.01);
  w.forEach((e, i) => word(e, B[7 + i] - 0.03, { to: i === 3 ? 900 : 700 }));
  tl.to("#s2", { scale: 1.08, duration: B[11] - B[7], ease: "none" }, B[7]);
}

// ---------- S3: dark, the size ----------
function odometer(host: HTMLElement, from: string, to: string, at: number) {
  host.innerHTML = to
    .split("")
    .map((c) => (c === "." ? `<span class="fixed">.</span>` : `<div class="col">${Array.from({ length: 20 }, (_, k) => `<span>${k % 10}</span>`).join("")}</div>`))
    .join("");
  const cols = Array.from(host.querySelectorAll(".col")) as HTMLElement[];
  const digits = to.replace(".", "").split("").map(Number);
  const start = from.replace(".", "").split("").map(Number);
  cols.forEach((c, i) => {
    gsap.set(c, { yPercent: 0, y: 0 });
    const target = digits[i] + 10;
    tl.fromTo(c, { y: () => `-${(start[i] ?? 0) * 1.15}em` }, { y: `-${target * 1.15}em`, duration: 0.6, ease: "expo.out", immediateRender: false }, at + i * 0.05);
  });
}
function sceneS3() {
  const d = generate({ ...DEFAULT_PARAMS, style: "rte", L: 60, W: 59.5, H: 139.5, dimMode: "inside", showDimensions: false });
  const segs = d.outline.map((s) => `M${s.a.x} ${s.a.y}L${s.b.x} ${s.b.y}`).join("");
  const crz = d.strokes.filter((s) => s.layer === "crease").map((s) => `M${s.seg.a.x} ${s.seg.a.y}L${s.seg.b.x} ${s.seg.b.y}`).join("");
  const bb = d.bbox;
  $("#s3Die").innerHTML = `<svg viewBox="${bb.minX - 5} ${bb.minY - 5} ${bb.maxX - bb.minX + 10} ${bb.maxY - bb.minY + 10}"><path d="${crz}" stroke="#00a651" stroke-width="0.6" stroke-dasharray="2 1.4" fill="none"/><path d="${segs}" stroke="#f4f3ef" stroke-width="0.6" fill="none"/></svg>`;
  odometer($("#oL"), "00", "60", B[11]);
  odometer($("#oW"), "00.0", "59.5", B[11] + 0.12);
  odometer($("#oH"), "000.0", "139.5", B[11] + 0.24);
  const w = $$("#s3Cap .w");
  gsap.set(w, { opacity: 0 });
  show("#s3", B[11] - 0.02, B[14] - 0.01);
  tl.set("#dark", { opacity: 1 }, B[11] - 0.02)
    .set("#dark", { opacity: 0 }, B[14] - 0.01)
    .fromTo("#s3Num", { scale: 2.3 }, { scale: 1, duration: B[13] - B[11], ease: "power3.inOut", immediateRender: false }, B[11])
    .fromTo("#s3Die", { scale: 1.6, rotate: -6 }, { scale: 1, rotate: 0, duration: B[14] - B[11], ease: "power2.out", immediateRender: false }, B[11]);
  w.forEach((e, i) => word(e, B[12] + i * 0.12, { to: i === 3 ? 800 : 500, scale: 1.2 }));
}

// ---------- 3D camera and fold, keyed by time ----------
type Seg = [number, number, Shot, Shot, (k: number) => number];
const cam: Seg[] = [];
const foldKeys: [number, number, number, number][] = []; // t0, t1, from, to
const io = gsap.parseEase("power3.inOut");
const out = gsap.parseEase("expo.out");
const lin = (k: number) => k;
const at = (x: number, y: number) => ({ x, y });

function scene3D() {
  const R = box.radius;
  // S4: the blank folds; close on the lid's hinge, then the whole carton.
  cam.push([B[14] - 0.02, B[18], { at: "centre", az: 188, el: 6, dist: R * 1.15, fov: 30, roll: -4 }, { at: "centre", az: 212, el: 13, dist: R * 3.9, fov: 30, shift: [R * 0.75, R * 0.05] }, io]);
  foldKeys.push([B[14] + 0.05, B[17] + 0.2, 0, 1]);
  show("#c3d", B[14] - 0.02, B[18] - 0.01);
  show("#s4", B[14] - 0.02, B[18] - 0.01);
  const w4 = $$("#s4Cap .w");
  gsap.set(w4, { opacity: 0 });
  w4.forEach((e, i) => word(e, B[16] + i * 0.25, { to: 700, scale: 1.25 }));

  // S8: macro shots over the artwork, then the whole.
  show("#c3d", B[31] - 0.02, B[45] - 0.01);
  cam.push([B[31] - 0.02, B[33], { at: at(44, 112.6), az: -62, el: 9, dist: 40, fov: 22, roll: -5 }, { at: at(86, 112.6), az: -38, el: 3, dist: 30, fov: 22, roll: 2 }, lin]);
  cam.push([B[33], B[35], { at: at(71.8, 162), az: 38, el: 22, dist: 36, fov: 24, roll: 6 }, { at: at(70, 152), az: -18, el: -6, dist: 23, fov: 24, roll: -3 }, out]);
  cam.push([B[35], B[37], { at: at(110, 104), az: -58, el: 12, dist: 30, fov: 24, roll: 3 }, { at: at(118, 132), az: -42, el: 2, dist: 24, fov: 24, roll: -2 }, lin]);
  cam.push([B[37], B[39], { at: at(56, 94), az: -34, el: 28, dist: 36, fov: 24, roll: 5 }, { at: at(62, 98), az: 12, el: 16, dist: 26, fov: 24, roll: -2 }, out]);
  cam.push([B[39], B[40], { at: at(76, 186), az: 14, el: 6, dist: 34, fov: 26 }, { at: "centre", az: -30, el: 12, dist: R * 4.3, fov: 30, shift: [R * 0.6, 0] }, io]);
  cam.push([B[40], B[41], { at: "centre", az: -30, el: 12, dist: R * 4.3, fov: 30, shift: [R * 0.6, 0] }, { at: "centre", az: -36, el: 12, dist: R * 4.1, fov: 30, shift: [R * 0.6, 0] }, lin]);
  foldKeys.push([B[31] - 0.02, B[45], 1, 1]);
  show("#s8", B[40] - 0.02, B[41] - 0.01);
  const w8 = $$("#s8Cap .w");
  gsap.set(w8, { opacity: 0 });
  w8.forEach((e, i) => word(e, B[40] + i * 0.14, { to: 700, scale: 1.2 }));

  // S9: a whip round to the best angle, then the shutter.
  cam.push([B[41], B[43], { at: "centre", az: 70, el: 32, dist: R * 5.6, fov: 30, roll: 8, shift: [R * 0.45, 0] }, { at: "centre", az: -32, el: 13, dist: R * 4.2, fov: 30, shift: [R * 0.45, 0] }, out]);
  cam.push([B[43], B[45], { at: "centre", az: -32, el: 13, dist: R * 4.2, fov: 30, shift: [R * 0.45, 0] }, { at: "centre", az: -34, el: 13, dist: R * 4.05, fov: 30, shift: [R * 0.45, 0] }, lin]);
}

function sceneS5() {
  show("#s5", B[18] - 0.02, B[22] - 0.01);
  gsap.set(".verb", { autoAlpha: 0 });
  const verbs = ["#v1", "#v2", "#v3", "#v4"];
  verbs.forEach((v, i) => {
    const t0 = B[18 + i] - 0.02;
    show(v, t0, i === 3 ? B[22] - 0.01 : B[19 + i] - 0.02);
    word(`${v} .w`, t0, { from: 100, to: 900, scale: 1.7, dur: 0.38 });
    tl.fromTo(`${v} .vis`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3, ease: "expo.out", immediateRender: false }, t0 + 0.08);
  });
  gsap.set(".verb .w", { opacity: 0 });
  tl.fromTo("#v1 .ruler", { x: 220 }, { x: -60, duration: 0.5, ease: "expo.out", immediateRender: false }, B[18]);
  const chk = $("#chkP") as unknown as SVGPathElement;
  const L = chk.getTotalLength();
  gsap.set(chk, { strokeDasharray: L, strokeDashoffset: L });
  tl.to(chk, { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, B[19] + 0.1);
  tl.fromTo("#v3 .foldCard .r", { rotateY: 0 }, { rotateY: -160, duration: 0.42, ease: "power3.inOut", immediateRender: false }, B[20] + 0.05);
  tl.fromTo("#v4 .chips div", { y: -120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, ease: "back.out(2)", stagger: 0.08, immediateRender: false }, B[21] + 0.05);
}

function sceneS6() {
  const w = $$("#s6 .w");
  gsap.set(w, { opacity: 0 });
  gsap.set(["#s6 .sub", "#s6 .url"], { opacity: 0, y: 20 });
  show("#s6", B[22] - 0.02, B[26] - 0.01);
  w.forEach((e, i) => word(e, B[22] + i * 0.17, { to: i === 2 ? 800 : 600 }));
  tl.to("#s6Line", { width: 420, duration: 0.5, ease: "expo.inOut" }, B[23])
    .to("#s6 .sub", { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, B[24])
    .to("#s6 .url", { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, B[25])
    .fromTo("#s6", { scale: 1.12 }, { scale: 1, duration: B[26] - B[22], ease: "power2.out", immediateRender: false }, B[22]);
}

function sceneS7() {
  const w = $$("#s7 .w");
  gsap.set(w, { opacity: 0 });
  show("#s7", B[26] - 0.02, B[31] - 0.02);
  tl.set("#dark", { opacity: 1 }, B[26] - 0.02).set("#dark", { opacity: 0 }, B[31] - 0.02);
  word(w[0], B[26], { to: 500 });
  word(w[1], B[26] + 0.26, { to: 600 });
  word(w[2], B[27], { to: 700 });
  word(w[3], B[28], { from: 100, to: 900, scale: 2.2, dur: 0.5 });
  word(w[4], B[29], { to: 400, scale: 1.15 });
  tl.fromTo("#s7", { scale: 1 }, { scale: 1.07, duration: B[31] - B[26], ease: "none", immediateRender: false }, B[26]).to("#s7", { opacity: 0, filter: "blur(12px)", duration: 0.25, ease: "power2.in" }, B[31] - 0.27);
}

function sceneS9() {
  show("#s9", B[41] - 0.02, B[45] - 0.01);
  gsap.set("#vf", { opacity: 0, scale: 1.35 });
  gsap.set("#expChip", { opacity: 0, y: 30 });
  const w = $$("#s9Cap .w");
  gsap.set(w, { opacity: 0 });
  tl.to("#vf", { opacity: 1, duration: 0.2 }, B[41] + 0.15)
    .to("#vf", { scale: 1, duration: 0.42, ease: "expo.out" }, B[43] - 0.1);
  word(w[0], B[42], { to: 600 });
  word(w[1], B[42] + 0.24, { to: 900, scale: 1.8 });
  word(w[2], B[43], { to: 600 });
  tl.fromTo("#s9Cap .u", { "--k": 0 }, { "--k": 1, duration: 0.35, ease: "expo.out", immediateRender: false }, B[43] + 0.1)
    .fromTo("#shutter", { opacity: 0.95 }, { opacity: 0, duration: 0.32, ease: "power2.out", immediateRender: false }, B[44])
    .to("#expChip", { opacity: 1, y: 0, duration: 0.35, ease: "expo.out" }, B[44] + 0.05);
}

function sceneS10() {
  show("#s10", B[45] - 0.02, B[47] + 0.6);
  gsap.set("#scan", { opacity: 0 });
  gsap.set([".cardLbl"], { opacity: 0 });
  tl.fromTo("#card", { scale: 1920 / 1100, borderRadius: 0 }, { scale: 1, borderRadius: 18, duration: 0.45, ease: "expo.out", immediateRender: false }, B[45] - 0.02)
    .to("#lblImg", { opacity: 1, duration: 0.25 }, B[45] + 0.2)
    .fromTo("#cardDepth", { clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)", duration: 0.42, ease: "power2.inOut", immediateRender: false }, B[46])
    .set("#scan", { opacity: 1 }, B[46] - 0.01)
    .fromTo("#scan", { left: "100%" }, { left: "0%", duration: 0.42, ease: "power2.inOut", immediateRender: false }, B[46])
    .to("#scan", { opacity: 0, duration: 0.1 }, B[46] + 0.42)
    .to("#lblDep", { opacity: 1, duration: 0.25 }, B[46] + 0.15)
    .to("#cardDepth", { clipPath: "inset(0 0 0 50%)", duration: 0.3, ease: "power2.inOut" }, B[47] - 0.32)
    .to(".cardLbl", { opacity: 0, duration: 0.15 }, B[47] - 0.1)
    .set("#card", { opacity: 0 }, B[47] + 0.02);
}

function sceneS11() {
  show("#mag", B[47] - 0.02, HIT - 0.01);
  show("#fly", B[47] - 0.02, B[48] + 0.02);
  tl.set("#dark", { opacity: 1 }, B[47] - 0.02).set("#dark", { opacity: 0 }, HIT - 0.01);
  // Measure the slot and the prompt in the UI's own coordinates.
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
  // The reference card flies into the slot (zoomed view).
  const target = { x: v1.x + sr.left * Z1, y: v1.y + sr.top * Z1, w: sr.width * Z1, h: sr.height * Z1 };
  gsap.set("#flyCard", { x: 0, y: 0, scale: 1 });
  tl.fromTo("#mag", { opacity: 0, scale: Z1 * 1.12 }, { opacity: 1, scale: Z1, duration: 0.35, ease: "expo.out", immediateRender: false }, B[47])
    .fromTo("#flyCard", { x: 0, y: 0, width: 1100, height: 619, borderRadius: 18 }, { x: target.x - (960 - 550), y: target.y - (540 - 309), width: target.w, height: target.h, borderRadius: 10 * Z1, duration: 0.5, ease: "expo.inOut", immediateRender: false }, B[47] + 0.02)
    .set("#refImg", { opacity: 1 }, B[48])
    .set("#refPlus", { opacity: 0 }, B[48])
    .fromTo("#refSlot", { scale: 1.25 }, { scale: 1, duration: 0.3, ease: "back.out(3)", immediateRender: false }, B[48])
    .to(mag, { x: v2.x, y: v2.y, scale: 1.85, duration: 0.5, ease: "power3.inOut" }, B[49] - 0.2)
    .to(mag, { x: 0, y: 0, scale: 1, duration: 0.5, ease: "power3.inOut" }, B[53] - 0.1);
  gsap.set(["#refImg", "#refTag"], { opacity: 0 });
  tl.set("#refTag", { opacity: 1 }, B[48] + 0.1);
  // Typing.
  const prompt =
    "A sudden burst of iridescent liposomal bubbles explodes outward from directly behind the white NutriBoost box, spraying toward the camera in all directions. Large glossy golden-green oil spheres with colorful inner droplets shoot past the lens, smaller soap-like bubbles scatter and spin with rainbow reflections. At the moment of the burst, the camera makes a quick, punchy pull-back with a subtle shake, then settles smoothly. Soft white studio background, photorealistic, premium pharmaceutical commercial.";
  const marks = ["NutriBoost box", "burst", "photorealistic"];
  const typed = { n: 0 };
  const draw = () => {
    let s = prompt.slice(0, Math.round(typed.n));
    for (const m of marks) s = s.replace(m, `<mark>${m}</mark>`);
    $("#prompt").innerHTML = `<span style="color:#9aa0ff">@img1</span> ${s}<span class="caret"></span>`;
  };
  tl.fromTo(typed, { n: 0 }, { n: prompt.length, duration: B[52] - B[49], ease: "none", onUpdate: draw, immediateRender: false }, B[49]);
  tl.call(draw, [], B[47]);
  // Cursor to Generate, then the click on the silent beat.
  gsap.set("#cursor", { x: 1500, y: 760, opacity: 0 });
  tl.to("#cursor", { opacity: 1, duration: 0.1 }, B[53])
    .to("#cursor", { x: gr.left + gr.width * 0.42, y: gr.top + gr.height * 0.45, duration: 0.42, ease: "power3.inOut" }, B[53] + 0.02)
    .to("#gen", { scale: 0.95, backgroundColor: "#6d7bff", duration: 0.06 }, B[54])
    .to("#gen", { scale: 1, duration: 0.15 }, B[54] + 0.06)
    .to("#cursor", { scale: 0.85, duration: 0.06 }, B[54])
    .to("#cursor", { scale: 1, duration: 0.12 }, B[54] + 0.06);
  gsap.set("#genRow", { opacity: 0, y: 30 });
  const pct = { v: 0 };
  tl.to("#genRow", { opacity: 1, y: 0, duration: 0.18, ease: "expo.out" }, B[54] + 0.04)
    .fromTo(pct, { v: 0 }, { v: 100, duration: HIT - B[54] - 0.04, ease: "power1.in", onUpdate: () => ($("#pct").textContent = `Generating · ${Math.round(pct.v)}%`), immediateRender: false }, B[54] + 0.04)
    .fromTo("#shim", { backgroundPosition: "200% 0" }, { backgroundPosition: "-100% 0", duration: 0.3, repeat: 0, ease: "none", immediateRender: false }, B[54] + 0.04);
  show("#magCapL", B[48], HIT - 0.01);
  const wc = $$("#magCap .w");
  gsap.set(wc, { opacity: 0 });
  wc.forEach((e, i) => word(e, B[48] + 0.1 + i * 0.12, { to: 600, scale: 1.2 }));
}

function sceneS12() {
  show("#s12", HIT - 0.01, DURATION + 1);
  const g = ["#g1", "#g2"];
  gsap.set(g, { opacity: 0, y: 30 });
  gsap.set("#s12 .w", { opacity: 0 });
  tl.to("#g1", { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, B[56])
    .to("#g2", { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, B[58]);
  $$("#g1 .w").forEach((e, i) => word(e, B[56] + i * 0.15, { to: 700, scale: 1.2 }));
  word("#g2 .w", B[58], { to: 900, scale: 1.4 });
  tl.to(["#g1", "#g2"], { opacity: 0, duration: 0.25 }, B[59] - 0.2)
    .fromTo("#burst", { filter: "blur(0px)" }, { filter: "blur(16px)", duration: 0.5, ease: "power2.out", immediateRender: false }, B[59] - 0.1)
    .fromTo("#endBg", { backgroundColor: "rgba(230,229,226,0)" }, { backgroundColor: "rgba(230,229,226,0.82)", duration: 0.5, ease: "power2.out", immediateRender: false }, B[59] - 0.1);
  // End card.
  show("#end", B[59] - 0.02, DURATION + 1);
  const we = $$("#end .w");
  gsap.set(we, { opacity: 0 });
  gsap.set(["#end .url", "#end .studio"], { opacity: 0, y: 20 });
  word(we[0], B[59], { from: 100, to: 900, scale: 2.2, dur: 0.55 });
  word(we[1], B[60], { to: 600 });
  tl.to("#end .url", { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }, B[60] + 0.35)
    .to("#end .studio", { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }, B[60] + 0.65)
    .fromTo("#end", { scale: 1.08 }, { scale: 1, duration: DURATION - B[59], ease: "power2.out", immediateRender: false }, B[59])
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

function centreShot(a: Shot, b: Shot, k: number): Shot {
  // Centre shots blend their angles, so a camera turns round the carton instead of cutting through it.
  return { at: "centre", az: a.az + (b.az - a.az) * k, el: a.el + (b.el - a.el) * k, dist: a.dist + (b.dist - a.dist) * k, fov: (a.fov ?? 30) + ((b.fov ?? 30) - (a.fov ?? 30)) * k, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * k };
}

function render3D() {
  const on = getComputedStyle($("#c3d")).visibility !== "hidden";
  if (!on) return;
  box.setGround(!(now >= B[31] - 0.05 && now < B[39] + 0.25));
  let f = 1;
  for (const [t0, t1, a, b2] of foldKeys) if (now >= t0 && now <= t1) f = a + (b2 - a) * gsap.parseEase("power2.inOut")(Math.min(1, Math.max(0, (now - t0) / (t1 - t0))));
  box.setFold(f);
  const seg = cam.find(([t0, t1]) => now >= t0 && now < t1) ?? cam[cam.length - 1];
  const [t0, t1, a, b, ease] = seg;
  const k = ease(Math.min(1, Math.max(0, (now - t0) / (t1 - t0))));
  if (a.at === "centre" && b.at === "centre") box.setShot(centreShot(a, b, k));
  else box.setBlend(a, b, k);
  box.render();
}

let video: HTMLVideoElement;
async function renderVideo() {
  if (now < HIT - 0.05) return;
  const t = Math.min(video.duration - 0.02, Math.max(0, now - HIT));
  if (Math.abs(video.currentTime - t) > 1e-3) {
    await new Promise<void>((res) => {
      video.addEventListener("seeked", () => res(), { once: true });
      video.currentTime = t;
    });
  }
}

async function init() {
  await document.fonts.load('400 40px "Alexandria Variable"');
  await document.fonts.ready;
  grain();
  carton = await loadCarton("assets/nutriboost.pdf", 8192);
  box = createBox($("#c3d"), carton, { w: 1920, h: 1080 });
  video = $("#burst") as HTMLVideoElement;
  await new Promise<void>((res) => (video.readyState >= 1 ? res() : video.addEventListener("loadedmetadata", () => res(), { once: true })));
  // Stills for the exported reference and its depth map: the best angle.
  box.setFold(1);
  box.setShot({ at: "centre", az: -34, el: 13, dist: box.radius * 4.05, fov: 30 });
  box.render();
  const ref = await (async () => {
    // Composite on a light studio ground, as exported.
    const c = document.createElement("canvas");
    c.width = 1920;
    c.height = 1080;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(700, 300, 50, 960, 540, 1300);
    gr.addColorStop(0, "#fbfaf7");
    gr.addColorStop(1, "#dcdad4");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1920, 1080);
    g.drawImage(box.canvas, 0, 0);
    return c.toDataURL("image/jpeg", 0.95);
  })();
  box.render("depth");
  const depth = box.canvas.toDataURL("image/png");
  for (const id of ["#cardImg", "#flyImg", "#refImg"]) ($(id) as HTMLImageElement).src = ref;
  ($("#cardDepth") as HTMLImageElement).src = depth;
  await Promise.all($$("img").map((i) => ((i as HTMLImageElement).complete ? null : new Promise((r) => (i.onload = r)))));

  gsap.set(".layer:not(#light):not(#grain)", { autoAlpha: 0 });
  gsap.set(["#dark", "#fade", "#shutter"], { visibility: "visible", opacity: 0 });
  gsap.set("#endBg", { visibility: "visible", opacity: 1 });
  sceneS1();
  sceneS2();
  sceneS3();
  scene3D();
  sceneS5();
  sceneS6();
  sceneS7();
  sceneS9();
  sceneS10();
  sceneS11();
  sceneS12();
  await seek(0);
  (window as unknown as { ready: boolean }).ready = true;
}

async function seek(t: number) {
  now = t;
  tl.seek(t, false);
  updateS1();
  const f = Math.floor(t * 24);
  $("#grain").style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  render3D();
  await renderVideo();
}
(window as unknown as { seek: (t: number) => Promise<void> }).seek = seek;
(window as unknown as { duration: number }).duration = DURATION;
init().catch((e) => ((window as unknown as { err: string }).err = String(e?.stack ?? e)));
