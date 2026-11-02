// The carton in 3D for the film: the app's own folding model (same pieces,
// same hinges, same order), lit for a product shot instead of an editor.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { apply, pose, type Model3D } from "../../../dieline/src/lib/dieline/fold3d";
import type { Dieline } from "../../../dieline/src/lib/dieline/types";

export interface Box3D {
  setFold(t: number): void;
  /** Camera on a sphere round the closed carton: azimuth and elevation in degrees, distance in carton radii. */
  setView(az: number, el: number, dist: number, lift?: number): void;
  render(): void;
  canvas: HTMLCanvasElement;
}

export function createBox(host: HTMLElement, d: Dieline, art: HTMLCanvasElement, opts: { w: number; h: number; inside?: string }): Box3D {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(opts.w, opts.h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-1.2, 2.4, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 0.55));

  const model: Model3D = d.model3d;
  const tex = new THREE.CanvasTexture(art);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pad = 6;
  const x0 = d.bbox.minX - pad;
  const y0 = d.bbox.minY - pad;
  const W = d.bbox.maxX - d.bbox.minX + 2 * pad;
  const H = d.bbox.maxY - d.bbox.minY + 2 * pad;

  const group = new THREE.Group();
  scene.add(group);
  const faces = model.faces.map((f) => {
    const geo = new THREE.ShapeGeometry(new THREE.Shape(f.poly.map((q) => new THREE.Vector2(q.x, q.y))));
    const pos = geo.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let k = 0; k < pos.count; k++) {
      uv[2 * k] = (pos.getX(k) - x0) / W;
      uv[2 * k + 1] = 1 - (pos.getY(k) - y0) / H;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const o = new THREE.Group();
    const front = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -f.layer, polygonOffsetUnits: -f.layer * 4 }),
    );
    const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: opts.inside ?? "#efece4", roughness: 0.9, side: THREE.BackSide }));
    front.castShadow = back.castShadow = true;
    o.add(front, back);
    o.matrixAutoUpdate = false;
    group.add(o);
    return o;
  });
  group.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  group.scale.set(-1, 1, 1);
  group.updateMatrix();

  // Ground that only catches the shadow.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(28, opts.w / opts.h, 1, 50000);

  // Closed carton: centre and radius, and where it stands.
  const closed = new THREE.Box3();
  pose(model, 1).forEach((m, i) => model.faces[i].poly.forEach((q) => closed.expandByPoint(new THREE.Vector3(...apply(m, q)).applyMatrix4(group.matrix))));
  const centre = closed.getCenter(new THREE.Vector3());
  const radius = closed.getBoundingSphere(new THREE.Sphere()).radius;
  ground.position.y = closed.min.y - 0.4;
  key.shadow.camera.left = key.shadow.camera.bottom = -radius * 4;
  key.shadow.camera.right = key.shadow.camera.top = radius * 4;
  key.shadow.camera.far = radius * 20;
  key.position.multiplyScalar(radius * 3).add(centre);
  key.target.position.copy(centre);
  scene.add(key.target);

  let fold = 1;
  const box: Box3D = {
    canvas: renderer.domElement,
    setFold(t) {
      fold = t;
      const mats = pose(model, t);
      faces.forEach((o, i) => {
        o.matrix.fromArray(mats[i]);
        o.matrixWorldNeedsUpdate = true;
      });
      // While flat, the blank lies on the ground; it rises to stand as it closes.
      const b = new THREE.Box3();
      mats.forEach((m, i) => model.faces[i].poly.forEach((q) => b.expandByPoint(new THREE.Vector3(...apply(m, q)).applyMatrix4(group.matrix))));
      group.position.y = closed.min.y - b.min.y;
      group.updateMatrix();
    },
    setView(az, el, dist, lift = 0) {
      const a = (az * Math.PI) / 180;
      const e = (el * Math.PI) / 180;
      const c = centre.clone().add(new THREE.Vector3(0, lift * radius, 0));
      camera.position.set(c.x + Math.sin(a) * Math.cos(e) * radius * dist, c.y + Math.sin(e) * radius * dist, c.z + Math.cos(a) * Math.cos(e) * radius * dist);
      camera.lookAt(c);
      camera.near = radius / 20;
      camera.far = radius * 200;
      camera.updateProjectionMatrix();
    },
    render() {
      void fold;
      renderer.render(scene, camera);
    },
  };
  box.setFold(1);
  box.setView(35, 18, 4.2);
  return box;
}
