// The carton in 3D for the film: the app's own folding model, lit as a
// premium product shot, with exact camera targets on its artwork and a
// depth-map pass (white near, black far).

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { apply, pose, type Model3D } from "../../../dieline/src/lib/dieline/fold3d";
import type { Carton } from "./nutri";

export interface Shot {
  /** Point looked at, as a page position on the artwork (mm) or the carton's centre. */
  at: { x: number; y: number } | "centre";
  /** Camera direction from the target: azimuth / elevation in degrees, relative to that face's normal for artwork targets. */
  az: number;
  el: number;
  /** Distance in mm. */
  dist: number;
  roll?: number;
  fov?: number;
  /** Moves the framing (mm, along the camera's right and up), so the subject sits off centre. */
  shift?: [number, number];
}

export interface Box3D {
  canvas: HTMLCanvasElement;
  setFold(t: number): void;
  setShot(s: Shot): void;
  /** Blend between two shots, k from 0 to 1 (positions and targets interpolated). */
  setBlend(a: Shot, b: Shot, k: number): void;
  render(mode?: "beauty" | "depth"): void;
  radius: number;
  setGround(on: boolean): void;
}

export function createBox(host: HTMLElement, c: Carton, opts: { w: number; h: number; transparent?: boolean }): Box3D {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(opts.w, opts.h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.9;
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 8;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff4e0, 1.1);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbdb7aa, 0.5));

  const model: Model3D = c.model;
  const tex = new THREE.CanvasTexture(c.art.image);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  const group = new THREE.Group();
  scene.add(group);
  const faces = model.faces.map((f) => {
    const geo = new THREE.ShapeGeometry(new THREE.Shape(f.poly.map((q) => new THREE.Vector2(q.x, q.y))));
    const pos = geo.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let k = 0; k < pos.count; k++) {
      uv[2 * k] = (pos.getX(k) - c.art.x0) / c.art.w;
      uv[2 * k + 1] = 1 - (pos.getY(k) - c.art.y0) / c.art.h;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const o = new THREE.Group();
    const front = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -f.layer, polygonOffsetUnits: -f.layer * 4 }));
    const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#efece4", roughness: 0.9, side: THREE.BackSide }));
    front.castShadow = back.castShadow = true;
    o.add(front, back);
    o.matrixAutoUpdate = false;
    group.add(o);
    return o;
  });
  group.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  group.scale.set(-1, 1, 1);
  group.updateMatrix();

  // A soft contact shadow: a blurred dark ellipse under the carton.
  const sc = document.createElement("canvas");
  sc.width = sc.height = 256;
  const sg = sc.getContext("2d")!;
  const rg = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, "rgba(40,36,30,0.55)");
  rg.addColorStop(0.45, "rgba(40,36,30,0.22)");
  rg.addColorStop(1, "rgba(40,36,30,0)");
  sg.fillStyle = rg;
  sg.fillRect(0, 0, 256, 256);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  renderer.shadowMap.enabled = false;

  const camera = new THREE.PerspectiveCamera(30, opts.w / opts.h, 1, 50000);
  const closedMats = pose(model, 1);
  const closed = new THREE.Box3();
  closedMats.forEach((m, i) => model.faces[i].poly.forEach((q) => closed.expandByPoint(new THREE.Vector3(...apply(m, q)).applyMatrix4(group.matrix))));
  const centre = closed.getCenter(new THREE.Vector3());
  const radius = closed.getBoundingSphere(new THREE.Sphere()).radius;
  ground.position.y = closed.min.y + 0.2;
  const foot = closed.getSize(new THREE.Vector3());
  ground.scale.set(foot.x * 2.4, foot.z * 2.4, 1);
  ground.position.x = centre.x;
  ground.position.z = centre.z;
  let groundOn = true;
  let curCentre = centre.clone();
  key.position.set(-1.1, 2.2, 1.7).multiplyScalar(radius * 3).add(centre);
  key.target.position.copy(centre);
  scene.add(key.target);
  Object.assign(key.shadow.camera, { left: -radius * 3, right: radius * 3, top: radius * 3, bottom: -radius * 3, far: radius * 20 });
  rim.position.set(1.6, 1.2, -1.4).multiplyScalar(radius * 3).add(centre);

  const depthMat = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });

  /** World point and outward normal of an artwork position on the closed carton. */
  const inside = (poly: { x: number; y: number }[], p: { x: number; y: number }) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (poly[i].y > p.y !== poly[j].y > p.y && p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) c = !c;
    return c;
  };
  const anchor = (p: { x: number; y: number }) => {
    const i = model.faces.findIndex((f) => inside(f.poly, p));
    const m = closedMats[Math.max(0, i)];
    const P = new THREE.Vector3(...apply(m, p)).applyMatrix4(group.matrix);
    const P2 = new THREE.Vector3(...apply(m, { x: p.x + 1, y: p.y })).applyMatrix4(group.matrix);
    const P3 = new THREE.Vector3(...apply(m, { x: p.x, y: p.y + 1 })).applyMatrix4(group.matrix);
    const u = P2.clone().sub(P).normalize();
    const v = P3.clone().sub(P).normalize();
    let n = u.clone().cross(v).normalize();
    // Outward: away from the carton's centre.
    if (n.dot(P.clone().sub(centre)) < 0) n = n.negate();
    return { P, n, up: v.clone().negate() };
  };

  const place = (s: Shot) => {
    let target: THREE.Vector3, eye: THREE.Vector3, up = new THREE.Vector3(0, 1, 0);
    if (s.at === "centre") {
      target = curCentre.clone();
      const a = THREE.MathUtils.degToRad(s.az), e = THREE.MathUtils.degToRad(s.el);
      eye = target.clone().add(new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(s.dist));
    } else {
      const { P, n, up: faceUp } = anchor(s.at);
      target = P;
      const side = faceUp.clone().cross(n).normalize();
      const dir = n.clone().applyAxisAngle(faceUp, THREE.MathUtils.degToRad(s.az)).applyAxisAngle(side, THREE.MathUtils.degToRad(-s.el)).normalize();
      eye = P.clone().add(dir.multiplyScalar(s.dist));
      up = faceUp;
    }
    if (s.shift) {
      const fwd = target.clone().sub(eye).normalize();
      const right = fwd.clone().cross(up).normalize();
      const u2 = right.clone().cross(fwd).normalize();
      const off = right.multiplyScalar(s.shift[0]).add(u2.multiplyScalar(s.shift[1]));
      target.add(off);
      eye.add(off);
    }
    return { target, eye, up, fov: s.fov ?? 30, roll: s.roll ?? 0 };
  };
  const applyCam = (v: ReturnType<typeof place>) => {
    camera.position.copy(v.eye);
    camera.up.copy(v.up);
    camera.lookAt(v.target);
    if (v.roll) camera.rotateZ(THREE.MathUtils.degToRad(v.roll));
    camera.fov = v.fov;
    const d = camera.position.distanceTo(v.target);
    camera.near = Math.max(0.5, d / 30);
    camera.far = d + radius * 8;
    camera.updateProjectionMatrix();
  };

  const box: Box3D = {
    canvas: renderer.domElement,
    radius,
    setFold(t) {
      const mats = pose(model, t);
      faces.forEach((o, i) => {
        o.matrix.fromArray(mats[i]);
        o.matrixWorldNeedsUpdate = true;
      });
      // Where the carton stands at this fold, with the group at rest; then set on the ground.
      group.position.y = 0;
      group.updateMatrix();
      const b = new THREE.Box3();
      mats.forEach((m, i) => model.faces[i].poly.forEach((q) => b.expandByPoint(new THREE.Vector3(...apply(m, q)).applyMatrix4(group.matrix))));
      group.position.y = closed.min.y - b.min.y;
      group.updateMatrix();
      curCentre = b.getCenter(new THREE.Vector3());
      curCentre.y += group.position.y;
      ground.visible = groundOn && t > 0.85;
      (ground.material as THREE.MeshBasicMaterial).opacity = Math.min(1, Math.max(0, (t - 0.85) / 0.15));
    },
    setGround(on) {
      groundOn = on;
      ground.visible = on;
    },
    setShot(s) {
      applyCam(place(s));
    },
    setBlend(a, b, k) {
      const A = place(a), B = place(b);
      applyCam({ target: A.target.clone().lerp(B.target, k), eye: A.eye.clone().lerp(B.eye, k), up: A.up.clone().lerp(B.up, k).normalize(), fov: A.fov + (B.fov - A.fov) * k, roll: A.roll + (B.roll - A.roll) * k });
    },
    render(mode = "beauty") {
      if (mode === "depth") {
        const near = camera.near, far = camera.far;
        let dn = Infinity, df = 0;
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        for (const o of faces) o.traverse((x) => {
          if (!(x instanceof THREE.Mesh)) return;
          const pos = x.geometry.getAttribute("position");
          for (let k = 0; k < pos.count; k++) {
            const v = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).applyMatrix4(x.matrixWorld).sub(camera.position).dot(fwd);
            dn = Math.min(dn, v);
            df = Math.max(df, v);
          }
        });
        camera.near = Math.max(1, dn - 2);
        camera.far = df + 2;
        camera.updateProjectionMatrix();
        ground.visible = false;
        scene.overrideMaterial = depthMat;
        renderer.setClearColor(0x000000, 1);
        renderer.render(scene, camera);
        scene.overrideMaterial = null;
        renderer.setClearColor(0x000000, 0);
        ground.visible = true;
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
      } else renderer.render(scene, camera);
    },
  };
  box.setFold(1);
  box.setShot({ at: "centre", az: 30, el: 15, dist: radius * 3 });
  return box;
}
