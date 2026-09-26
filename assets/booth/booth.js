/* The Evolab stand, on a turntable.

   One model, three behaviours:
     · it builds itself from the floor up on load (a rising clip plane),
     · it turns, but only across the open front — the back of a stand is a
       closed wall and has nothing to show, so the swing is clamped,
     · every part of it answers a hover with what that part demonstrates;
       the lit niche, the green shelving, the Xyline roll-up, the screen and
       the desk also turn to face the viewer while hovered, and a click opens
       a close-up behind a lens (on the desk, with arrows from flyer to flyer).

   The hover zones are boxes in the model's own coordinates rather than
   material or mesh names. The file is compressed for the web, and that
   pass merges materials freely; a box drawn around the arch is still the
   arch whatever the optimiser did to it. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const hero  = document.getElementById('hero');
const stage = document.getElementById('stage');
if (hero && stage) init();

function init(){
  const params = new URLSearchParams(location.search);
  const POSTER = params.has('poster');                       // clean still for the fallback image
  const calm = POSTER || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LITE = matchMedia('(pointer: coarse), (max-width: 860px)').matches;

  /* ---- words ------------------------------------------------------------
     The labels live here rather than in the page, so the Arabic page gets
     them from the same table: the English string is the key. Anything not
     listed falls through unchanged (product names stay in Latin, as they
     are printed on the cartons). */
  const AR = document.documentElement.lang === 'ar' ? {
    'Packaging · Xyline': 'التغليف · Xyline',
    'Doxycycline 100 mg. One carton system for the Evolab range, built to read on the shelf and across the aisle.':
      'دوكسيسيكلين 100 ملغ. نظام علب واحد لمجموعة Evolab، مصمَّم ليُقرأ على الرفّ ومن آخر الممرّ.',
    'Click to look closer': 'انقر للاقتراب',
    'Campaigns · Film': 'الحملات · الفيلم',
    'Films and screen content for the launch, produced by the in-house film department.':
      'أفلام ومحتوى للشاشات خاصّ بالإطلاق، من إنتاج قسم الأفلام الداخلي.',
    'Identity': 'الهوية',
    'The arch carries the Evolab mark and the campaign line across the whole stand.':
      'يحمل القوس شعار Evolab وعبارة الحملة على امتداد الجناح كلّه.',
    'Campaigns · Xyline': 'الحملات · Xyline',
    'The Xyline launch roll-up: the carton\u2019s system carried to print at full height.':
      'لافتة إطلاق Xyline: نظام العلبة منقولًا إلى الطباعة بالطول الكامل.',
    'Campaigns · Flyers': 'الحملات · المطويات',
    'Leaflets for the range, one for each product: one system from the carton to the counter.':
      'مطويات للمجموعة، واحدة لكل منتج: نظام واحد من العلبة إلى المنضدة.',
    'Campaigns · Stand': 'الحملات · الجناح',
    'The stand as part of the launch — carried from 3D renders to the on-site build.':
      'الجناح جزء من الإطلاق — من التصاميم ثلاثية الأبعاد إلى التركيب في الموقع.',
    'Evolab exhibition stand. Use the arrow keys to turn it.': 'جناح Evolab في المعرض. استخدم مفاتيح الأسهم لتدويره.',
    'Tap anywhere to go back': 'المس أيّ مكان للعودة'
  } : null;
  const tr = s => (AR && AR[s]) || s;

  /* ---- zones, in model units (metres), before centring --------------- */
  const ZONES = [
    { id:'shelf',     k:'Packaging · Xyline', v:'Doxycycline 100 mg. One carton system for the Evolab range, built to read on the shelf and across the aisle.',
      go:'Click to look closer',                              // the green shelving by the entrance; opens the niche's centre carton
      box:[[1.05, 0.0, -2.8], [1.6, 2.15, -1.7]] },
    { id:'film',      k:'Campaigns · Film', v:'Films and screen content for the launch, produced by the in-house film department.',
      go:'Click to look closer',
      box:[[10.85, 0.75, -5.2], [11.45, 2.4, -2.35]] },
    { id:'identity',  k:'Identity',  v:'The arch carries the Evolab mark and the campaign line across the whole stand.',
      box:[[1.35, 2.85, -5.75], [11.05, 4.5, -1.7]] },
    { id:'carton',    k:'Packaging · Xyline', v:'Doxycycline 100 mg. One carton system for the Evolab range, built to read on the shelf and across the aisle.',
      go:'Click to look closer', box:null },                  // the lit niche and its shelves; its box is found at load
    { id:'rollup',    k:'Campaigns · Xyline', v:'The Xyline launch roll-up: the carton\u2019s system carried to print at full height.',
      go:'Click to look closer', box:null },                  // the Xyline roll-up banner; found at load
    { id:'desk',      k:'Campaigns · Flyers', v:'Leaflets for the range, one for each product: one system from the carton to the counter.',
      go:'Click to look closer', box:null },                  // the reception desk and its flyers; found at load
    { id:'space',     k:'Campaigns · Stand', v:'The stand as part of the launch — carried from 3D renders to the on-site build.',
      box:null }                                               // everything else
  ];

  /* ---- lighting ---------------------------------------------------------
     Every light in one place. These are the values tuned and saved in the
     lighting board on 26 Sept 2026 (01:32); hero.booth.set() changes them live. glow > 0 turns on a bloom
     pass, built on first use so a page that never glows never loads it. */
  const LIGHT_DEFAULTS = {
    exposure: 0.2,     // overall brightness (tone-mapping exposure)
    environment: 0.98, // soft reflected light from all around
    sun: 6.1,          // key light from front-left, casts the shadows
    fill: 1.84,        // sky/ground fill
    ceiling: 5.15,     // area light under the ceiling panel
    spots: 1.95,       // the six spotlights on the front pillars
    ceilingGlow: 3.81, // how bright the ceiling panel itself looks
    banner: 6.64,      // the upper (arch) banner
    prints: 4.24,      // the other self-lit graphics
    led: 8,            // LED lines
    counter: 2.37,     // the desk's self-lit blue core
    niche: 0.65,       // the lit panel at the back of the niche
    crosses: 0.06,     // visibility of the printed crosses on the niche's ring (0–1)
    screen: 4,         // the screen image
    flyers: 2.2,       // the flyers' print, lit from within so every cover reads
    shadow: 0.03,      // strength of the stand's shadow on the page
    turnLeft: 30,      // how far a drag can turn the stand to the left, degrees
    turnRight: 30,     // …and to the right
    glow: 0,           // bloom strength (0 = off)
    glowThreshold: 1.5,// how bright a surface must be to glow
    glowRadius: 0.4    // how far the glow spreads
  };
  const L = Object.assign({}, LIGHT_DEFAULTS, window.BOOTH_LIGHTS || {});

  /* ---- renderer -------------------------------------------------------- */
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:POSTER });
  }catch(e){ return; }                                        // the poster image stays up
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, POSTER ? 2 : LITE ? 1.75 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = L.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);                        // the hero's own background shows through
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', tr('Evolab exhibition stand. Use the arrow keys to turn it.'));
  stage.prepend(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = L.environment;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);

  const key = new THREE.DirectionalLight(0xffffff, L.sun);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const fill = new THREE.HemisphereLight(0xffffff, 0xdadada, L.fill);     // white light only
  scene.add(fill);
  let panel = null, spots = [], floor = null;
  const crossMats = [];
  const glowMats = { ceilingGlow:[], banner:[], prints:[], led:[], counter:[], niche:[], screen:[], flyers:[] };
  const PRINTS = ['3Artboard 1', '3Artboard 1 copy', 'transArtboard 1', 'Triangle', 'Triangle 2', 'Triangle 3'];

  /* the turntable: everything that turns lives under this */
  const table = new THREE.Group();
  scene.add(table);

  /* the cut that rises through the model while it builds */
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

  let model = null, size = new THREE.Vector3(), radius = 1, frameR = 1;
  const CARTON = ZONES.findIndex(z => z.id === 'carton'), ROLLUP = ZONES.findIndex(z => z.id === 'rollup'),
        FILM = ZONES.findIndex(z => z.id === 'film'), SHELF = ZONES.findIndex(z => z.id === 'shelf'),
        DESK = ZONES.findIndex(z => z.id === 'desk');
  const SHELF_N = new THREE.Vector3(1, 0, 0);                 // the shelving faces into the stand
  const DESK_N = new THREE.Vector3(0, 0, 1);                  // the desk faces the aisle
  const offset = new THREE.Vector3();                         // model units → centred
  const zoneBoxes = [];                                       // centred Box3 per zone
  let whole = new THREE.Box3();

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(new URL('evolab-booth.glb', import.meta.url).href, onLoad, undefined, () => {
    canvas.remove();                                          // keep the poster
  });

  function onLoad(gltf){
    model = gltf.scene;
    const b = new THREE.Box3().setFromObject(model);
    b.getSize(size);
    const c = b.getCenter(new THREE.Vector3());
    offset.set(-c.x, -b.min.y, -c.z);
    model.position.copy(offset);

    /* the ceiling and its light panel sit at 2.8 m */
    const mb = new THREE.Box3();
    model.updateMatrixWorld(true);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    model.traverse(o => {
      if (!o.isMesh) return;
      mb.setFromObject(o);
      const mn = (Array.isArray(o.material) ? o.material[0] : o.material).name || '';
      o.castShadow = mn !== 'CeilingLight';                     // the ceiling slab shades, its light panel doesn't
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        m.clippingPlanes = [clip]; m.clipShadows = true;
        const g = m.name === 'CeilingLight' ? 'ceilingGlow' : m.name === 'Material10' ? 'led'
                : m.name === 'DeskCore' ? 'counter' : m.name === 'NicheLight' ? 'niche'
                : m.name === 'ScreenLight' ? 'screen' : m.name === 'Untitled-1' ? 'banner'
                : PRINTS.includes(m.name) ? 'prints'
                : m.name.startsWith('Flyer') && m.emissiveMap ? 'flyers' : null;
        /* frosted glass and the print on it must not hide what stands behind */
        if (m.transparent) m.depthWrite = false;
        if (g && !glowMats[g].includes(m)) glowMats[g].push(m);
        if (m.name === 'NicheCrosses' && !crossMats.includes(m)) crossMats.push(m);
        /* the exported normals on flat surfaces point away from the room, so
           walls ignore every light; on untextured surfaces derive them from the
           geometry instead (flat shading), which always faces the viewer */
        if (!m.map && !m.transparent) { m.flatShading = true; m.needsUpdate = true; }
        /* printed graphics are seen small and at an angle: full mip chain and
           anisotropic filtering, or fine lines in the prints break into dots */
        for (const k of ['map', 'emissiveMap']){
          const t = m[k]; if (!t) continue;
          t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
          t.generateMipmaps = true; t.anisotropy = maxAniso; t.needsUpdate = true;
        }
      });
    });
    table.add(model);
    buildNiche();

    /* the ceiling panel lights the stand: a soft area light the size of the
       glowing panel, just under it, facing down. It lives in the model so it
       turns with the stand. */
    RectAreaLightUniformsLib.init();
    panel = new THREE.RectAreaLight(0xffffff, L.ceiling, 7.4, 4.2);
    panel.position.set(4.35, 2.76, -4.26);
    panel.lookAt(4.35, 0, -4.26);
    model.add(panel);

    /* the six spotlights on the front pillars, three a side at 3.3 m, each a
       real spot aimed into the stand, fanned across the back wall */
    const LENSES = [[1.52,-1.12,3.0],[1.52,-1.39,4.4],[1.52,-1.68,5.8],[10.93,-1.12,9.4],[10.93,-1.39,8.0],[10.93,-1.68,6.6]];
    spots = LENSES.map(([x, z, tx]) => {
      const sp = new THREE.SpotLight(0xffffff, 0, 0, 0.42, 0.65, 2);
      sp.position.set(x, 3.3, z);
      sp.target.position.set(tx, 0.9, -5.8);
      model.add(sp, sp.target);
      return sp;
    });

    radius = Math.hypot(size.x, size.z) / 2;
    whole.setFromObject(model);
    ZONES.forEach(z => {
      zoneBoxes.push(z.box
        ? new THREE.Box3(new THREE.Vector3(...z.box[0]).add(offset), new THREE.Vector3(...z.box[1]).add(offset))
        : whole.clone());
    });

    /* no visible ground: only the stand's shadow, on the hero's own background */
    floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 3, 96), new THREE.ShadowMaterial({ opacity:L.shadow }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    floor.receiveShadow = true;
    scene.add(floor);

    const s = radius * 2.4;
    key.position.set(-radius * .9, radius * 2.2, radius * 1.4);
    Object.assign(key.shadow.camera, { left:-s, right:s, top:s, bottom:-s, near:.1, far:radius * 8 });
    key.shadow.camera.updateProjectionMatrix();

    applyLights();
    frameR = Math.max(radius * 1.12, size.y * 1.1);
    buildBrackets();
    resize();
    clip.constant = calm ? size.y + 1 : -0.01;
    buildStart = performance.now();
    hero.classList.add('gl-ready');
    kick();
  }

  /* ---- live lighting -------------------------------------------------- */
  let composer = null, bloom = null, composerLoading = null;
  function applyLights(){
    renderer.toneMappingExposure = L.exposure;
    scene.environmentIntensity = L.environment;
    key.intensity = L.sun;
    fill.intensity = L.fill;
    if (panel) panel.intensity = L.ceiling;
    spots.forEach(sp => { sp.intensity = L.spots * 18; });    // candela
    if (floor) floor.material.opacity = L.shadow;
    crossMats.forEach(m => { m.opacity = L.crosses; m.visible = L.crosses > 0.001; });
    MIN = REST - L.turnLeft * Math.PI / 180; MAX = REST + L.turnRight * Math.PI / 180;
    for (const g in glowMats) glowMats[g].forEach(m => { m.emissiveIntensity = L[g]; });
    if (L.glow > 0 && !composer && !composerLoading) composerLoading = buildComposer();
    if (bloom){ bloom.strength = L.glow; bloom.threshold = L.glowThreshold; bloom.radius = L.glowRadius; }
  }
  async function buildComposer(){
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js')
    ]);
    /* multisampled target: without it the composer loses antialiasing and
       thin lines break into dashes */
    const target = new THREE.WebGLRenderTarget(1, 1, { type:THREE.HalfFloatType, samples:4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), L.glow, L.glowRadius, L.glowThreshold);
    /* the stock composite adds alpha as well as light, which makes every
       transparent pixel opaque black; add light only and keep the alpha */
    Object.assign(bloom.blendMaterial, {
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor
    });
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    resize();
    kick();
  }
  /* The close-up's backdrop. At rest the stand floats on the page, so the
     canvas is clear; but a close-up can look past the edge of the model -
     beyond the last wall, below the platform - and there it showed the page
     itself, as a hard white edge through an otherwise out-of-focus room. So
     as the camera flies in, the empty space fills with a soft hall grey,
     which the lens then blurs with everything else. */
  const BACKDROP = new THREE.Color(0xD9D8D4), _cc = new THREE.Color();
  function draw(){
    renderer.setClearColor(BACKDROP, focus.c >= 0 ? easeIO(focus.t) : 0);
    if (lens && focus.c >= 0 && focus.t > 0 && focus.target.blur > 0) lens.render(smooth(0.3, 1, focus.t) * focus.target.blur);
    else if (composer && L.glow > 0) composer.render();
    else renderer.render(scene, camera);
  }
  hero.booth = {
    defaults: Object.assign({}, LIGHT_DEFAULTS),
    get: () => Object.assign({}, L),
    set(patch){ Object.assign(L, patch); applyLights(); kick(); },
    /* debug: page position of the desk's front, at its flyers' height */
    desk(){
      const r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
      flyers[3].box.getCenter(v); table.localToWorld(v).project(camera);
      return [Math.round(r.left + (v.x + 1) / 2 * r.width), Math.round(r.top + (1 - v.y) / 2 * r.height)];
    },
    /* debug: page position of the green shelving's centre */
    shelf(){
      const r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
      zoneBoxes[SHELF].getCenter(v); table.localToWorld(v).project(camera);
      return [Math.round(r.left + (v.x + 1) / 2 * r.width), Math.round(r.top + (1 - v.y) / 2 * r.height)];
    },
    /* debug: page position of the roll-up banner's (or the screen's) centre */
    rollup(screen){
      const r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
      (screen ? SCREEN : BANNER).box.getCenter(v); table.localToWorld(v).project(camera);
      return [Math.round(r.left + (v.x + 1) / 2 * r.width), Math.round(r.top + (1 - v.y) / 2 * r.height)];
    },
    /* debug: page position of the packaging zone's centre */
    packaging(){
      const r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
      niche.getCenter(v); v.z = niche.max.z; table.localToWorld(v).project(camera);
      return [Math.round(r.left + (v.x + 1) / 2 * r.width), Math.round(r.top + (1 - v.y) / 2 * r.height)];
    },
    /* debug: material names under a page point, nearest first */
    pick(x, y){
      const r = canvas.getBoundingClientRect(), rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
      return model ? rc.intersectObject(model, true).slice(0, 5).map(h => (Array.isArray(h.object.material) ? h.object.material[0] : h.object.material).name) : [];
    }
  };
  hero.dispatchEvent(new CustomEvent('booth:ready'));

  /* ---- zone brackets: fluorescent green corner ticks around the hovered part */
  const bracketMat = new THREE.LineBasicMaterial({ color:0x39FF14, transparent:true, opacity:0, depthTest:false, toneMapped:false });   // untouched by the exposure, so it stays bright
  let brackets = null;
  function buildBrackets(){
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8 * 3 * 2 * 3), 3));
    brackets = new THREE.LineSegments(geo, bracketMat);
    brackets.renderOrder = 10;
    brackets.frustumCulled = false;
    table.add(brackets);
  }
  function fitBrackets(box){
    const p = brackets.geometry.attributes.position, a = box.min, b = box.max;
    const L = Math.min(b.x - a.x, b.y - a.y, b.z - a.z, 1.2) * 0.35 + 0.12;
    let i = 0;
    for (const x of [a.x, b.x]) for (const y of [a.y, b.y]) for (const z of [a.z, b.z]){
      const sx = x === a.x ? 1 : -1, sy = y === a.y ? 1 : -1, sz = z === a.z ? 1 : -1;
      for (const [dx, dy, dz] of [[L*sx,0,0],[0,L*sy,0],[0,0,L*sz]]){
        p.setXYZ(i++, x, y, z); p.setXYZ(i++, x + dx, y + dy, z + dz);
      }
    }
    p.needsUpdate = true;
  }

  /* ---- sizing ----------------------------------------------------------- */
  /* eye level: a visitor standing in the aisle, eyes at 1.65 m, looking a
     touch up so the arch and the pillars stay in frame */
  const EYE = 1.65;
  /* Side by side, the canvas runs under the whole hero, copy included, to
     the window's right edge: the stand is anchored at its bottom-left (floor on
     the button's bottom line, left side at the column's start) and grows up
     and to the right, past the right margin if it needs to.
     Narrow layouts (stand below the copy) use the column as it is. */
  const stacked = matchMedia('(max-width: 860px), (max-aspect-ratio: 4/5)');
  /* Right to left, the page mirrors: the copy takes the right-hand column
     and the stand the left, so the stand is anchored by its right side and
     grows to the left. The canvas already spans the whole hero either way;
     only which edge meets the gap before the copy changes. */
  const MIRROR = getComputedStyle(hero).direction === 'rtl';
  const edge = (bleed, sw) => MIRROR ? bleed + sw * 1.07 : bleed - sw * 0.07;
  const GROW = 1.2;                                           // side by side, vs. fitting the column
  let canvasOffset = 0;                                       // canvas left minus stage left, px
  function place(d, look){
    camera.position.set(0, EYE, d);
    camera.lookAt(look);
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  function resize(){
    const sw = stage.clientWidth, h = stage.clientHeight;
    if (!sw || !h) return;
    const sl = stage.getBoundingClientRect().left;
    const bleed = stacked.matches ? 0 : Math.max(0, sl - hero.getBoundingClientRect().left);  // the whole hero, so the close-up fills it
    const w = stacked.matches ? sw : Math.max(sw, Math.round(innerWidth - sl + bleed));
    canvasOffset = -bleed;
    canvas.style.width = w + 'px';
    canvas.style.left = canvasOffset + 'px';
    renderer.setSize(w, h, false);
    if (composer){ composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    camera.aspect = w / h;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const refAspect = stacked.matches ? camera.aspect : Math.round(innerWidth * 7 / 12) / h;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * refAspect);
    const look = new THREE.Vector3(0, size.y * 0.42, 0);
    const fitW = frameR / Math.tan(hfov / 2);
    const fitH = (size.y * 0.62) / Math.tan(vfov / 2);
    let d = Math.max(fitW, fitH) * (refAspect < 1 ? 1.08 : 1.0) + radius * 0.1;
    place(d, look);
    if (model && !stacked.matches){
      /* grow, but keep the right side a gutter inside the window */
      const r = extent(w, h);
      const anchor = edge(bleed, sw);
      const room = MIRROR ? anchor - 24 : w - 24 - anchor;
      const k = Math.min(GROW, room / (r.maxX - r.minX));
      d /= k;
      place(d, look);
    }
    rest.pos.copy(camera.position); rest.look.copy(look);
    rest.w = w; rest.h = h; rest.ox = rest.oy = 0;
    rest.cx = w / 2 - (bleed + sw / 2);                       // centres the stage's middle
    compose(w, h, edge(bleed, sw));                           // into the gap before the copy
    applyCamera();
    kick();
  }

  /* the stand's box at rest, projected: canvas px */
  function extent(w, h){
    const c = new THREE.Vector3(), rot = new THREE.Matrix4().makeRotationY(REST);
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const x of [-size.x/2, size.x/2]) for (const y of [0, size.y]) for (const z of [-size.z/2, size.z/2]){
      c.set(x, y, z).applyMatrix4(rot).project(camera);
      const px = (c.x + 1) / 2 * w, py = (1 - c.y) / 2 * h;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
    }
    return { minX, maxX, maxY };
  }

  /* Composition, side by side: the stand's floor sits on the line where the
     button ends, so text and stand share a bottom edge, and its left side
     sits at the column's start. Done by panning the view (setViewOffset), so
     the eye-level perspective is untouched. */
  const cta = hero.querySelector('.bh-cta');
  function compose(w, h, anchor){
    if (!model || stacked.matches || !cta) return;
    const r = extent(w, h);
    const cr = canvas.getBoundingClientRect(), br = cta.getBoundingClientRect();
    const dy = r.maxY - (br.bottom - cr.top);                  // floor onto the button's bottom
    rest.ox = (MIRROR ? r.maxX : r.minX) - anchor;             // the copy-side edge onto the anchor
    rest.oy = dy;
  }
  new ResizeObserver(resize).observe(stage);
  addEventListener('resize', resize);

  /* ---- turning -----------------------------------------------------------
     yaw is the table's rotation. REST shows the stand three-quarter on,
     the side with the screen toward the viewer. The range is the open front
     only; past it the table pulls back like a rubber band. */
  const REST = -0.1;
  let MIN = REST - L.turnLeft * Math.PI / 180, MAX = REST + L.turnRight * Math.PI / 180;
  let yaw = calm ? REST : REST + 0.55, target = REST, vel = 0;
  let downSpot = null, dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, moved = 0, lastInput = -1e9;

  /* the stops are hard: a drag may push past them by GIVE at most, and
     springs back on release */
  const GIVE = 5 * Math.PI / 180;
  const clampYaw = v => Math.min(MAX + GIVE, Math.max(MIN - GIVE, v));

  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    /* capture, so the release is heard even outside the stage or the frame */
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    dragging = true; moved = 0;
    downSpot = e.target.closest ? e.target.closest('.bh-spot') : null;
    lastX = downX = e.clientX; lastY = downY = e.clientY;
    vel = 0;
    stage.classList.add('dragging');
    hero.classList.add('touched');
    lastInput = performance.now();
    kick();
  });
  addEventListener('pointermove', e => {
    if (dragging){
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved = Math.max(moved, Math.abs(e.clientX - downX), Math.abs(e.clientY - downY));
      if (focus.on){
        if (e.pointerType === 'touch'){                         // on touch, a drag orbits
          const dy = e.clientY - lastY; lastY = e.clientY;
          focus.tyaw = THREE.MathUtils.clamp(focus.tyaw - dx * 0.004, -ORBIT_YAW, ORBIT_YAW);
          focus.tpitch = THREE.MathUtils.clamp(focus.tpitch + dy * 0.004, -ORBIT_PITCH, ORBIT_PITCH);
          kick(); return;
        }
      } else {
        let step = dx * 0.0065;
        if (target < MIN || target > MAX) step *= 0.35;       // resistance past the stops
        target = clampYaw(target + step);
        vel = step;
        lastInput = performance.now();
        kick();
      }
    }
    /* with a mouse, the close-up turns to follow the pointer across the hero */
    if (focus.on && e.pointerType !== 'touch'){
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width * 2 - 1, ny = (e.clientY - r.top) / r.height * 2 - 1;
      focus.tyaw = THREE.MathUtils.clamp(nx, -1, 1) * ORBIT_YAW;
      focus.tpitch = -THREE.MathUtils.clamp(ny, -1, 1) * ORBIT_PITCH;
      kick();
    }
    pointer(e);
  });
  function endDrag(e, click){
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('dragging');
    if (click && moved < 6){
      if (focus.on) leaveFocus();
      else {
        if (downSpot) spotHover(+downSpot.dataset.zone);       // a dot answers for its zone
        else if (e.pointerType === 'touch') hitTest(e.clientX, e.clientY);
        if (!openZone(hover) && e.pointerType === 'touch') setHover(null);
      }
    }
    downSpot = null;
    if (calm) vel = 0;
    kick();
  }
  function openZone(i){
    if (i === CARTON) enterFocus(FOCUS);
    else if (i === SHELF) enterFocus(SHELF_BOX);
    else if (i === DESK && flyers.length){
      let k = 0, bd = Infinity;                                // the flyer nearest the click
      flyers.forEach((f, n) => { const d = f.box.min.distanceTo(lastHit); if (d < bd){ bd = d; k = n; } });
      enterFocus(flyers[k]);
    }
    else if (i === ROLLUP) enterFocus(BANNER);
    else if (i === FILM && SCREEN.mesh) enterFocus(SCREEN);
    else return false;
    return true;
  }
  addEventListener('pointerup', e => endDrag(e, true));
  addEventListener('pointercancel', e => endDrag(e, false));
  stage.addEventListener('lostpointercapture', e => endDrag(e, false));
  addEventListener('blur', e => endDrag(e, false));
  stage.addEventListener('pointerleave', () => { if (!dragging) setHover(null); });

  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight'){
      target = THREE.MathUtils.clamp(target + (e.key === 'ArrowLeft' ? -0.2 : 0.2), MIN, MAX);
      lastInput = performance.now();
      hero.classList.add('touched');
      e.preventDefault(); kick();
    }
  });
  /* any click outside the stage, or Esc, leaves the close-up too */
  addEventListener('pointerdown', e => { if (focus.on && !stage.contains(e.target)) leaveFocus(); }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') leaveFocus(); });

  function goWork(){
    const work = document.getElementById('work');
    if (work) work.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block:'start' });
    else location.hash = 'work';
  }
  document.querySelectorAll('[data-go-work]').forEach(a => a.addEventListener('click', e => {
    if (document.getElementById('work')){ e.preventDefault(); goWork(); }
  }));

  /* ---- the packaging zone ---------------------------------------------
     The centre of the stand — the lit niche with its shelves — answers as
     the packaging, so the pointer needn't find one small box. Wherever it is
     clicked, the close-up goes to the same carton: the middle one on the
     niche's middle shelf (3DGeom-251 in the source file, laid on top of its
     row by the build, at half its source depth). Model units, before centring. */
  const FOCUS = {
    box:new THREE.Box3(new THREE.Vector3(6.3395, 1.5475, -6.815), new THREE.Vector3(6.5075, 1.6375, -6.7555)),
    n:new THREE.Vector3(0, 0, 1),                             // it faces into the stand
    W:0.165, H:0.087,
    fillH:0.34, fillW:0.46, tilt:0.06, orbit:true, spread:true,
    blur:1                                                    // lens strength, 0–1
  };
  /* the green shelving's own close-up carton: the second from the front on
     its second shelf from the top (3DGeom-263), laid on top of its row */
  const SHELF_BOX = Object.assign({}, FOCUS, {
    box:new THREE.Box3(new THREE.Vector3(1.2533, 0.9068, -2.2592), new THREE.Vector3(1.3122, 0.9962, -2.0918)),
    n:new THREE.Vector3(1, 0, 0)                              // it faces into the stand, across it
  });
  /* the Xyline roll-up: seen straight on, near full height, no orbit; its
     own mesh is the lens mask. Box, normal and size are read at load. */
  const BANNER = {
    box:new THREE.Box3(), n:new THREE.Vector3(), W:1, H:1, mesh:null,
    fillH:0.8, fillW:0.8, tilt:0, orbit:false, spread:false, blur:1 / 3,
    clear:0.45                                                // metres kept in front of it; nearer things (a chair) are cut away
  };
  /* the screen: straight on, filling most of the stage's width */
  const SCREEN = {
    box:new THREE.Box3(), n:new THREE.Vector3(), W:1, H:1, mesh:null,
    fillH:0.62, fillW:0.72, tilt:0, orbit:false, spread:false,
    blur:1 / 3
  };
  /* the six flyers on the reception desk, left to right, from the build
     (flyers.json): each stands half open; the close-up faces its cover.
     Model units, before centring. */
  const DESK_FLYERS = [{"set":"Esoprotect","fold":[4.9293,-1.2571],"y":[0.93,1.14],"panels":[{"c":[5.0032,1.035,-1.2373],"n":[-0.2588,0.9659],"w":0.1531,"h":0.21,"cover":true},{"c":[4.9961,1.035,-1.2827],"n":[-0.3576,-0.9339],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Xyline","fold":[5.0986,-1.3799],"y":[0.93,1.14],"panels":[{"c":[5.1726,1.035,-1.3997],"n":[0.2588,0.9659],"w":0.1531,"h":0.21,"cover":true},{"c":[5.1437,1.035,-1.4354],"n":[-0.7766,-0.63],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Lansoprotect","fold":[5.3211,-1.4715],"y":[0.93,1.14],"panels":[{"c":[5.3594,1.035,-1.4053],"n":[-0.866,0.5],"w":0.1531,"h":0.21,"cover":true},{"c":[5.3864,1.035,-1.4424],"n":[0.4075,-0.9132],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Evofenid","fold":[6.3799,-1.4715],"y":[0.93,1.14],"panels":[{"c":[6.4182,1.035,-1.5378],"n":[0.866,0.5],"w":0.1531,"h":0.21,"cover":true},{"c":[6.3725,1.035,-1.5427],"n":[-0.9946,0.1037],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Evomisil","fold":[6.6024,-1.3799],"y":[0.93,1.14],"panels":[{"c":[6.6763,1.035,-1.3601],"n":[-0.2588,0.9659],"w":0.1531,"h":0.21,"cover":true},{"c":[6.6692,1.035,-1.4054],"n":[-0.3576,-0.9339],"w":0.1431,"h":0.21,"cover":false}]},{"set":"One","fold":[6.7717,-1.2571],"y":[0.93,1.14],"panels":[{"c":[6.8456,1.035,-1.2769],"n":[0.2588,0.9659],"w":0.1531,"h":0.21,"cover":true},{"c":[6.8168,1.035,-1.3127],"n":[-0.7766,-0.63],"w":0.1431,"h":0.21,"cover":false}]}];
  const flyers = [];
  /* the desk: its frosted top and body, with the flyers on it */
  const desk = new THREE.Box3(new THREE.Vector3(4.78, 0.1, -1.72), new THREE.Vector3(6.98, 1.16, -1.1));
  const niche = new THREE.Box3();
  /* in the close-up the cartons part along their shelves, so each stands
     clear of its neighbours: the build stores each carton's step in _SPREAD */
  const SPREAD_STEP = 0.06;                                   // metres between neighbours, fully open
  const spread = { value:0 };
  let spreadUnit = 0;                                         // one metre in the carton mesh's own units
  function buildNiche(){
    model.traverse(o => {
      const m = o.isMesh && (Array.isArray(o.material) ? o.material[0] : o.material);
      if (!m || m.name !== 'XylineBox' || !o.geometry.attributes._spread) return;
      spreadUnit = 1 / new THREE.Vector3().setFromMatrixScale(o.matrixWorld).x;
      m.onBeforeCompile = sh => {
        sh.uniforms.uSpread = spread;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', 'attribute vec2 _spread;\nuniform float uSpread;\n#include <common>')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.xz += _spread * uSpread;');
      };
      m.needsUpdate = true;
    });
    FOCUS.box.translate(offset); SHELF_BOX.box.translate(offset);
    table.updateMatrixWorld(true);
    const inv = table.matrixWorld.clone().invert(), b = new THREE.Box3();
    model.traverse(o => {
      if (!o.isMesh || (Array.isArray(o.material) ? o.material[0] : o.material).name !== 'NicheLight') return;
      o.geometry.computeBoundingBox();
      niche.union(b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(inv));
    });
    niche.union(FOCUS.box);

    /* the desk flyers as close-up targets; each carries a two-panel mesh
       of its own, never drawn, that masks it in the lens */
    for (const f of DESK_FLYERS){
      const cov = f.panels.find(p => p.cover);
      const pos = [], idx = [];
      for (const p of f.panels){
        const c = new THREE.Vector3(...p.c).add(offset), r = new THREE.Vector3(p.n[1], 0, -p.n[0]);
        const b = pos.length / 3;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
          pos.push(c.x + r.x * sx * p.w / 2, c.y + sy * p.h / 2, c.z + r.z * sx * p.w / 2);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const mesh = new THREE.Mesh(g); mesh.visible = false; table.add(mesh);
      const at = new THREE.Vector3(...cov.c).add(offset);
      const t = {
        box:new THREE.Box3(at.clone(), at.clone()), n:new THREE.Vector3(cov.n[0], 0, cov.n[1]),
        W:cov.w, H:cov.h, mesh, name:f.set, flyer:true,
        fillH:0.6, fillW:0.6, tilt:0.04, orbit:false, spread:false, blur:1,   // held still, face on
        clear:0.08                                            // its neighbours on the desk stand close; anything in front is cut away
      };
      flyers.push(t);
    }
    desk.translate(offset);

    /* flat targets: box, facing and size from their own quad */
    for (const [t, name] of [[BANNER, 'Rollup2'], [SCREEN, 'ScreenLight']]){
      model.traverse(o => {
        if (o.isMesh && (Array.isArray(o.material) ? o.material[0] : o.material).name === name) t.mesh = o;
      });
      if (!t.mesh) continue;
      const g = t.mesh.geometry, m = inv.clone().multiply(t.mesh.matrixWorld);
      g.computeBoundingBox();
      t.box.copy(g.boundingBox).applyMatrix4(m);
      t.n.fromBufferAttribute(g.attributes.normal, 0).transformDirection(m);
      t.n.y = 0; t.n.normalize();
      const s = t.box.getSize(new THREE.Vector3());
      t.W = Math.hypot(s.x, s.z); t.H = s.y;
    }
  }

  /* ---- the close-up -----------------------------------------------------
     A click on a carton flies the camera to it, front on, and opens a lens:
     everything but the carton goes out of focus, its highlights spread into
     discs and split into colour toward the edges. The carton stays sharp,
     so the print reads. A small drag orbits it; any click goes back. */
  const focus = { on:false, t:0, c:-1, sw:1, target:FOCUS, yaw:0, pitch:0, tyaw:0, tpitch:0 };
  const ORBIT_YAW = 0.38, ORBIT_PITCH = 0.16;                 // radians either way
  const FLY = 1.15;                                           // seconds
  const back = hero.querySelector('.bh-back');
  if (back && matchMedia('(pointer: coarse)').matches) back.textContent = tr('Tap anywhere to go back');
  const rest = { pos:new THREE.Vector3(), look:new THREE.Vector3(), ox:0, oy:0, w:1, h:1, cx:0 };
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const arrows = hero.querySelector('.bh-arrows'), arrowName = hero.querySelector('.bh-arrows-name');
  function enterFocus(t){
    focus.on = true; focus.c = 0; focus.target = t; focus.sw = 1;
    hero.classList.toggle('flyers', !!t.flyer);
    if (t.flyer && arrowName) arrowName.textContent = t.name;
    focus.yaw = focus.tyaw = 0; focus.pitch = focus.tpitch = 0;
    vel = 0; target = yaw;
    setHover(null);
    hero.classList.add('focused', 'touched');
    stage.style.cursor = 'zoom-out';
    if (back) back.setAttribute('aria-hidden', 'false');
    ensureLens();
    kick();
  }
  function leaveFocus(now){
    if (!focus.on) return;
    focus.on = false;
    hero.classList.remove('focused', 'flyers');
    stage.style.cursor = '';
    if (back) back.setAttribute('aria-hidden', 'true');
    lastInput = performance.now();
    if (now){ focus.t = 0; focus.c = -1; applyCamera(); }
    kick();
  }

  const fp = { eye:new THREE.Vector3(), at:new THREE.Vector3() };
  const _n = new THREE.Vector3(), _s = new THREE.Vector3(), _ax = new THREE.Vector3();
  function focusPose(){
    const c = focus.target;
    c.box.getCenter(fp.at);
    const tv = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const aspect = stage.clientWidth / stage.clientHeight;
    const dist = Math.max(c.H / (c.fillH * tv), c.W / (c.fillW * tv * aspect));
    const oy = c.orbit ? focus.yaw : 0, op = c.orbit ? focus.pitch : 0;
    _n.copy(c.n).applyAxisAngle(THREE.Object3D.DEFAULT_UP, oy);
    _ax.crossVectors(_n, THREE.Object3D.DEFAULT_UP).normalize();
    _n.applyAxisAngle(_ax, op + c.tilt);                      // cartons: a touch from above, like a shopper
    fp.eye.copy(fp.at).addScaledVector(_n, dist);
    fp.dist = dist;
    table.localToWorld(fp.at); table.localToWorld(fp.eye);
  }
  /* the arrows step from one desk flyer to the next: the camera glides
     from where it is to the next cover */
  const swFrom = { eye:new THREE.Vector3(), at:new THREE.Vector3() };
  function stepFlyer(d){
    if (!focus.on || !focus.target.flyer) return;
    const i = (flyers.indexOf(focus.target) + d + flyers.length) % flyers.length;
    swFrom.eye.copy(camera.position); swFrom.at.copy(_look);
    focus.target = flyers[i]; focus.sw = 0;
    focus.yaw = focus.tyaw = 0; focus.pitch = focus.tpitch = 0;
    if (arrowName) arrowName.textContent = flyers[i].name;
    kick();
  }
  if (arrows){
    arrows.addEventListener('pointerdown', e => e.stopPropagation());
    arrows.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); stepFlyer(+b.dataset.step); }));
  }
  addEventListener('keydown', e => {
    if (!focus.on || !focus.target.flyer || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault(); e.stopPropagation(); stepFlyer(e.key === 'ArrowLeft' ? -1 : 1);
  }, true);

  const _look = new THREE.Vector3();
  function applyCamera(){
    const e = focus.c < 0 ? 0 : easeIO(focus.t);
    if (e > 0){
      focusPose();
      if (focus.sw < 1){
        const s = easeIO(focus.sw);
        fp.eye.lerpVectors(swFrom.eye, fp.eye, s); fp.at.lerpVectors(swFrom.at, fp.at, s);
      }
      camera.position.lerpVectors(rest.pos, fp.eye, e);
      camera.lookAt(_look.lerpVectors(rest.look, fp.at, e));
      camera.near = focus.target.clear ? 0.1 + (Math.max(0.1, fp.dist - focus.target.clear) - 0.1) * e : 0.1;
    } else {
      camera.position.copy(rest.pos);
      camera.lookAt(rest.look);
      camera.near = 0.1;
    }
    /* the carton lands in the middle of the stage, not of the wider canvas */
    const ox = rest.ox + (rest.cx - rest.ox) * e, oy = rest.oy * (1 - e);
    if (ox || oy) camera.setViewOffset(rest.w, rest.h, ox, oy, rest.w, rest.h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  /* the lens: scene → HDR target; a bokeh blur at half size; the carton's
     silhouette as a mask; then one pass that mixes sharp and blurred by the
     mask, splits colour, tone-maps and writes to the screen */
  let lens = null;
  function ensureLens(){
    if (lens) return;
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    const quadScene = new THREE.Scene(); quadScene.add(quad);
    const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type:THREE.HalfFloatType, samples:4 });
    const blurRT  = new THREE.WebGLRenderTarget(1, 1, { type:THREE.HalfFloatType });
    const maskRT  = new THREE.WebGLRenderTarget(1, 1);
    const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
    const blur = new THREE.ShaderMaterial({
      uniforms:{ tScene:{ value:sceneRT.texture }, texel:{ value:new THREE.Vector2() }, radius:{ value:0 }, exposure:{ value:1 } },
      vertexShader:vert, depthTest:false, depthWrite:false, blending:THREE.NoBlending,
      fragmentShader:`
        uniform sampler2D tScene; uniform vec2 texel; uniform float radius, exposure;
        varying vec2 vUv;
        void main(){
          vec4 acc = vec4(0.); float ws = 0.;
          for (int i = 0; i < 64; i++){
            float fi = float(i);
            float r = sqrt((fi + .5) / 64.);
            float a = fi * 2.39996323;
            vec4 s = texture2D(tScene, vUv + vec2(cos(a), sin(a)) * r * radius * texel);
            /* bright points carry more weight: they open into discs */
            float l = dot(s.rgb, vec3(.2126, .7152, .0722)) * exposure;
            float w = 1. + 6. * smoothstep(.55, 1.6, l);
            acc += s * w; ws += w;
          }
          gl_FragColor = acc / ws;
        }`
    });
    const comp = new THREE.ShaderMaterial({
      uniforms:{ tScene:{ value:sceneRT.texture }, tBlur:{ value:blurRT.texture }, tMask:{ value:maskRT.texture },
                 mtexel:{ value:new THREE.Vector2() }, amount:{ value:0 }, center:{ value:new THREE.Vector2(.5, .5) },
                 aspect:{ value:1 } },
      vertexShader:vert, depthTest:false, depthWrite:false, blending:THREE.NoBlending,
      fragmentShader:`
        uniform sampler2D tScene, tBlur, tMask; uniform vec2 mtexel, center; uniform float amount, aspect;
        varying vec2 vUv;
        void main(){
          /* a soft edge on the carton's silhouette */
          float m = 0.;
          for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++)
            m += texture2D(tMask, vUv + vec2(float(x), float(y)) * mtexel).r;
          m = smoothstep(.35, .95, m / 25.);
          float k = (1. - m) * clamp(amount * 3., 0., 1.);
          /* colour splits outward from the carton, more toward the edges */
          vec2 d = (vUv - center) * vec2(aspect, 1.);
          vec2 off = (vUv - center) * .005 * amount * (.4 + length(d));
          vec4 b = texture2D(tBlur, vUv);
          b.r = texture2D(tBlur, vUv + off).r;
          b.b = texture2D(tBlur, vUv - off).b;
          vec4 c = mix(texture2D(tScene, vUv), b, k);
          gl_FragColor = c;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    const maskScene = new THREE.Scene();
    /* the whole carton: in the close-up its neighbours have moved aside,
       so every face that shows is its own. The banner masks as itself. */
    const white = new THREE.MeshBasicMaterial({ color:0xffffff, side:THREE.DoubleSide });
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), white);
    proxy.matrixAutoUpdate = false;
    const flat = new THREE.Mesh(new THREE.BufferGeometry(), white);
    flat.matrixAutoUpdate = false;
    maskScene.add(proxy, flat);
    const size = new THREE.Vector2(), ctr = new THREE.Vector3(), sz = new THREE.Vector3(), q = new THREE.Quaternion();
    const _hdr = new THREE.Color();
    lens = {
      render(amount){
        renderer.getDrawingBufferSize(size);
        const w = size.x, h = size.y, hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
        if (sceneRT.width !== w || sceneRT.height !== h){ sceneRT.setSize(w, h); blurRT.setSize(hw, hh); maskRT.setSize(hw, hh); }
        const prev = renderer.getRenderTarget();
        /* the scene target is tone-mapped at the end, so its clear colour is
           divided by the exposure to come out as the same grey; the mask
           must clear to nothing, or the backdrop would read as in focus */
        renderer.getClearColor(_cc); const ca = renderer.getClearAlpha();
        renderer.setClearColor(_hdr.copy(_cc).multiplyScalar(1 / renderer.toneMappingExposure), ca);
        renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
        renderer.setClearColor(0x000000, 0);

        const c = focus.target;
        c.box.getCenter(ctr); c.box.getSize(sz).addScalar(0.004);
        proxy.visible = !c.mesh; flat.visible = !!c.mesh;
        if (c.mesh) flat.geometry = c.mesh.geometry;
        proxy.matrix.compose(ctr, q, sz).premultiply(table.matrixWorld);
        if (c.mesh) flat.matrix.copy(c.mesh.matrixWorld);
        renderer.setRenderTarget(maskRT); renderer.render(maskScene, camera);
        renderer.setClearColor(_cc, ca);

        blur.uniforms.texel.value.set(1 / w, 1 / h);
        blur.uniforms.radius.value = h * 0.011 * amount;
        blur.uniforms.exposure.value = renderer.toneMappingExposure;
        quad.material = blur; renderer.setRenderTarget(blurRT); renderer.render(quadScene, quadCam);

        ctr.applyMatrix4(table.matrixWorld).project(camera);
        comp.uniforms.center.value.set((ctr.x + 1) / 2, (ctr.y + 1) / 2);
        comp.uniforms.mtexel.value.set(1 / hw, 1 / hh);
        comp.uniforms.amount.value = amount;
        comp.uniforms.aspect.value = w / h;
        quad.material = comp; renderer.setRenderTarget(prev); renderer.render(quadScene, quadCam);
      }
    };
  }

  /* ---- hover ------------------------------------------------------------ */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tag = document.getElementById('tag'), tagK = document.getElementById('tagK'), tagV = document.getElementById('tagV');
  const tagGo = document.getElementById('tagGo');
  let hover = null, pointerIn = false, px = 0, py = 0;

  function pointer(e){
    if (!model || focus.t > 0 || e.pointerType === 'touch' && !dragging) return;
    const r = canvas.getBoundingClientRect();
    pointerIn = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!pointerIn || dragging){ if (!dragging) setHover(null); return; }
    const spot = e.target.closest ? e.target.closest('.bh-spot') : null;
    if (spot){ spotHover(+spot.dataset.zone); return; }
    hitTest(e.clientX, e.clientY);
  }
  /* the close-up targets turn to face the viewer while hovered; the yaw that
     points each one's face at the camera, within the table's swing */
  const faceYaw = i => {
    const t = i === CARTON ? FOCUS : i === SHELF ? { n:SHELF_N } : i === DESK ? { n:DESK_N } : i === ROLLUP ? BANNER : i === FILM ? SCREEN : null;
    if (!t || !t.n.lengthSq()) return null;
    return THREE.MathUtils.clamp(Math.atan2(-t.n.x, t.n.z), MIN, MAX);
  };
  const lastHit = new THREE.Vector3();
  const hoverBox = i => i === DESK ? desk : i === CARTON ? niche : i === ROLLUP ? BANNER.box : zoneBoxes[i];
  /* while one turns, it keeps the hover as long as the pointer stays over
     where it now is on screen, so the turn can't pull it from under the pointer */
  const _c = new THREE.Vector3();
  function stillOver(i, x, y, r){
    const b = hoverBox(i);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]){
      _c.set(cx, cy, cz); table.localToWorld(_c).project(camera);
      const sx = r.left + (_c.x + 1) / 2 * r.width, sy = r.top + (1 - _c.y) / 2 * r.height;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return x >= x0 - 24 && x <= x1 + 24 && y >= y0 - 24 && y <= y1 + 24;
  }
  function hitTest(x, y){
    if (!model) return;
    const r = canvas.getBoundingClientRect();
    if (hover !== null && faceYaw(hover) !== null && stillOver(hover, x, y, r)) return;
    px = x - r.left; py = y - r.top;
    ndc.set(px / r.width * 2 - 1, -(py / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(model, true)[0];
    if (!hit){ setHover(null); return; }
    const local = table.worldToLocal(hit.point.clone());
    lastHit.copy(local);
    if (niche.clone().expandByScalar(0.05).containsPoint(local)){ setHover(CARTON); return; }
    if (!desk.isEmpty() && desk.clone().expandByScalar(0.05).containsPoint(local)){ setHover(DESK); return; }
    if (BANNER.mesh && (hit.object === BANNER.mesh || BANNER.box.clone().expandByScalar(0.05).containsPoint(local))){ setHover(ROLLUP); return; }
    const i = ZONES.findIndex((z, n) => z.box && zoneBoxes[n].clone().expandByScalar(0.05).containsPoint(local));
    setHover(i < 0 ? ZONES.length - 1 : i);
  }

  const anchor = new THREE.Vector3();
  function setHover(i){
    if (i === hover) return;
    hover = i;
    stage.style.cursor = focus.on ? 'zoom-out' : i === null ? '' : i === CARTON || i === SHELF || i === ROLLUP || i === FILM || i === DESK ? 'zoom-in' : '';
    if (i === null){ tag.classList.remove('on'); kick(); return; }
    const z = ZONES[i];
    tagK.textContent = tr(z.k);
    tagV.textContent = tr(z.v);
    if (tagGo){ tagGo.textContent = z.go ? tr(z.go) : ''; tagGo.style.display = z.go ? '' : 'none'; }
    const b = hoverBox(i);
    fitBrackets(b);
    anchor.set((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
    tag.classList.add('on');
    kick();
  }

  /* ---- hotspots -----------------------------------------------------------
     A glowing dot on each part that opens a close-up, so the stand says
     where it can be clicked before anyone has to find out by hovering. The
     arch and the rest of the stand only answer with a label, and get none.
     Each dot rides the top of its zone's selection box - the point the
     hover label is pinned to - as the table turns; they
     show once the stand has built, and step aside for the close-up. */
  const hotspots = [];
  const spotAt = new THREE.Vector3();
  function spotHover(i){
    if (i === DESK && !desk.isEmpty()) desk.getCenter(lastHit);   // the middle flyer, not a stale hit
    setHover(i);
  }
  function buildSpots(){
    [CARTON, SHELF, ROLLUP, FILM, DESK].forEach((i, n) => {
      if (i === FILM && !SCREEN.mesh) return;
      if (i === DESK && !flyers.length) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bh-spot';
      b.dataset.zone = i;
      b.style.setProperty('--d', (n * 0.37).toFixed(2) + 's');     // the pulses don't beat together
      b.setAttribute('aria-label', tr(ZONES[i].k) + ' — ' + tr('Click to look closer'));
      /* a pointer is handled by the stage's press and release; this is
         for the keyboard (Enter or Space), which sends a click with no press */
      b.addEventListener('click', e => { if (e.detail === 0){ spotHover(i); openZone(i); } });
      b.addEventListener('focus', () => spotHover(i));
      b.addEventListener('blur', () => { if (!focus.on) setHover(null); });
      stage.append(b);
      hotspots.push({ el:b, i, box:hoverBox(i) });
    });
  }
  function placeSpots(){
    const h = stage.clientHeight;
    for (const s of hotspots){
      const b = s.box;                                           // top of the selection box, where the label points
      spotAt.set((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
      table.localToWorld(spotAt); spotAt.project(camera);
      const x = (spotAt.x + 1) / 2 * canvas.clientWidth + canvasOffset, y = (1 - spotAt.y) / 2 * h;
      s.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      /* the canvas runs past the stage on both sides, and so may a dot */
      s.el.hidden = x < canvasOffset + 12 || x > canvasOffset + canvas.clientWidth - 12 || y < 0 || y > h;
      s.el.classList.toggle('is-hover', hover === s.i);
    }
  }

  /* ---- loop --------------------------------------------------------------
     Runs only while something is moving and the stage is on screen. */
  let running = false, visible = true, buildStart = 0, last = 0;
  const BUILD = 1900;
  const IDLE = 2000;                                          // ms after the last touch before the sway resumes
  let swayTimer = 0;
  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible) kick(); else leaveFocus(true);               // scrolled away: back to the stand
  }).observe(stage);
  function kick(){ if (!running && visible && model){ running = true; last = performance.now(); requestAnimationFrame(frame); } }

  const v = new THREE.Vector3();
  function frame(now){
    const dt = Math.min(now - last, 50) / 1000; last = now;
    let busy = false;

    /* build */
    if (clip.constant < size.y + 0.5){
      const t = Math.min((now - buildStart) / BUILD, 1);
      const e = 1 - Math.pow(1 - t, 3);
      clip.constant = -0.01 + e * (size.y + 0.6);
      busy = true;
    } else if (!hotspots.length && !POSTER){                    // the poster is a clean still
      buildSpots();
      hero.classList.add('spots-on');
    }

    /* idle sway once nobody has touched it for a while */
    if (!calm && !dragging && focus.t === 0 && hover === null && now - lastInput > IDLE){
      const sway = REST + Math.sin(now / 3400) * Math.min(0.16, (MAX - MIN) / 2);
      target += (sway - target) * (1 - Math.pow(0.3, dt));    // eases back into the sway
      busy = true;
    }
    /* a hovered close-up target turns to face the viewer */
    const fy = hover !== null && focus.t === 0 && !dragging ? faceYaw(hover) : null;
    if (fy !== null){                                         // glides there, no snap
      target += (fy - target) * (1 - Math.pow(0.12, dt)); vel = 0; lastInput = now;
      if (Math.abs(fy - target) > 1e-4) busy = true;
    }
    if (!dragging && !calm){
      target = clampYaw(target + vel); vel *= Math.pow(0.0025, dt);   // inertia, never past the give
      if (target <= MIN - GIVE || target >= MAX + GIVE) vel = 0;
      if (Math.abs(vel) > 1e-4) busy = true;
    }
    if (!dragging){
      if (target < MIN){ target += (MIN - target) * Math.min(1, dt * 8); busy = true; }
      if (target > MAX){ target += (MAX - target) * Math.min(1, dt * 8); busy = true; }
    }
    /* a drag is followed closely; everything else (hover turns, sway,
       inertia, the stops) is followed softly, so the table never jumps */
    const k = calm ? 1 : 1 - Math.pow(dragging ? 0.0008 : 0.03, dt);
    yaw = clampYaw(yaw + (target - yaw) * k);
    if (Math.abs(target - yaw) > 1e-4) busy = true;
    table.rotation.y = yaw;

    /* the close-up: fly in or out, and follow the orbit */
    if (focus.c >= 0){
      const goal = focus.on ? 1 : 0;
      focus.t = calm ? goal : THREE.MathUtils.clamp(focus.t + (goal ? dt : -dt) / FLY, 0, 1);
      const ko = calm ? 1 : 1 - Math.pow(0.004, dt);
      focus.yaw += (focus.tyaw - focus.yaw) * ko;
      focus.pitch += (focus.tpitch - focus.pitch) * ko;
      if (focus.sw < 1){ focus.sw = calm ? 1 : Math.min(1, focus.sw + dt / 0.9); busy = true; }
      if (focus.t !== goal || Math.abs(focus.tyaw - focus.yaw) + Math.abs(focus.tpitch - focus.pitch) > 1e-4) busy = true;
      applyCamera();
      spread.value = focus.target.spread ? easeIO(focus.t) * SPREAD_STEP * 8 * spreadUnit : 0;
      if (!focus.on && focus.t === 0) focus.c = -1;
    }

    /* brackets fade */
    const want = hover === null ? 0 : 1;
    bracketMat.opacity += (want - bracketMat.opacity) * (calm ? 1 : Math.min(1, dt * 12));
    brackets.visible = bracketMat.opacity > 0.01;
    if (Math.abs(want - bracketMat.opacity) > 0.01) busy = true;

    /* tag follows its anchor as the table turns */
    if (hover !== null){
      v.copy(anchor); table.localToWorld(v); v.project(camera);
      const x = (v.x + 1) / 2 * canvas.clientWidth + canvasOffset, y = (1 - v.y) / 2 * stage.clientHeight;
      tag.style.left = Math.max(110, Math.min(stage.clientWidth - 110, x)) + 'px';
      tag.style.top = Math.max(120, y) + 'px';
    }

    if (hotspots.length) placeSpots();
    draw();
    if (POSTER && !busy) window.__posterReady = true;
    if (busy || dragging) requestAnimationFrame(frame);
    else {
      running = false;
      /* The loop sleeps when nothing moves, and the sway only starts a while
         after the last touch - so something has to wake it for the sway, or
         after the first hover the stand would never turn on its own again. */
      if (!calm && !swayTimer && !dragging && focus.t === 0 && hover === null)
        swayTimer = setTimeout(() => { swayTimer = 0; kick(); }, Math.max(0, IDLE - (now - lastInput)) + 30);
    }
  }
}
