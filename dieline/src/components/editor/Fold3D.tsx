"use client";

import { useLang } from "../LangProvider";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { apply, pose, removedFaces, type Model3D } from "@/lib/dieline/fold3d";

const PRINT = "#fbfbf9";
const INSIDE = "#f1f0ec";
const EDGE = "#3a3a3a";
const LINE: Record<"cut" | "crease" | "perf", { color: string; dash: number; gap: number }> = {
  cut: { color: "#3a3a3a", dash: 0, gap: 0 },
  crease: { color: "#7a7a7a", dash: 3, gap: 2 },
  perf: { color: "#c46a00", dash: 1.5, gap: 1.5 },
};

/** Artwork laid on the printed side: an image covering the blank rectangle x0, y0, w, h (mm, y down). */
export interface Artwork {
  image: HTMLCanvasElement | ImageBitmap;
  x0: number;
  y0: number;
  w: number;
  h: number;
}

/** A saved view: direction from the carton's centre, distance in carton radii, lens, and fold position. */
interface Angle {
  name: string;
  dir: [number, number, number];
  dist: number;
  fov: number;
  t: number;
}

const ANGLES_KEY = "dielines.angles";
const loadAngles = (): Angle[] => {
  try {
    return JSON.parse(localStorage.getItem(ANGLES_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const storeAngles = (a: Angle[]) => {
  try {
    localStorage.setItem(ANGLES_KEY, JSON.stringify(a));
  } catch {
    /* storage unavailable: angles last for this visit only */
  }
};

/** Depth map shader: white nearest, black farthest, linear across the carton. */
const DEPTH = {
  uniforms: { near: { value: 0 }, far: { value: 1 } },
  vertexShader: "varying float vZ; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "uniform float near; uniform float far; varying float vZ; void main() { float d = clamp((vZ - near) / (far - near), 0.0, 1.0); gl_FragColor = vec4(vec3(1.0 - d), 1.0); }",
};

/**
 * The carton in 3D, folded from flat (0) to closed (1) with the slider beside it.
 * `mini` draws it closed and slowly turning, without controls, as a thumbnail.
 * Views can be saved as angles and exported as a product image or a depth map.
 */
export function Fold3D({
  model,
  mini = false,
  art,
  fileBase = "carton",
  tools = true,
  inside = INSIDE,
  onInside,
}: {
  model: Model3D;
  mini?: boolean;
  art?: Artwork | null;
  fileBase?: string;
  /** Angle saving and image exports; off on a shared link. */
  tools?: boolean;
  /** Colour of the unprinted side (#rrggbb). */
  inside?: string;
  /** With it, a colour picker for the inside is shown. */
  onInside?: (hex: string) => void;
}) {
  const { t: tr } = useLang();
  const host = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(1);
  /** The model's second slider (a door): 0 closed … 1 open. */
  const [e, setE] = useState(0);
  const [noGl, setNoGl] = useState(false);
  const steps = model.present ? 2 : 1;
  // Back to the closed carton when the style loses its presentation step.
  useEffect(() => setT((v) => Math.min(v, steps)), [steps]);
  const ctx = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    faces: THREE.Object3D[];
  } | null>(null);
  const framed = useRef<string>("");
  const insideRef = useRef(inside);
  insideRef.current = inside;
  // The inside colour changes without rebuilding the faces.
  useEffect(() => {
    for (const o of ctx.current?.faces ?? [])
      o.traverse((x) => {
        if (x instanceof THREE.Mesh && x.userData.inside) (x.material as THREE.MeshLambertMaterial).color.set(inside);
      });
  }, [inside]);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => setAngles(loadAngles()), []);

  // Scene, camera and controls, once.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setNoGl(true);
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none", display: "block" });
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(1, 2, 1.5);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-1.5, -0.5, -1);
    scene.add(fill);
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    if (mini) {
      controls.enabled = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5;
    }
    const group = new THREE.Group();
    scene.add(group);
    ctx.current = { renderer, scene, camera, controls, group, faces: [] };
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      ctx.current = null;
    };
    // The thumbnail is set up once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Faces, rebuilt whenever the carton changes.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    for (const o of c.faces) {
      c.group.remove(o);
      o.traverse((x) => {
        if (x instanceof THREE.Mesh || x instanceof THREE.Line) x.geometry.dispose();
      });
    }
    const tex = art ? new THREE.CanvasTexture(art.image as HTMLCanvasElement) : null;
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = c.renderer.capabilities.getMaxAnisotropy();
    }
    c.faces = model.faces.map((f) => {
      const shape = new THREE.Shape(f.poly.map((q) => new THREE.Vector2(q.x, q.y)));
      const geo = new THREE.ShapeGeometry(shape);
      if (art) {
        // Each face shows its own piece of the flat artwork.
        const pos = geo.getAttribute("position");
        const uv = new Float32Array(pos.count * 2);
        for (let k = 0; k < pos.count; k++) {
          uv[2 * k] = (pos.getX(k) - art.x0) / art.w;
          uv[2 * k + 1] = 1 - (pos.getY(k) - art.y0) / art.h;
        }
        geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      }
      const mat = (color: string, side: THREE.Side, map: THREE.Texture | null = null) =>
        new THREE.MeshLambertMaterial({ color: map ? "#ffffff" : color, map, side, transparent: true, polygonOffset: true, polygonOffsetFactor: -f.layer, polygonOffsetUnits: -f.layer * 4 });
      const o = new THREE.Group();
      const back = new THREE.Mesh(geo, mat(insideRef.current, THREE.BackSide));
      back.userData.inside = true;
      o.add(new THREE.Mesh(geo, mat(PRINT, THREE.FrontSide, tex)), back);
      const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(f.poly.map((q) => new THREE.Vector3(q.x, q.y, 0))), new THREE.LineBasicMaterial({ color: EDGE, transparent: true }));
      edge.userData.line = true;
      o.add(edge);
      // Cuts, creases and perforations inside the face, drawn just off both sides.
      for (const ln of art ? [] : (f.lines ?? [])) {
        const st = LINE[ln.kind];
        for (const z of [0.25, -0.25]) {
          const g = new THREE.BufferGeometry().setFromPoints(ln.pts.map((q) => new THREE.Vector3(q.x, q.y, z)));
          const m = st.dash ? new THREE.LineDashedMaterial({ color: st.color, dashSize: st.dash, gapSize: st.gap, transparent: true }) : new THREE.LineBasicMaterial({ color: st.color, transparent: true });
          const l = new THREE.Line(g, m);
          l.userData.line = true;
          if (st.dash) l.computeLineDistances();
          o.add(l);
        }
      }
      o.matrixAutoUpdate = false;
      c.group.add(o);
      return o;
    });
    // Blank coordinates have y down and the print facing +z. Tubes stand on their front panel's
    // plane (half a turn about x); trays lie on their base with the walls rising and the front towards the viewer.
    const X = new THREE.Vector3(1, 0, 0);
    c.group.quaternion.copy(
      model.root === "base"
        ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).multiply(new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2))
        : new THREE.Quaternion().setFromAxisAngle(X, Math.PI),
    );
    // The blank is drawn x right, y down, seen from its printed side, which is a mirror image of a
    // right-handed space with the print towards +z: mirroring x puts it right, so print reads correctly.
    c.group.scale.set(-1, 1, 1);
    c.group.updateMatrix();
    // Frame the closed carton when the model's size changes a lot.
    // Frame both the flat blank and the closed carton, from the printed side.
    const box = new THREE.Box3();
    const closedBox = new THREE.Box3();
    for (const k of mini ? [1] : [0, 1]) {
      const mats = pose(model, k);
      model.faces.forEach((f, i) =>
        f.poly.forEach((q) => {
          const v = new THREE.Vector3(...apply(mats[i], q)).applyMatrix4(c.group.matrix);
          box.expandByPoint(v);
          if (k === 1) closedBox.expandByPoint(v);
        }),
      );
    }
    const size = box.getSize(new THREE.Vector3());
    const key = [size.x, size.y, size.z].map((v) => Math.round(v / 10)).join(",");
    if (key !== framed.current && model.faces.length) {
      framed.current = key;
      // Turn about the closed carton's centre; stand far enough back to see the flat blank too.
      const centre = closedBox.getCenter(new THREE.Vector3());
      const r = size.length() / 2;
      c.controls.target.copy(centre);
      c.camera.position.copy(centre).add(new THREE.Vector3(0.9, 0.7, -1.6).normalize().multiplyScalar(r * (mini ? 3.8 : 3)));
      c.camera.near = r / 50;
      c.camera.far = r * 50;
      c.camera.updateProjectionMatrix();
    }
  }, [model, mini, art]);

  // Pose for the slider position.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    const at = mini ? 1 : t;
    const mats = pose(model, at, mini ? 0 : e);
    // The torn-away part fades once it has come clear of the tray.
    const fade = Math.max(0, Math.min(1, (at - 1.3) / 0.2));
    const gone = removedFaces(model);
    c.faces.forEach((o, i) => {
      o.matrix.fromArray(mats[i]);
      o.matrixWorldNeedsUpdate = true;
      const op = gone[i] ? 1 - fade : 1;
      o.visible = op > 0.01;
      o.traverse((x) => {
        if (x instanceof THREE.Mesh || x instanceof THREE.Line) (x.material as THREE.Material).opacity = op;
      });
    });
    // Keep turning about the carton's centre as it folds, without moving the view.
    if (!mini && model.faces.length) {
      const box = new THREE.Box3();
      c.group.updateMatrix();
      model.faces.forEach((f, i) => {
        if (gone[i] && at > 1.3) return;
        f.poly.forEach((q) => box.expandByPoint(new THREE.Vector3(...apply(mats[i], q)).applyMatrix4(c.group.matrix)));
      });
      const centre = box.getCenter(new THREE.Vector3());
      const shift = centre.clone().sub(c.controls.target);
      c.controls.target.add(shift);
      c.camera.position.add(shift);
    }
  }, [model, t, e, mini]);

  /** Centre and radius of the carton as it stands now, in scene coordinates. */
  const sphere = () => {
    const c = ctx.current!;
    const mats = pose(model, t, e);
    const gone = removedFaces(model);
    const box = new THREE.Box3();
    model.faces.forEach((f, i) => {
      if (gone[i] && t > 1.3) return;
      f.poly.forEach((q) => box.expandByPoint(new THREE.Vector3(...apply(mats[i], q)).applyMatrix4(c.group.matrix)));
    });
    return box.getBoundingSphere(new THREE.Sphere());
  };

  const saveAngle = () => {
    const c = ctx.current;
    if (!c) return;
    const sp = sphere();
    const off = c.camera.position.clone().sub(c.controls.target);
    const used = new Set(angles.map((a) => a.name));
    let n = angles.length + 1;
    while (used.has(`Angle ${n}`)) n++;
    const next = [...angles, { name: `Angle ${n}`, dir: off.clone().normalize().toArray(), dist: off.length() / sp.radius, fov: c.camera.fov, t }];
    setAngles(next);
    storeAngles(next);
  };

  const goToAngle = (a: Angle) => {
    const c = ctx.current;
    if (!c) return;
    setT(Math.min(a.t, steps));
    const sp = sphere();
    c.controls.target.copy(sp.center);
    c.camera.fov = a.fov;
    c.camera.position.copy(sp.center).add(new THREE.Vector3(...a.dir).multiplyScalar(a.dist * sp.radius));
    c.camera.updateProjectionMatrix();
    c.controls.update();
  };

  const dropAngle = (name: string) => {
    const next = angles.filter((a) => a.name !== name);
    setAngles(next);
    storeAngles(next);
  };

  /** Renders the current view off screen at print size: the carton alone on transparency, or its depth map. */
  const exportView = async (kind: "product" | "depth") => {
    const c = ctx.current;
    if (!c) return;
    setBusy(kind);
    try {
      const long = Math.min(3000, c.renderer.capabilities.maxTextureSize);
      const aspect = c.camera.aspect;
      const [w, h] = aspect >= 1 ? [long, Math.round(long / aspect)] : [Math.round(long * aspect), long];
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1);
      r.setSize(w, h, false);
      r.setClearColor(0x000000, kind === "depth" ? 1 : 0);
      const cam = c.camera.clone();
      cam.aspect = aspect;
      // Outlines and drawn lines are for the screen only.
      const lines: THREE.Object3D[] = [];
      c.group.traverse((x) => {
        if (x.userData.line && x.visible) {
          lines.push(x);
          x.visible = false;
        }
      });
      if (kind === "depth") {
        const sp = sphere();
        const d = cam.position.distanceTo(sp.center);
        const mat = new THREE.ShaderMaterial({ ...DEPTH, side: THREE.DoubleSide });
        mat.uniforms.near.value = Math.max(0.01, d - sp.radius);
        mat.uniforms.far.value = d + sp.radius;
        c.scene.overrideMaterial = mat;
        r.render(c.scene, cam);
        c.scene.overrideMaterial = null;
        mat.dispose();
      } else r.render(c.scene, cam);
      for (const x of lines) x.visible = true;
      const blob = await new Promise<Blob | null>((res) => r.domElement.toBlob(res, "image/png"));
      r.dispose();
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileBase}-${kind === "product" ? "product" : "depth"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally {
      setBusy(null);
    }
  };

  if (mini) return <div ref={host} className="pointer-events-none relative h-full w-full overflow-hidden" aria-hidden="true" />;

  return (
    <div className="flex h-full min-h-0 flex-col sm:flex-row">
      <div className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing" aria-label={tr("Carton in 3D")} role="img">
          {noGl && <p className="p-4 text-[12px] text-mute">{tr("This browser cannot draw 3D (WebGL is off).")}</p>}
        </div>
        {!noGl && tools && (
          <div className="absolute end-3 top-3 z-10 flex max-w-[70%] flex-col items-end gap-2 text-[13px]">
            <div className="flex flex-wrap justify-end gap-1.5">
              <button type="button" onClick={saveAngle} className="h-9 rounded-md border border-ink bg-paper px-3 font-medium shadow-sm hover:bg-bone">
                {tr("Save angle")}
              </button>
              {(
                [
                  ["product", "Product image"],
                  ["depth", "Depth map"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => exportView(k)} disabled={!!busy} className="flex h-9 items-center gap-1.5 rounded-md bg-ink px-3 font-medium text-paper shadow-sm hover:bg-accent hover:text-ink disabled:opacity-60">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path d="M7 1.5v8M3.5 6l3.5 3.5L10.5 6M2 12.5h10" />
                  </svg>
                  {busy === k ? tr("Rendering…") : tr(l)}
                </button>
              ))}
            </div>
            {onInside && <InsidePicker value={inside} onChange={onInside} />}
            {angles.length > 0 && (
              <ul className="flex flex-wrap justify-end gap-1" aria-label={tr("Saved angles")}>
                {angles.map((a) => (
                  <li key={a.name} className="flex items-center overflow-hidden rounded-full border border-rule bg-paper">
                    <button type="button" onClick={() => goToAngle(a)} className="h-7 ps-3 pe-1.5 hover:text-ink">
                      {a.name}
                    </button>
                    <button type="button" onClick={() => dropAngle(a.name)} aria-label={`${tr("Delete")} ${a.name}`} className="h-7 ps-1 pe-2.5 text-mute hover:text-danger">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t border-rule bg-bone px-4 py-3 sm:w-36 sm:flex-col-reverse sm:items-center sm:border-s sm:border-t-0 sm:px-3 sm:py-5">
        <input
          type="range"
          min={0}
          max={steps * 1000}
          value={Math.round(t * 1000)}
          onChange={(e) => setT(Number(e.target.value) / 1000)}
          aria-label={tr("Fold from flat to closed")}
          className="fold-slider min-w-0 sm:min-h-0 sm:flex-1"
          style={{ ["--fill" as string]: `${(t / steps) * 100}%` }}
        />
        <div className="flex gap-1 rounded-md border border-rule bg-paper p-1 text-[12px] font-medium sm:w-full sm:flex-col-reverse">
          {(model.present ? ["Flat", "Closed", model.present] : ["Flat", "Closed"]).map((l, k) => (
            <button key={l} type="button" onClick={() => setT(k)} className={`h-8 flex-1 whitespace-nowrap rounded px-1 ${Math.abs(t - k) < 0.02 ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
              {tr(l)}
            </button>
          ))}
        </div>
        {model.opener && (
          <div className="flex flex-col gap-2 rounded-md border border-rule bg-paper p-2 sm:w-full">
            <span className="text-[12px] font-medium">{tr(model.opener)}</span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(e * 1000)}
              disabled={t < 0.999}
              onChange={(ev) => setE(Number(ev.target.value) / 1000)}
              aria-label={tr("Open the door")}
              className="fold-slider fold-slider-h w-full disabled:opacity-40"
              style={{ ["--fill" as string]: `${e * 100}%` }}
            />
            <div className="flex gap-1 text-[12px] font-medium">
              {(["Closed", "Open"] as const).map((l, k) => (
                <button key={l} type="button" disabled={t < 0.999} onClick={() => setE(k)} className={`h-7 flex-1 rounded px-1 disabled:opacity-40 ${Math.abs(e - k) < 0.02 ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
                  {tr(l)}
                </button>
              ))}
            </div>
            {t < 0.999 && <span className="text-[11px] leading-snug text-mute">{tr("Close the carton first.")}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Colour of the inside (unprinted) face: a swatch and its hex code. */
function InsidePicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { t } = useLang();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = (v: string) => {
    const hex = (v.startsWith("#") ? v : `#${v}`).toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(hex)) onChange(hex);
    else if (/^#[0-9a-f]{3}$/.test(hex)) onChange(`#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`);
    else setText(value);
  };
  return (
    <label className="flex h-9 items-center gap-2 rounded-md border border-rule bg-paper px-2 shadow-sm">
      <span className="text-[12px] text-mute">{t("Inside")}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={t("Inside colour")} className="h-6 w-7 cursor-pointer rounded border border-rule bg-transparent p-0" />
      <input
        type="text"
        dir="ltr"
        value={text}
        maxLength={7}
        spellCheck={false}
        aria-label={t("Inside colour, hex code")}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value.trim())}
        onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value.trim())}
        className="h-7 w-[76px] rounded border border-rule bg-bone px-1.5 font-mono text-[12px] uppercase"
      />
    </label>
  );
}
