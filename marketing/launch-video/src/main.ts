// Dielines launch film: one paused GSAP timeline, seeked frame by frame by
// the renderer, cut to the track's beats (117.5 BPM, a beat every ~0.51 s).

import gsap from "gsap";
import { generate, DEFAULT_PARAMS } from "../../../dieline/src/lib/dieline";
import { renderSvg, segsToPath } from "../../../dieline/src/lib/dieline/export/svg";
import { textToBraille } from "../../../dieline/src/lib/dieline/braille";
import type { CartonParams, StyleId } from "../../../dieline/src/lib/dieline/types";
import { createBox, type Box3D } from "./box3d";
import { paintArt } from "./art";

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const $$ = (s: string) => Array.from(document.querySelectorAll(s)) as HTMLElement[];

// Beats from the track (librosa).
const B = [0.23, 0.81, 1.32, 1.81, 2.28, 2.72, 3.23, 3.74, 4.32, 4.88, 5.36, 5.87, 6.39, 6.92, 7.41, 7.94, 8.43, 8.94, 9.43, 9.96, 10.45, 10.98, 11.47, 11.98, 12.49, 13.0, 13.49, 14.02, 14.51, 15.02, 15.51, 16.02, 16.56, 17.07, 17.58, 18.09, 18.58, 19.09, 19.6, 20.11, 20.62, 21.13, 21.59, 22.13, 22.64, 23.15, 23.64, 24.17, 24.71, 25.19, 25.68, 26.19, 26.68, 27.21, 27.72, 28.24, 28.75, 29.26, 29.74, 30.23, 30.74];
export const DURATION = 33.1;

const carton = (p: Partial<CartonParams>) => generate({ ...DEFAULT_PARAMS, showDimensions: false, ...p });
const svgOf = (p: Partial<CartonParams>, layers: string[] = ["cut", "crease", "glue", "bleed"]) =>
  renderSvg(carton(p), { layers: new Set(layers as never), margin: 4, blankFill: "#ffffff" }).replace(/width="[\d.]+mm" height="[\d.]+mm"/, "");

const tl = gsap.timeline({ paused: true });
let box: Box3D | null = null;
const fold = { t: 0, az: 70, el: 55, dist: 3.6, lift: 0 };

