"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { apply, pose, type Model3D } from "@/lib/dieline/fold3d";

const PRINT = "#f7f6f2";
const INSIDE = "#c9b99a";
const EDGE = "#3a3a3a";

/** The carton in 3D, folded from flat (0) to closed (1) with the slider beside it. */
export function Fold3D({ model }: { model: Model3D }) {
  const host = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(1);
  const [noGl, setNoGl] = useState(false);
  const ctx = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    faces: THREE.Object3D[];
  } | null>(null);
  const framed = useRef<string>("");

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
  }, []);

  // Faces, rebuilt whenever the carton changes.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    for (const o of c.faces) {
      c.group.remove(o);
      o.traverse((x) => {
        if (x instanceof THREE.Mesh || x instanceof THREE.LineLoop) x.geometry.dispose();
      });
    }
    c.faces = model.faces.map((f) => {
      const shape = new THREE.Shape(f.poly.map((q) => new THREE.Vector2(q.x, q.y)));
      const geo = new THREE.ShapeGeometry(shape);
      const mat = (color: string, side: THREE.Side) =>
        new THREE.MeshLambertMaterial({ color, side, polygonOffset: true, polygonOffsetFactor: -f.layer, polygonOffsetUnits: -f.layer * 4 });
      const o = new THREE.Group();
      o.add(new THREE.Mesh(geo, mat(PRINT, THREE.FrontSide)), new THREE.Mesh(geo, mat(INSIDE, THREE.BackSide)));
      const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(f.poly.map((q) => new THREE.Vector3(q.x, q.y, 0))), new THREE.LineBasicMaterial({ color: EDGE }));
      o.add(edge);
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
    // Frame the closed carton when the model's size changes a lot.
    // Frame both the flat blank and the closed carton, from the printed side.
    const box = new THREE.Box3();
    for (const k of [0, 1]) {
      const mats = pose(model, k);
      model.faces.forEach((f, i) => f.poly.forEach((q) => box.expandByPoint(new THREE.Vector3(...apply(mats[i], q)).applyQuaternion(c.group.quaternion))));
    }
    const size = box.getSize(new THREE.Vector3());
    const key = [size.x, size.y, size.z].map((v) => Math.round(v / 10)).join(",");
    if (key !== framed.current && model.faces.length) {
      framed.current = key;
      const centre = box.getCenter(new THREE.Vector3());
      const r = size.length() / 2;
      c.controls.target.copy(centre);
      c.camera.position.copy(centre).add(new THREE.Vector3(0.9, 0.7, -1.6).normalize().multiplyScalar(r * 3));
      c.camera.near = r / 50;
      c.camera.far = r * 50;
      c.camera.updateProjectionMatrix();
    }
  }, [model]);

  // Pose for the slider position.
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    const mats = pose(model, t);
    c.faces.forEach((o, i) => {
      o.matrix.fromArray(mats[i]);
      o.matrixWorldNeedsUpdate = true;
    });
  }, [model, t]);

  return (
    <div className="flex h-full min-h-0 flex-col sm:flex-row">
      <div ref={host} className="relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing" aria-label="Carton in 3D" role="img">
        {noGl && <p className="p-4 text-[12px] text-mute">This browser cannot draw 3D (WebGL is off).</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-rule bg-bone px-4 py-3 sm:w-24 sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-2 sm:py-4">
        <span className="font-mono text-[11px] uppercase tracking-wider text-mute sm:order-3">Flat</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(t * 1000)}
          onChange={(e) => setT(Number(e.target.value) / 1000)}
          aria-label="Fold from flat to closed"
          className="fold-slider h-8 flex-1 accent-[#1a1a1a] sm:order-2 sm:h-auto sm:w-8 sm:flex-1"
        />
        <span className="font-mono text-[11px] uppercase tracking-wider text-mute sm:order-1">Closed</span>
      </div>
    </div>
  );
}
