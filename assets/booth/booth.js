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
    'Tap anywhere to go back': 'المس أيّ مكان للعودة',
    'Play the film': 'شغّل الفيلم',
    'Pause the film': 'أوقف الفيلم',
    'Packaging · Methylab': 'التغليف · Methylab',
    'Methyldopa 250 mg. The range\u2019s carton system in Methylab\u2019s own colour, faced out on the shelving by the entrance.':
      'ميثيل دوبا 250 ملغ. نظام علب المجموعة بلون Methylab الخاص، مصفوفًا على الرفوف عند المدخل.',
    'The Xyline carton, doxycycline 100 mg. The chevron and the teal band carry the whole range; the front is set to read from across the aisle, the sides at arm\u2019s length on the shelf.':
      'علبة Xyline، دوكسيسيكلين 100 ملغ. الشيفرون والشريط الفيروزي يحملان المجموعة كلّها؛ الواجهة تُقرأ من آخر الممرّ، والجوانب على مسافة ذراع من الرفّ.',
    'Methylab, methyldopa 250 mg: the same carton system as Xyline, in its own red, faced out in rows by the entrance so the range reads as one family.':
      'Methylab، ميثيل دوبا 250 ملغ: نظام العلب نفسه الذي لـXyline، بلونه الأحمر الخاص، مصفوفًا عند المدخل لتُقرأ المجموعة عائلةً واحدة.',
    'Campaigns · Xyline roll-up': 'الحملات · لافتة Xyline',
    'The launch roll-up: the carton, its chevron and the campaign\u2019s key visual carried to two metres of print, beside the Evolab one.':
      'لافتة الإطلاق: العلبة وشيفرونها والصورة الرئيسية للحملة منقولةً إلى مترين من الطباعة، بجانب لافتة Evolab.',
    'The studio\u2019s showreel on the stand\u2019s screen: identity, packaging, campaigns, web and film, in one minute.':
      'عرض أعمال الاستوديو على شاشة الجناح: الهوية والتغليف والحملات والويب والأفلام، في دقيقة واحدة.'
  } : null;
  /* the desk's captions are built per flyer, so they are built per language */
  const AR_DCI = { Xyline:'دوكسيسيكلين 100 ملغ', Esoprotect:'إيزوميبرازول 40 ملغ و20 ملغ', Lansoprotect:'لانسوبرازول 30 ملغ',
                   Evofenid:'كيتوبروفين 100 ملغ', Evomisil:'تيربينافين 250 ملغ', Omeprotect:'أوميبرازول 20 ملغ' };
  const tr = s => (AR && AR[s]) || s;

  /* ---- zones, in model units (metres), before centring --------------- */
  const ZONES = [
    { id:'shelf',     k:'Packaging · Methylab', v:'Methyldopa 250 mg. The range\u2019s carton system in Methylab\u2019s own colour, faced out on the shelving by the entrance.',
      go:'Click to look closer',                              // the green shelving by the entrance; opens one of its Methylab cartons
      box:[[1.05, 0.0, -2.8], [1.6, 2.15, -1.7]] },
    { id:'film',      k:'Campaigns · Film', v:'Films and screen content for the launch, produced by the in-house film department.',
      go:'Click to look closer',
      box:[[10.85, 0.75, -5.2], [11.45, 2.4, -2.35]] },
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
  }catch(e){ hero.classList.add('no-gl'); return; }           // the poster image stays up
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
  /* The corridor: in a close-up on the roll-up or the screen, a chair that
     stands between the camera and the print is cut away, and only that: a
     box from just in front of the print to the camera, as wide as the
     print, above the floor. Only the chairs' shells take it (anything else
     cut there, a table or a flyer, shows a raw edge); they clip by the
     intersection of these planes and their own build plane (clipI), so
     each must cut for a point to go. EVERY cuts everything, NONE nothing. */
  const CORRIDOR_MATS = ['[Translucent Glass Gray]3'];
  const clipI = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const EVERY = -1e6, NONE = 1e6;
  const corr = [0, 1, 2, 3].map(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), EVERY));
  /* everything else takes a second corridor, opened only for the screen:
     on a phone its camera stands far back, behind a wall */
  const corrAll = [0, 1, 2, 3].map(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), EVERY));
  let buildY = 0, built = false;
  function endBuild(){                                        // the build plane stands aside for good
    built = true;
    clipI.set(new THREE.Vector3(0, 1, 0), EVERY);
    corr[0].set(new THREE.Vector3(0, 1, 0), NONE);
    corrAll[0].set(new THREE.Vector3(0, 1, 0), NONE);
  }
  const _C = new THREE.Vector3(), _N = new THREE.Vector3(), _R = new THREE.Vector3();
  function corridor(t, on){
    if (!built) return;
    corrAll[0].set(THREE.Object3D.DEFAULT_UP, NONE);
    if (!on || !t || !t.corridor){ corr[0].set(THREE.Object3D.DEFAULT_UP, NONE); return; }
    t.box.getCenter(_C); table.localToWorld(_C);
    _N.copy(t.n).applyQuaternion(table.quaternion).setY(0).normalize();
    _R.crossVectors(THREE.Object3D.DEFAULT_UP, _N).normalize();
    const w = t.W / 2 + 0.12, f = 0.06;
    corr[0].set(_N.clone().negate(), _N.dot(_C) + f);                     // in front of the print
    corr[1].set(_R.clone(), -_R.dot(_C) - w);                             // right of its left edge
    corr[2].set(_R.clone().negate(), _R.dot(_C) - w);                     // left of its right edge
    corr[3].set(new THREE.Vector3(0, -1, 0), 0.03);                       // above the floor
    if (t.corridor === 'all') corr.forEach((pl, i) => corrAll[i].copy(pl));
  }

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
  /* loading: a thin line fills as the model arrives (a travelling pulse
     when its size is not known), and the poster breathes behind it */
  function progress(e){
    if (!e || !e.lengthComputable || !e.total) return;
    hero.classList.add('load-known');
    hero.style.setProperty('--load', Math.min(1, e.loaded / e.total).toFixed(3));
  }
  hero.classList.add('loading');
  /* the stand builds in the moment its model is here - alongside the
     headline's entrance, not after it. It used to wait for the headline
     (hero.introEnd), which put three seconds under every visit however fast
     the model had arrived. */
  loader.load(new URL('evolab-booth.glb', import.meta.url).href, onLoad, progress, () => {
    canvas.remove();                                          // keep the poster
    hero.classList.remove('loading');
    hero.classList.add('no-gl');
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
        if (CORRIDOR_MATS.includes(m.name)){ m.clippingPlanes = [clipI, ...corr]; m.clipIntersection = true; }
        else { m.clippingPlanes = [clipI, ...corrAll]; m.clipIntersection = true; }
        m.clipShadows = true;
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
    buildY = size.y + 1;                                      // no build: the canvas fades in as the stand turns
    clip.constant = clipI.constant = buildY;
    buildStart = performance.now();
    filmStill();
    hero.classList.add('gl-ready');
    hero.classList.remove('loading');
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
    /* the lens eases off while the camera glides from one flyer to the next,
       and settles again on arrival */
    const glide = focus.sw < 1 ? 1 - 0.75 * Math.sin(Math.PI * focus.sw) : 1;
    if (lens && focus.c >= 0 && focus.t > 0 && focus.target.blur > 0) lens.render(smooth(0.3, 1, focus.t) * focus.target.blur * glide);
    else if (composer && L.glow > 0) composer.render();
    else renderer.render(scene, camera);
  }
  hero.booth = {
    defaults: Object.assign({}, LIGHT_DEFAULTS),
    get: () => Object.assign({}, L),
    set(patch){ Object.assign(L, patch); applyLights(); kick(); },
    /* the stand's box at rest, in canvas px: the poster records it, so the
       page can size the still to the same box before the model arrives */
    standBox(){
      const r = extent(rest.w, rest.h);
      return [r.minX, r.minY, r.maxX, r.maxY].map(v => Math.round(v * 10) / 10);
    },
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
  /* Centred layout (data-layout="center"): the stage is the whole hero; the
     stand is fitted into the space between the headline block and the base
     row, and centred in it, so it leads and the type frames it. */
  const CENTER = hero.dataset.layout === 'center';
  const GAP_FIT = .7;                                         // share of the headline's gap the stand's box keeps clear
  const headEl = hero.querySelector('.bh-head'), baseEl = hero.querySelector('.bh-base');
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
    const single = stacked.matches || CENTER;                  // the canvas is the stage itself
    const bleed = single ? 0 : Math.max(0, sl - hero.getBoundingClientRect().left);  // the whole hero, so the close-up fills it
    const w = single ? sw : Math.max(sw, Math.round(innerWidth - sl + bleed));
    canvasOffset = -bleed;
    canvas.style.width = w + 'px';
    canvas.style.left = canvasOffset + 'px';
    renderer.setSize(w, h, false);
    if (composer){ composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    camera.aspect = w / h;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const refAspect = single ? camera.aspect : Math.round(innerWidth * 7 / 12) / h;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * refAspect);
    const look = new THREE.Vector3(0, size.y * 0.42, 0);
    const fitW = frameR / Math.tan(hfov / 2);
    const fitH = (size.y * 0.62) / Math.tan(vfov / 2);
    let d = Math.max(fitW, fitH) * (refAspect < 1 ? 1.08 : 1.0) + radius * 0.1;
    place(d, look);
    let fit = null;
    if (model && CENTER){
      const sr = stage.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(hero).paddingLeft) || 24;
      /* the same gap under the headline block as above it (its margin), so
         the words sit midway between the bar and the stand. The fit is to
         the stand's bounding box, whose top corners stand clear of what is
         drawn, so only part of the gap is asked of the box. */
      const gap = headEl ? parseFloat(getComputedStyle(headEl).marginTop) || h * .05 : h * .05;
      const top = (headEl ? headEl.getBoundingClientRect().bottom - sr.top : h * .3) + gap * GAP_FIT;
      const bottom = (baseEl ? baseEl.getBoundingClientRect().top - sr.top : h * .9) - h * .03;
      fit = stacked.matches ? { left:6, right:sw - 6, top, bottom }             // narrow: edge to edge
                            : { left:pad, right:sw - pad, top, bottom };
      for (let n = 0; n < 3; n++){                             // perspective: settle in a few passes
        const r = extent(w, h);
        const k = Math.min((fit.right - fit.left) / (r.maxX - r.minX), (fit.bottom - fit.top) / (r.maxY - r.minY));
        d /= k;
        place(d, look);
      }
    } else if (model && !stacked.matches){
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
    if (fit){
      const r = extent(w, h);
      rest.ox = (r.minX + r.maxX) / 2 - (fit.left + fit.right) / 2;
      rest.oy = (r.minY + r.maxY) / 2 - (fit.top + fit.bottom) / 2;
    } else compose(w, h, edge(bleed, sw));                    // into the gap before the copy
    applyCamera();
    kick();
  }

  /* the stand's box at rest, projected: canvas px */
  function extent(w, h){
    const c = new THREE.Vector3(), rot = new THREE.Matrix4().makeRotationY(REST);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [-size.x/2, size.x/2]) for (const y of [0, size.y]) for (const z of [-size.z/2, size.z/2]){
      c.set(x, y, z).applyMatrix4(rot).project(camera);
      const px = (c.x + 1) / 2 * w, py = (1 - c.y) / 2 * h;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    return { minX, maxX, minY, maxY };
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

  /* the stand's own area on screen: its box, as it stands now, projected.
     Drags start only there (and on the hotspots); the rest of the hero
     belongs to the page. */
  const _q = new THREE.Vector3();
  function overStand(x, y){
    if (!model) return false;
    const r = canvas.getBoundingClientRect();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const cx of [whole.min.x, whole.max.x]) for (const cy of [whole.min.y, whole.max.y]) for (const cz of [whole.min.z, whole.max.z]){
      _q.set(cx, cy, cz); table.localToWorld(_q).project(camera);
      const sx = r.left + (_q.x + 1) / 2 * r.width, sy = r.top + (1 - _q.y) / 2 * r.height;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }
  /* A press made while the film's controls are hidden only brings them back,
     as on any video player: on a touch screen there is no hover to do it,
     and the tap would otherwise fall through to the screen, where it means
     "go back", and end the close-up the viewer was watching. */
  let pressWoke = false;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    pressWoke = hero.classList.contains('film-idle');
    const onSpot = e.target.closest && e.target.closest('.bh-spot');
    if (!focus.on && !onSpot && !overStand(e.clientX, e.clientY)) return;   // not on the stand: leave it to the page
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
    if (!dragging && model) hero.classList.toggle('on-stand', overStand(e.clientX, e.clientY));
    if (dragging){
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved = Math.max(moved, Math.abs(e.clientX - downX), Math.abs(e.clientY - downY));
      if (focus.on){
        if (e.pointerType === 'touch'){                         // on touch, a drag orbits
          const dy = e.clientY - lastY; lastY = e.clientY;
          const oy = focus.target.orbitYaw ?? ORBIT_YAW, op = focus.target.orbitPitch ?? ORBIT_PITCH;
          focus.tyaw = THREE.MathUtils.clamp(focus.tyaw - dx * 0.004, -oy, oy);
          focus.tpitch = THREE.MathUtils.clamp(focus.tpitch + dy * 0.004, -op, op);
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
      focus.tyaw = THREE.MathUtils.clamp(nx, -1, 1) * (focus.target.orbitYaw ?? ORBIT_YAW);
      focus.tpitch = -THREE.MathUtils.clamp(ny, -1, 1) * (focus.target.orbitPitch ?? ORBIT_PITCH);
      kick();
    }
    pointer(e);
  });
  function endDrag(e, click){
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('dragging');
    if (click && moved < 6){
      if (focus.on){ if (!pressWoke) leaveFocus(); }
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
    blur:1,                                                   // lens strength, 0–1
    cap:{ k:'Packaging · Xyline', v:'The Xyline carton, doxycycline 100 mg. The chevron and the teal band carry the whole range; the front is set to read from across the aisle, the sides at arm\u2019s length on the shelf.' }
  };
  /* the green shelving's own close-up carton: the second from the front on
     its second shelf from the top (3DGeom-263), laid on top of its row */
  const SHELF_BOX = Object.assign({}, FOCUS, {
    box:new THREE.Box3(new THREE.Vector3(1.2533, 0.9068, -2.2592), new THREE.Vector3(1.3122, 0.9962, -2.0918)),
    n:new THREE.Vector3(1, 0, 0),                             // it faces into the stand, across it
    cap:{ k:'Packaging · Methylab', v:'Methylab, methyldopa 250 mg: the same carton system as Xyline, in its own red, faced out in rows by the entrance so the range reads as one family.' }
  });
  /* the Xyline roll-up: seen straight on, near full height, no orbit; its
     own mesh is the lens mask. Box, normal and size are read at load. */
  const BANNER = {
    box:new THREE.Box3(), n:new THREE.Vector3(), W:1, H:1, mesh:null,
    fillH:0.8, fillW:0.8, tilt:0, orbit:true, spread:false, blur:1 / 3,   // follows the pointer, like the carton
    orbitYaw:5 * Math.PI / 180, orbitPitch:5 * Math.PI / 180,            // 5° at most, in every direction
    cap:{ k:'Campaigns · Xyline roll-up', v:'The launch roll-up: the carton, its chevron and the campaign\u2019s key visual carried to two metres of print, beside the Evolab one.' },
    corridor:'chairs'                                         // the chair in front of it is cut away, nothing else
  };
  /* the screen: straight on, filling most of the stage's width */
  const SCREEN = {
    box:new THREE.Box3(), n:new THREE.Vector3(), W:1, H:1, mesh:null,
    fillH:0.62, fillW:0.72, tilt:0, orbit:false, spread:false,
    cap:{ k:'Campaigns · Film', v:'The studio\u2019s showreel on the stand\u2019s screen: identity, packaging, campaigns, web and film, in one minute.' },
    blur:1 / 3,
    corridor:'all'                                            // on a phone the camera stands far back; nothing may block the screen
  };
  /* the six flyers on the reception desk, left to right, from the build
     (flyers.json): each stands half open; the close-up faces its cover.
     Model units, before centring. */
  const DESK_FLYERS = [{"set":"Esoprotect","fold":[4.9522,-1.3121],"face":[-0.2588,0.9659],"y":[0.93,1.14],"panels":[{"c":[4.9846,1.035,-1.2427],"n":[-0.9063,0.4226],"w":0.1531,"h":0.21,"cover":true},{"c":[5.0148,1.035,-1.2773],"n":[0.4856,-0.8742],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Xyline","fold":[5.091,-1.4389],"face":[0.2588,0.9659],"y":[0.93,1.14],"panels":[{"c":[5.1537,1.035,-1.395],"n":[-0.5736,0.8192],"w":0.1531,"h":0.21,"cover":true},{"c":[5.1625,1.035,-1.4401],"n":[-0.0166,-0.9999],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Lansoprotect","fold":[5.3762,-1.4942],"face":[-0.866,0.5],"y":[0.93,1.14],"panels":[{"c":[5.35,1.035,-1.4223],"n":[-0.9397,-0.342],"w":0.1531,"h":0.21,"cover":true},{"c":[5.3958,1.035,-1.4254],"n":[0.9615,-0.2748],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Evofenid","fold":[6.3327,-1.5079],"face":[0.866,0.5],"y":[0.93,1.14],"panels":[{"c":[6.4081,1.035,-1.5212],"n":[0.1736,0.9848],"w":0.1531,"h":0.21,"cover":true},{"c":[6.3825,1.035,-1.5593],"n":[-0.7187,-0.6953],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Evomisil","fold":[6.6253,-1.4348],"face":[-0.2588,0.9659],"y":[0.93,1.14],"panels":[{"c":[6.6576,1.035,-1.3654],"n":[-0.9063,0.4226],"w":0.1531,"h":0.21,"cover":true},{"c":[6.6878,1.035,-1.4001],"n":[0.4856,-0.8742],"w":0.1431,"h":0.21,"cover":false}]},{"set":"Omeprotect","fold":[6.7641,-1.3162],"face":[0.2588,0.9659],"y":[0.93,1.14],"panels":[{"c":[6.8268,1.035,-1.2723],"n":[-0.5736,0.8192],"w":0.1531,"h":0.21,"cover":true},{"c":[6.8356,1.035,-1.3173],"n":[-0.0166,-0.9999],"w":0.1431,"h":0.21,"cover":false}]}];
  const flyers = [];
  const FLYER_DCI = { Xyline:'doxycycline 100 mg', Esoprotect:'esomeprazole 40 mg and 20 mg', Lansoprotect:'lansoprazole 30 mg',
                      Evofenid:'ketoprofen 100 mg', Evomisil:'terbinafine 250 mg', Omeprotect:'omeprazole 20 mg' };
  /* the desk: its frosted top and body, with the flyers on it */
  const desk = new THREE.Box3(new THREE.Vector3(4.78, 0.1, -1.72), new THREE.Vector3(6.98, 1.16, -1.1));
  const niche = new THREE.Box3();
  /* in the close-up the cartons part along their shelves, so each stands
     clear of its neighbours: the build stores each carton's step in _SPREAD */
  const SPREAD_STEP = 0.06;                                   // metres between neighbours, fully open
  /* one uniform per carton mesh (Xyline, Methylab): each is quantised on
     its own scale, so a metre is a different number in each */
  const spreads = [];                                         // { u:{ value }, unit }
  function buildNiche(){
    model.traverse(o => {
      const m = o.isMesh && (Array.isArray(o.material) ? o.material[0] : o.material);
      if (!m || !['XylineBox', 'MethylabBox'].includes(m.name) || !o.geometry.attributes._spread) return;
      const sp = { u:{ value:0 }, unit:1 / new THREE.Vector3().setFromMatrixScale(o.matrixWorld).x };
      spreads.push(sp);
      m.onBeforeCompile = sh => {
        sh.uniforms.uSpread = sp.u;
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
    /* how far in front of a flyer's middle the near plane stands: past its
       own front, and never through a neighbour, which would leave a sliver
       with a raw edge; a neighbour is cut away whole or not at all. Depths
       are along the view, with room for the slight look from above. */
    const flyerFeet = g => g.panels.flatMap(p => [-1, 1].map(sx =>
      [p.c[0] + p.n[1] * sx * p.w / 2, p.c[2] - p.n[0] * sx * p.w / 2]));
    function flyerClear(f, at, view){
      const d = q => (q[0] - at.x) * view.x + (q[1] - at.z) * view.z, m = 0.015;
      const own = Math.max(...flyerFeet(f).map(d)) + m;
      const spans = DESK_FLYERS.filter(g => g !== f).map(g => flyerFeet(g).map(d))
        .map(ds => [Math.min(...ds) - m, Math.max(...ds) + m]).sort((p, q) => p[0] - q[0]);
      let c = own;
      for (const [lo, hi] of spans) if (c > lo && c < hi) c = hi;
      return c;
    }
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
      /* the flyers themselves stand turned on the desk (the build turns
         them), so the close-up looks straight along the facing they had
         before: the cover faces the lens and the inside page shows past
         its edge, both on the lit side */
      const bk = f.panels.find(p => !p.cover);
      const view = new THREE.Vector3(f.face[0], 0, f.face[1]).normalize();
      const at = new THREE.Vector3(...cov.c).add(new THREE.Vector3(...bk.c)).multiplyScalar(.5).add(offset);
      const t = {
        box:new THREE.Box3(at.clone(), at.clone()), n:view,
        W:cov.w * 1.6, H:cov.h, mesh, name:f.set, flyer:true,
        cap: AR ? { k:'المطويات · ' + f.set, v:f.set + '، ' + (AR_DCI[f.set] || '') + '. مطوية واحدة لكل منتج: الصورة الرئيسية على الغلاف، والدواعي في الداخل، والنشرة الكاملة على الظهر.' }
                : { k:'Flyers · ' + f.set, v:f.set + ', ' + (FLYER_DCI[f.set] || '') + '. One folded leaflet per product: the key visual on the cover, the indications inside, the full mention on the back.' },
        fillH:0.62, fillW:0.62, tilt:0.12, orbit:false, spread:false, blur:1,  // held still, a touch from above
        clear:flyerClear(f, at.clone().sub(offset), view)    // its neighbours on the desk stand close; what is in front is cut away
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
  /* each close-up comes with a few words on what is in front of the viewer */
  const capK = hero.querySelector('.bh-caption-k'), capV = hero.querySelector('.bh-caption-v');
  function caption(t){
    const c = t.cap || { k:'', v:'' };
    if (capK) capK.textContent = tr(c.k);
    if (capV) capV.textContent = tr(c.v);
  }
  function enterFocus(t){
    focus.on = true; focus.c = 0; focus.target = t; focus.sw = 1;
    hero.classList.toggle('flyers', !!t.flyer);
    hero.classList.toggle('screen', t === SCREEN);
    caption(t);
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
    hero.classList.remove('focused', 'flyers', 'screen');
    if (film && !film.paused) film.pause();              // leaving the screen stops the film
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
    caption(flyers[i]);
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
    corridor(focus.target, e > 0);
    if (e > 0){
      focusPose();
      if (focus.sw < 1){
        const s = easeIO(focus.sw);
        fp.eye.lerpVectors(swFrom.eye, fp.eye, s); fp.at.lerpVectors(swFrom.at, fp.at, s);
      }
      camera.position.lerpVectors(rest.pos, fp.eye, e);
      camera.lookAt(_look.lerpVectors(rest.look, fp.at, e));
      /* the near plane cuts away what stands in front of the flyer, measured
         from where the camera is, not where it is going: mid-glide the
         target is nearer or farther than its resting distance */
      camera.near = focus.target.clear ? 0.1 + (Math.max(0.1, camera.position.distanceTo(fp.at) - focus.target.clear) - 0.1) * e : 0.1;
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

        /* the colour split radiates from the target on screen; mid-glide
           (the desk's last flyer to its first) the next one can be off
           screen or behind the camera, which threw the split across the
           whole frame. Behind: from the middle; off: held to the frame. */
        ctr.applyMatrix4(table.matrixWorld).project(camera);
        const behind = ctr.z > 1 || ctr.z < -1;
        comp.uniforms.center.value.set(
          behind ? .5 : THREE.MathUtils.clamp((ctr.x + 1) / 2, 0, 1),
          behind ? .5 : THREE.MathUtils.clamp((ctr.y + 1) / 2, 0, 1));
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

  /* ---- the film on the screen --------------------------------------------
     The stage names a film (data-film) and, optionally, a still from it
     (data-film-still) that the screen shows at rest in place of the image
     baked into the model. In the screen's close-up a play button sits on the
     screen, and the film plays on the screen itself: a video texture in
     place of the still, lit and tone-mapped as it was, so it stays part of
     the stand rather than a player laid over it. It plays with its sound -
     the viewer asked for it by pressing play. Nothing is fetched until then.
     Without a film, or if it fails, the screen keeps its picture and there
     is no button. */
  const FILM_SRC = stage.dataset.film || '';
  const FILM_STILL = stage.dataset.filmStill || '';
  let film = null, filmTex = null, stillTex = null, filmState = 'idle';   // idle | loading | playing | paused | ended | failed
  const screenMat = () => { const m = SCREEN.mesh && SCREEN.mesh.material; return Array.isArray(m) ? m[0] : m; };
  /* a replacement texture has to sit on the screen's UVs as the baked one did */
  function likeScreen(t, from){
    t.colorSpace = THREE.SRGBColorSpace;
    if (!from) return t;
    t.flipY = from.flipY; t.wrapS = from.wrapS; t.wrapT = from.wrapT; t.channel = from.channel;
    t.offset.copy(from.offset); t.repeat.copy(from.repeat); t.center.copy(from.center); t.rotation = from.rotation;
    return t;
  }
  function filmStill(){
    const m = screenMat();
    if (!FILM_STILL || !m || !m.emissiveMap) return;
    new THREE.TextureLoader().load(FILM_STILL, t => {
      const old = m.emissiveMap;
      m.emissiveMap = likeScreen(t, old); m.needsUpdate = true;
      if (old && old !== t) old.dispose();
      kick();
    });
  }
  const playBtn = FILM_SRC ? (() => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'bh-play'; b.dataset.state = 'idle';
    b.setAttribute('aria-label', tr('Play the film'));
    b.innerHTML = '<i aria-hidden="true"></i>';
    b.addEventListener('pointerdown', e => e.stopPropagation());      // a press here is not a click on the stand
    b.addEventListener('click', e => { e.stopPropagation(); toggleFilm(); });
    stage.append(b);
    return b;
  })() : null;
  function setFilm(st){
    filmState = st;
    if (playBtn){
      playBtn.dataset.state = st;
      playBtn.setAttribute('aria-label', tr(st === 'playing' || st === 'loading' ? 'Pause the film' : 'Play the film'));
    }
    hero.classList.toggle('film-on', st === 'playing' || st === 'loading');
    wake();
    kick();
  }
  /* While the film plays the button keeps out of the picture: it moves to
     the screen's bottom corner (placePlay) and, once the pointer has been
     still for two seconds, fades out altogether. Any movement brings it
     back. Pressing play leaves the pointer resting on the button, so
     without this the pause sat lit in the middle of the film. */
  let idleTimer = 0;
  function wake(){
    clearTimeout(idleTimer);
    hero.classList.remove('film-idle');
    if (filmState === 'playing')
      idleTimer = setTimeout(() => { if (filmState === 'playing') hero.classList.add('film-idle'); }, 2000);
  }
  if (FILM_SRC){
    stage.addEventListener('pointermove', wake);
    stage.addEventListener('pointerdown', wake);
  }
  function ensureFilm(){
    if (film) return film;
    film = document.createElement('video');
    film.src = FILM_SRC; film.preload = 'auto'; film.playsInline = true; film.setAttribute('playsinline', '');
    film.addEventListener('playing', () => setFilm('playing'));
    film.addEventListener('waiting', () => { if (!film.paused) setFilm('loading'); });
    film.addEventListener('pause', () => { if (!film.ended) setFilm('paused'); });
    film.addEventListener('ended', () => setFilm('ended'));
    film.addEventListener('error', () => {
      setFilm('failed');
      const m = screenMat();
      if (m && stillTex && m.emissiveMap === filmTex){ m.emissiveMap = stillTex; m.needsUpdate = true; }
      if (playBtn) playBtn.hidden = true;
    });
    return film;
  }
  function toggleFilm(){
    const v = ensureFilm();
    if (filmState === 'playing' || filmState === 'loading'){ v.pause(); return; }
    if (filmState === 'failed') return;
    if (filmState === 'ended') v.currentTime = 0;
    const m = screenMat();
    if (m && !filmTex){
      stillTex = m.emissiveMap;
      filmTex = likeScreen(new THREE.VideoTexture(v), stillTex);
      m.emissiveMap = filmTex; m.needsUpdate = true;
    }
    setFilm('loading');
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => setFilm('paused'));
  }
  /* "Watch the showreel" (#showreel): bring the stand into view and open
     the screen's close-up, with the play button waiting - the film itself
     starts on the viewer's own press, sound and all. From another page the
     link arrives as index.html#showreel and is honoured once the stand is
     built; on this page it is a click, answered at once if the stand is
     ready and as soon as it is if not. */
  let wantReel = location.hash === '#showreel';
  function openReel(){
    if (!SCREEN.mesh || !hotspots.length){ wantReel = true; return; }
    if (focus.on && focus.target === SCREEN) return;
    if (focus.on) leaveFocus(true);
    enterFocus(SCREEN);
  }
  if (FILM_SRC) document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href="#showreel"]');
    if (!a) return;
    e.preventDefault();
    const top = hero.getBoundingClientRect().top + scrollY;
    scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    openReel();
  });
  const _pc = new THREE.Vector3();
  function placePlay(){
    if (!playBtn || !SCREEN.mesh || focus.target !== SCREEN || focus.c < 0) return;
    /* in the middle of the screen until the film has started; from then on
       in its bottom-left corner, clear of the picture */
    const corner = filmState === 'playing' || filmState === 'loading' || filmState === 'paused';
    playBtn.classList.toggle('corner', corner);
    let x, y;
    if (corner){
      const b = SCREEN.box;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
      for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]){
        _pc.set(cx, cy, cz); table.localToWorld(_pc); _pc.project(camera);
        x0 = Math.min(x0, _pc.x); x1 = Math.max(x1, _pc.x); y0 = Math.min(y0, _pc.y);
      }
      /* the inset follows the screen's size on the page: 44px on a desktop,
         tucked further in on a phone, where the screen is a fifth as wide */
      const inset = THREE.MathUtils.clamp((x1 - x0) / 2 * canvas.clientWidth * 0.045, 24, 44);
      x = (x0 + 1) / 2 * canvas.clientWidth + canvasOffset + inset;
      y = (1 - y0) / 2 * stage.clientHeight - inset;
    } else {
      SCREEN.box.getCenter(_pc); table.localToWorld(_pc); _pc.project(camera);
      x = (_pc.x + 1) / 2 * canvas.clientWidth + canvasOffset; y = (1 - _pc.y) / 2 * stage.clientHeight;
    }
    playBtn.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }
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
    hero.classList.toggle('lit', i !== null);                 // the page shows the stand in colour while it is pointed at
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
    if (buildY < size.y + 0.5){
      const t = Math.min((now - buildStart) / BUILD, 1);
      const e = 1 - Math.pow(1 - t, 3);
      buildY = clip.constant = clipI.constant = -0.01 + e * (size.y + 0.6);
      busy = true;
    } else if (!built){
      endBuild(); busy = true;
    } else if (!hotspots.length && !POSTER){                    // the poster is a clean still
      buildSpots();
      hero.classList.add('spots-on');
      if (wantReel){ wantReel = false; openReel(); }
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
      for (const sp of spreads) sp.u.value = focus.target.spread ? easeIO(focus.t) * SPREAD_STEP * 8 * sp.unit : 0;
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
      /* never over the headline and its lede: below them, the label drops onto the stand */
      const floor = headEl && CENTER ? headEl.getBoundingClientRect().bottom - stage.getBoundingClientRect().top + tag.offsetHeight + 22 : 120;
      tag.style.top = Math.max(floor, y) + 'px';
    }

    if (hotspots.length) placeSpots();
    placePlay();
    if (filmState === 'playing') busy = true;                 // every frame of the film has to reach the screen
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