function sceneA() {
  // One continuous cut line, drawn by a glowing pen; the creases follow, dashed.
  const d = carton({ L: 70, W: 28, H: 120 });
  const m = 8;
  const vb = `${d.bbox.minX - m} ${d.bbox.minY - m} ${d.bbox.maxX - d.bbox.minX + 2 * m} ${d.bbox.maxY - d.bbox.minY + 2 * m}`;
  const creases = d.strokes.filter((q) => q.layer === "crease").map((q) => segsToPath([q.seg]));
  $("#aSvg").innerHTML = `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet">
    <defs><mask id="cm" maskUnits="userSpaceOnUse">${creases.map((c) => `<path class="cmask" d="${c}" stroke="#fff" stroke-width="3" fill="none"/>`).join("")}</mask></defs>
    <g mask="url(#cm)">${creases.map((c) => `<path d="${c}" stroke="#19c26b" stroke-width="2.6" stroke-dasharray="3 2.2" fill="none" vector-effect="non-scaling-stroke" style="stroke-dasharray:9 6"/>`).join("")}</g>
    <path id="aCut" d="${segsToPath(d.outline)}Z" fill="none" stroke="#ff2a3d" stroke-width="0.85" stroke-linejoin="round" style="filter: drop-shadow(0 0 7px rgba(255,42,61,0.7))"/>
  </svg>`;
  const cut = $("#aCut") as unknown as SVGPathElement;
  const L = cut.getTotalLength();
  cut.style.strokeDasharray = `${L}`;
  cut.style.strokeDashoffset = `${L}`;
  const masks = $$(".cmask") as unknown as SVGPathElement[];
  masks.forEach((p) => {
    const l = p.getTotalLength();
    p.style.strokeDasharray = `${l}`;
    p.style.strokeDashoffset = `${l}`;
  });
  gsap.set(".aTag", { opacity: 0, y: 14 });
  const pen = { p: 0 };
  const svg = $("#aSvg").querySelector("svg")!;
  const placePen = () => {
    const q = cut.getPointAtLength(pen.p * L);
    const ctm = cut.getScreenCTM();
    const stage = $("#stage").getBoundingClientRect();
    if (!ctm) return;
    const pt = new DOMPoint(q.x, q.y).matrixTransform(ctm);
    gsap.set("#aPen", { x: pt.x - stage.left, y: pt.y - stage.top, opacity: pen.p > 0 && pen.p < 1 ? 1 : 0 });
  };
  void svg;
  tl.set("#sA", { autoAlpha: 1 }, 0)
    .fromTo("#grid", { x: 0, y: 0 }, { x: -120, y: -60, duration: 4, ease: "none" }, 0)
    .fromTo("#aSvg", { scale: 0.92 }, { scale: 1.04, duration: 3.74, ease: "power1.out" }, 0)
    .to(pen, { p: 1, duration: B[5] - B[0], ease: "power1.inOut", onUpdate: placePen }, B[0])
    .to(cut, { strokeDashoffset: 0, duration: B[5] - B[0], ease: "power1.inOut" }, B[0])
    .to(masks, { strokeDashoffset: 0, duration: 0.45, ease: "power2.out", stagger: (B[6] - B[2]) / masks.length }, B[2])
    .to("#aTag1", { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, B[1])
    .to("#aTag2", { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, B[2])
    .to("#aTag3", { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, B[5])
    .to("#sA", { scale: 0.6, filter: "blur(18px)", autoAlpha: 0, duration: 0.42, ease: "power3.in" }, B[7] - 0.36);
  tl.call(placePen, [], 0);
}

function sceneB() {
  const words = $$("#bLine span");
  gsap.set(words, { opacity: 0, y: 70, fontVariationSettings: '"wght" 100, "wdth" 25, "opsz" 144' });
  tl.set("#sB", { autoAlpha: 1 }, B[7] - 0.05).set("#bLine", { y: 0 }, B[7]);
  words.forEach((w, i) => {
    const at = B[7 + i] - 0.04;
    tl.to(w, { opacity: 1, y: 0, duration: 0.34, ease: "back.out(2.2)" }, at).to(w, { fontVariationSettings: '"wght" 900, "wdth" 100, "opsz" 144', duration: 0.42, ease: "power2.out" }, at);
  });
  // "flat." widens, the rest steps back, then it is pressed flat into a line.
  tl.to(words.slice(0, 4), { opacity: 0.16, duration: 0.4, ease: "power2.out" }, B[12])
    .to("#bFlat", { fontVariationSettings: '"wght" 1000, "wdth" 151, "opsz" 144', duration: 0.5, ease: "power3.out" }, B[12])
    .to(words.slice(0, 4), { opacity: 0, y: -40, duration: 0.3, ease: "power2.in" }, B[13] - 0.12)
    .to("#bFlat", { scaleY: 0.05, duration: 0.24, ease: "power4.in", transformOrigin: "50% 58%" }, B[13])
    .set("#bFlat", { opacity: 0 }, B[13] + 0.24)
    .fromTo("#bBar", { scaleX: 0.28 }, { scaleX: 1, duration: 0.26, ease: "expo.out", immediateRender: false }, B[13] + 0.22)
    .set("#sB", { autoAlpha: 0 }, B[14] + 0.02);
}

function sceneC() {
  const word = $("#cWord");
  word.innerHTML = "Dielines".split("").map((c) => `<span class="ch">${c}</span>`).join("");
  $("#cTag").innerHTML = "Print-ready dielines for pharma cartons.".split(" ").map((w) => `<span>${w}</span>`).join(" ");
  const chars = $$("#cWord .ch");
  gsap.set(chars, { rotateX: -100, opacity: 0, y: 40 });
  gsap.set("#cBy", { opacity: 0, letterSpacing: "0.9em" });
  gsap.set("#cTag span", { opacity: 0, filter: "blur(16px)", y: 18 });
  gsap.set("#cFold .l", { rotateY: 92 });
  gsap.set("#cFold .r", { rotateY: -92 });
  gsap.set("#cFold .crease", { opacity: 0 });
  tl.set("#cBg", { autoAlpha: 1 }, B[14] - 0.01)
    .fromTo("#cBg", { clipPath: "inset(49.4% 0% 49.4% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "expo.inOut" }, B[14])
    .to("#cFold .l", { rotateY: 0, duration: 0.9, ease: "power3.out" }, B[14] + 0.1)
    .to("#cFold .r", { rotateY: 0, duration: 0.9, ease: "power3.out" }, B[14] + 0.1)
    .to("#cFold .crease", { opacity: 0.55, duration: 0.3 }, B[14] + 0.7)
    .fromTo(["#cFold", "#cWord", "#cBy", "#cTag"], { scale: 1 }, { scale: 1.06, duration: B[22] - B[14], ease: "none" }, B[14])
    .to(chars, { rotateX: 0, opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.6)", stagger: 0.055 }, B[14] + 0.18)
    .to("#cBy", { opacity: 1, letterSpacing: "0.32em", duration: 0.9, ease: "expo.out" }, B[16])
    .add(() => {}, B[17])
    .set(chars, { className: "ch sheen" }, B[18] - 0.01)
    .fromTo(chars, { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 0.9, ease: "power2.inOut" }, B[18])
    .to(chars, { fontVariationSettings: '"SOFT" 0, "WONK" 0, "opsz" 144', duration: 0.8, ease: "power2.inOut" }, B[18])
    .to("#cTag span", { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.5, ease: "power3.out", stagger: 0.09 }, B[20])
    .to(["#cWord", "#cBy", "#cTag", "#cFold"], { y: -140, opacity: 0, filter: "blur(10px)", duration: 0.42, ease: "power3.in", stagger: 0.05 }, B[22] + 0.05)
    .set("#cBg", { autoAlpha: 0 }, B[23] + 0.05);
}

/** Odometer: a column of digits per place, rolled to the value. */
function odometer(host: HTMLElement, from: number) {
  const digits = String(from).padStart(3, " ").split("");
  host.innerHTML = digits
    .map(() => `<div class="col">${Array.from({ length: 30 }, (_, k) => `<span>${k % 10}</span>`).join("")}<span> </span></div>`)
    .join("");
  const cols = Array.from(host.querySelectorAll(".col")) as HTMLElement[];
  const place = (v: number) =>
    String(v)
      .padStart(3, " ")
      .split("")
      .map((c) => (c === " " ? 30 : 10 + Number(c)));
  gsap.set(cols, { y: (i) => -place(from)[i] * 56 });
  return (to: number, at: number) => {
    const target = place(to);
    cols.forEach((c, i) => tl.to(c, { y: -(target[i] === 30 ? 30 : target[i] + (target[i] >= place(from)[i] ? 0 : 10)) * 56, duration: 0.45, ease: "power3.inOut" }, at + i * 0.04));
  };
}

function sceneD() {
  const L = odometer($("#odoL"), 40);
  const W = odometer($("#odoW"), 40);
  const H = odometer($("#odoH"), 120);
  const styles: [StyleId, string, Partial<CartonParams>][] = [
    ["rte", "Reverse tuck end", { L: 40, W: 40, H: 120 }],
    ["rte", "Reverse tuck end", { L: 60, W: 25, H: 110 }],
    ["crash", "Crash-lock bottom", { L: 70, W: 40, H: 110 }],
    ["snap", "Snap-lock bottom", { L: 70, W: 50, H: 100 }],
    ["srp", "Shelf-ready tray", { L: 150, W: 100, H: 80 }],
    ["gable", "Gable box with handle", { L: 120, W: 80, H: 100 }],
    ["mailer", "Mailer box", { L: 220, W: 160, H: 60 }],
  ];
  $("#dStyleStack").innerHTML = styles.slice(1).map(([, n]) => `<div>${n}</div>`).join("");
  $("#dDie").innerHTML = styles.map(([s, , p]) => `<div class="die">${svgOf({ style: s, ...p })}</div>`).join("");
  const dies = $$("#dDie .die");
  gsap.set(dies, { opacity: 0, scale: 0.9 });
  gsap.set("#dHead", { opacity: 0, x: -60 });
  gsap.set("#dCard", { opacity: 0, y: 60 });
  gsap.set("#dNote", { opacity: 0 });
  tl.set("#dBg", { autoAlpha: 1 }, B[23] - 0.05)
    .fromTo("#dBg", { opacity: 0 }, { opacity: 1, duration: 0.2 }, B[23] - 0.05)
    .to("#dHead", { opacity: 1, x: 0, duration: 0.5, ease: "expo.out" }, B[23])
    .to("#dCard", { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" }, B[23] + 0.08)
    .to(dies[0], { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }, B[23] + 0.1);
  // Size typed on three beats; the drawing follows on the last.
  L(60, B[24]);
  W(25, B[24] + 0.2);
  H(110, B[25]);
  tl.to(dies[0], { opacity: 0, scale: 1.04, duration: 0.25 }, B[25]).to(dies[1], { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.7)" }, B[25]);
  // Styles: one per beat, the name rolling in its slot.
  for (let k = 2; k < styles.length; k++) {
    const at = B[24 + k];
    tl.to(dies[k - 1], { opacity: 0, scale: 0.94, duration: 0.2, ease: "power2.in" }, at - 0.06)
      .to(dies[k], { opacity: 1, scale: 1, duration: 0.42, ease: "back.out(1.8)" }, at)
      .to("#dStyleStack", { y: -(k - 1) * 40, duration: 0.36, ease: "power3.inOut" }, at);
  }
  tl.to("#dNote", { opacity: 1, duration: 0.4 }, B[27]);
  // E: zoom through the mailer's crease into white.
  tl.to(dies[styles.length - 1], { scale: 14, filter: "blur(10px)", duration: 0.55, ease: "power4.in", transformOrigin: "50% 46%" }, B[31])
    .to(["#dHead", "#dCard", "#dNote"], { opacity: 0, x: -80, duration: 0.3, ease: "power2.in" }, B[31])
    .to("#flash", { opacity: 1, duration: 0.12 }, B[32] - 0.06)
    .set("#dBg", { autoAlpha: 0 }, B[32] + 0.05);
}

function sceneF() {
  const d = carton({ L: 52, W: 26, H: 112, style: "rte", lockTab: false });
  const art = paintArt(d);
  box = createBox($("#fBox"), d, art, { w: 1920, h: 1080 });
  gsap.set("#fText h2", { opacity: 0, y: 50 });
  gsap.set("#fText p", { opacity: 0 });
  tl.set("#fBg", { autoAlpha: 1 }, B[32] + 0.04)
    .to("#flash", { opacity: 0, duration: 0.5, ease: "power2.out" }, B[32] + 0.05)
    .fromTo(fold, { t: 0, az: 182, el: 6, dist: 6.4, lift: 0.25 }, { t: 1, az: 148, el: 16, dist: 2.75, lift: 0, duration: B[37] - B[32], ease: "power2.inOut" }, B[32] + 0.05)
    .to(fold, { az: 212, el: 12, duration: B[41] - B[37], ease: "sine.inOut" }, B[37])
    .to("#fText h2", { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, B[34])
    .fromTo("#fText .mk", { "--mk": 0 }, { "--mk": 1, duration: 0.45, ease: "power3.inOut" }, B[35])
    .to("#fText p", { opacity: 1, duration: 0.4 }, B[38])
    .to("#fBg", { opacity: 0, duration: 0.25 }, B[41] - 0.2)
    .set("#fBg", { autoAlpha: 0 }, B[41]);
}

function sceneG() {
  // "NOVA 500" in Braille, two lines of cells.
  const cells = textToBraille("nova 500").cells as number[][];
  const dots: string[] = [];
  const pitch = 46;
  cells.forEach((dotsOn, ci) => {
    const row = ci < 5 ? 0 : 1;
    const col = ci < 5 ? ci : ci - 5;
    for (const n of dotsOn) {
      const x = col * pitch * 2.6 + (n > 3 ? pitch : 0);
      const y = row * pitch * 3.9 + ((n - 1) % 3) * pitch;
      dots.push(`<i style="left:${x}px;top:${y}px"></i>`);
    }
  });
  $("#gDots").innerHTML = dots.join("");
  $("#gBars").innerHTML = Array.from({ length: 17 }, (_, k) => `<i style="width:${[8, 20, 8, 8, 20, 20, 8, 20, 8, 8, 20, 8, 20, 8, 20, 20, 8][k]}px"></i>`).join("");
  gsap.set("#gDots i", { scale: 0 });
  gsap.set("#gBars i", { scaleY: 0 });
  gsap.set("#gCode", { clipPath: "inset(0 100% 0 0)" });
  gsap.set("#gWords span", { yPercent: 110 });
  gsap.set("#gSub", { opacity: 0 });
  tl.set("#gBg", { autoAlpha: 1 }, B[41] - 0.02)
    .fromTo("#gPanel", { x: 300, rotate: 6, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, B[41])
    .to("#gWords span", { yPercent: 0, duration: 0.42, ease: "power4.out", stagger: { each: B[42] - B[41] } }, B[41])
    .to("#gDots i", { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.45)", stagger: { each: 0.025, from: "start" } }, B[41] + 0.1)
    .to("#gBars i", { scaleY: 1, duration: 0.35, ease: "power3.out", stagger: 0.025 }, B[42] + 0.08)
    .to("#gCode", { clipPath: "inset(0 0% 0 0)", duration: 0.4, ease: "power3.inOut" }, B[43])
    .to("#gSub", { opacity: 1, duration: 0.3 }, B[43] + 0.2)
    .to("#gBg", { xPercent: -100, duration: 0.4, ease: "power4.in" }, B[45] - 0.3)
    .set("#gBg", { autoAlpha: 0 }, B[45] + 0.12);
}

function sceneH() {
  const checks = [
    ["Lid covers the opening", "100 %"],
    ["Dust flaps clear each other", "0.6 mm"],
    ["Tuck fits inside", "13 / 109 mm"],
    ["Glue flap for the folder-gluer", "12 mm"],
    ["Flaps do not collide", "OK"],
  ];
  const tick = `<svg viewBox="0 0 20 20"><path d="M4 10.5 8.2 14.5 16 6" fill="none" stroke="#0a0a0b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  $("#hChecks").innerHTML = checks.map(([a, b]) => `<div class="chk"><span class="dot">${tick}</span><span>${a}</span><span class="val">${b}</span></div>`).join("");
  gsap.set(".chk", { x: 120, opacity: 0 });
  gsap.set(".chk .dot svg", { scale: 0 });
  // Exploded layers, each a real layer of the dieline.
  const p = { L: 52, W: 26, H: 112, braille: { ...DEFAULT_PARAMS.braille, enabled: true, text: "nova 500", panel: "front" as const } };
  const layers: [string[], string, string][] = [
    [["bleed"], "Bleed", "#00AEEF"],
    [["crease"], "Crease", "#19c26b"],
    [["braille"], "Braille", "#4f8cff"],
    [["cut"], "Cut", "#ff2a3d"],
  ];
  $("#hStackIn").innerHTML = layers
    .map(([ls, nm, c]) => `<div class="plane">${renderSvg(carton(p), { layers: new Set(ls as never), margin: 4 }).replace(/width="[\d.]+mm" height="[\d.]+mm"/, "")}<div class="nm mono" style="color:${c}">${nm}</div></div>`)
    .join("");
  $$("#hStackIn svg path, #hStackIn svg circle").forEach((e) => (e.style.vectorEffect = "non-scaling-stroke"));
  $$("#hStackIn svg g").forEach((g) => g.setAttribute("stroke-width", "2"));
  $$("#hStackIn #Cut").forEach((g) => g.setAttribute("stroke", "#ff2a3d"));
  $$("#hStackIn #Crease").forEach((g) => g.setAttribute("stroke", "#19c26b"));
  const planes = $$(".plane");
  gsap.set(planes, { z: 0, opacity: 0 });
  gsap.set(".plane .nm", { opacity: 0 });
  gsap.set("#hChips div", { y: 200, opacity: 0 });
  gsap.set("#hScore", { opacity: 0 });
  tl.set("#hBg", { autoAlpha: 1 }, B[45] - 0.3)
    .fromTo("#hBg", { xPercent: 100 }, { xPercent: 0, duration: 0.4, ease: "power4.out" }, B[45] - 0.28)
    .to("#hScore", { opacity: 1, duration: 0.2 }, B[45])
    .to(".chk", { x: 0, opacity: 1, duration: 0.4, ease: "power3.out", stagger: 0.09 }, B[45])
    .to(".chk .dot", { backgroundColor: "#19c26b", duration: 0.2, stagger: 0.12 }, B[46])
    .to(".chk .dot svg", { scale: 1, duration: 0.3, ease: "back.out(3)", stagger: 0.12 }, B[46])
    .to(planes, { opacity: 1, duration: 0.3, stagger: 0.05 }, B[46] + 0.1)
    .to(planes, { z: (i) => (i - 1.5) * 120, duration: 0.7, ease: "expo.out" }, B[47])
    .to(".plane .nm", { opacity: 1, duration: 0.3, stagger: 0.06 }, B[47] + 0.2)
    .to("#hStackIn", { rotateZ: -28, duration: 1.6, ease: "sine.inOut" }, B[47])
    .to("#hChips div", { y: 0, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.6)", stagger: 0.16 }, B[48])
    .to("#hBg", { scale: 0.9, opacity: 0, filter: "blur(8px)", duration: 0.32, ease: "power3.in" }, B[50] - 0.3)
    .set("#hBg", { autoAlpha: 0 }, B[50]);
}

function sceneI() {
  gsap.set("#iHead", { opacity: 0, y: 30 });
  gsap.set("#iZone", { opacity: 0, scale: 0.94 });
  gsap.set("#iFile", { y: -760, rotate: -14 });
  gsap.set("#iSplit", { autoAlpha: 0 });
  gsap.set("#iLang", { autoAlpha: 0, scale: 0.7 });
  gsap.set("#iLangCap", { autoAlpha: 0 });
  gsap.set("#iCap", { opacity: 0, y: 20 });
  tl.set("#iBg", { autoAlpha: 1 }, B[50] - 0.12)
    .fromTo("#iBg", { opacity: 0 }, { opacity: 1, duration: 0.15 }, B[50] - 0.12)
    .to("#iHead", { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, B[50] - 0.05)
    .to("#iZone", { opacity: 1, scale: 1, duration: 0.35, ease: "expo.out" }, B[50])
    .to("#iFile", { y: 0, rotate: 0, duration: 0.5, ease: "bounce.out" }, B[50] + 0.05)
    .to("#iZone", { borderColor: "#ff2a3d", duration: 0.15 }, B[50] + 0.35)
    .set("#iSplit", { autoAlpha: 1 }, B[51] - 0.05)
    .fromTo("#iShot", { clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" }, { clipPath: "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)", duration: 0.45, ease: "expo.out" }, B[51])
    .set(["#iHead", "#iZone", "#iFile"], { autoAlpha: 0 }, B[51] - 0.04)
    .to("#iCap", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, B[51] + 0.15)
    .set("#iLang", { autoAlpha: 1 }, B[52] - 0.02)
    .to("#iSplit", { filter: "blur(14px) brightness(0.45)", duration: 0.3 }, B[52] - 0.04)
    .to("#iLang", { scale: 1, duration: 0.35, ease: "back.out(2)" }, B[52])
    .to("#iCard", { rotateY: 180, duration: 0.55, ease: "power3.inOut" }, B[52] + 0.2)
    .to("#iLangCap", { autoAlpha: 1, duration: 0.3 }, B[52] + 0.3)
    .to("#iBg", { opacity: 0, duration: 0.35, ease: "power2.in" }, B[53] + 0.05)
    .set("#iBg", { autoAlpha: 0 }, B[54] - 0.1);
}

function sceneJ() {
  // The track drops out before the last hit: a cursor waits; then FREE.
  gsap.set("#jFree", { opacity: 0, scale: 1.6 });
  gsap.set(["#jFor", "#jLine"], { opacity: 0, y: 20 });
  gsap.set("#jCursor", { opacity: 0 });
  const hit = 28.0;
  tl.set("#jBg", { autoAlpha: 1 }, B[54] - 0.12)
    .to("#jCursor", { opacity: 1, duration: 0.01 }, 27.55)
    .to("#jCursor", { opacity: 0, duration: 0.01 }, 27.78)
    .to("#jCursor", { opacity: 1, duration: 0.01 }, 27.86)
    .set("#jCursor", { opacity: 0 }, hit - 0.02)
    .to("#jFree", { opacity: 1, scale: 1, duration: 0.18, ease: "power4.out" }, hit)
    .fromTo("#jFree", { textShadow: "-26px 0 0 rgba(255,42,61,0.9), 26px 0 0 rgba(0,190,255,0.9)" }, { textShadow: "0px 0 0 rgba(255,42,61,0), 0px 0 0 rgba(0,190,255,0)", duration: 0.6, ease: "power3.out" }, hit)
    .fromTo("#jBg", { x: -18, y: 10 }, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1.2, 0.25)" }, hit)
    .to("#jFor", { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, B[55])
    .to("#jLine", { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, B[56])
    .to("#jBg", { opacity: 0, duration: 0.3 }, B[57] - 0.2)
    .set("#jBg", { autoAlpha: 0 }, B[57] + 0.1);
}

function sceneK() {
  gsap.set("#kWord", { opacity: 0, y: 30, fontVariationSettings: '"SOFT" 100, "WONK" 0, "opsz" 144, "wght" 300' });
  gsap.set("#kBy", { opacity: 0 });
  gsap.set("#kUrl .fill", { scaleX: 0 });
  gsap.set("#kUrl span", { opacity: 0 });
  gsap.set("#kRow", { opacity: 0 });
  gsap.set("#kGlow", { opacity: 0, scale: 0.6 });
  tl.set("#kBg", { autoAlpha: 1 }, B[57] - 0.15)
    .to("#kGlow", { opacity: 1, scale: 1, duration: 1.8, ease: "power2.out" }, B[57] - 0.1)
    .to("#kWord", { opacity: 1, y: 0, fontVariationSettings: '"SOFT" 100, "WONK" 0, "opsz" 144, "wght" 650', duration: 0.9, ease: "expo.out" }, B[57])
    .to("#kBy", { opacity: 1, duration: 0.6 }, B[58])
    .to("#kUrl .fill", { scaleX: 1, duration: 0.5, ease: "expo.inOut" }, B[59])
    .to("#kUrl span", { opacity: 1, duration: 0.3 }, B[59] + 0.25)
    .to("#kRow", { opacity: 1, duration: 0.5 }, B[60])
    .to("#kGlow", { scale: 1.12, duration: 2, ease: "sine.inOut" }, B[60])
    .to("#fade", { opacity: 1, duration: 0.9, ease: "power1.in" }, DURATION - 0.95);
}

async function init() {
  await document.fonts.ready;
  grain();
  gsap.set(".layer:not(#sA):not(#fade):not(#flash)", { autoAlpha: 0 });
  sceneA();
  sceneB();
  sceneC();
  sceneD();
  sceneF();
  sceneG();
  sceneH();
  sceneI();
  sceneJ();
  sceneK();
  // Stills for the upload scene: the flat print and a closed product shot.
  if (box) {
    const d = carton({ L: 52, W: 26, H: 112, style: "rte", lockTab: false });
    ($("#iFlatImg") as HTMLImageElement).src = paintArt(d).toDataURL("image/png");
    box.setFold(1);
    box.setView(142, 14, 2.5, 0.05);
    box.render();
    ($("#iShotImg") as HTMLImageElement).src = box.canvas.toDataURL("image/png");
  }
  tl.seek(0);
  render();
  (window as unknown as { ready: boolean }).ready = true;
}

function grain() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let seed = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = seed % 256;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  $("#grain").style.backgroundImage = `url(${c.toDataURL()})`;
}

let now = 0;
function render() {
  const f = Math.floor(now * 24);
  $("#grain").style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  if (box) {
    box.setFold(fold.t);
    box.setView(fold.az, fold.el, fold.dist, fold.lift);
    box.render();
  }
}

(window as unknown as { seek: (t: number) => void }).seek = (t: number) => {
  now = t;
  tl.seek(t, false);
  render();
};
(window as unknown as { duration: number }).duration = DURATION;
init();
