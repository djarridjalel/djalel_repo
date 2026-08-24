/* The mark, in three dimensions.
   A single extruded glyph rendered with raw WebGL — no library. At this size
   (30px) a full engine would be several hundred kilobytes to draw 2068
   triangles once per frame, so the loader below reads only what this one
   file uses: POSITION, NORMAL and indices out of a glTF 2.0 binary.

   Scroll is the only input. It drives where the mark sits and how far it has
   turned, so the object reads as something the page is moving rather than
   something animating beside it. */
(function(){
  'use strict';

  var host = document.getElementById('mark3d');
  if(!host) return;
  var src = host.getAttribute('data-src');
  if(!src) return;

  var W = 30;                       // the mark is never wider than this
  var BOX = 56;                     // canvas: room for the turn and the glow

  /* Desktop only. On a phone or tablet the bar is already tight, the mark
     would be competing with the wordmark for the same 58px, and there is no
     scroll-and-settle to watch it perform. Bail before the GL context is
     created rather than hiding it with CSS — nothing should be built. */
  if(window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches){ host.remove(); return; }
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cv = document.createElement('canvas');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = BOX * dpr; cv.height = BOX * dpr;
  cv.style.width = cv.style.height = BOX + 'px';
  host.appendChild(cv);

  var gl = cv.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:false});
  if(!gl){ host.remove(); return; }

  /* ---- glTF binary ------------------------------------------------------ */
  function readGLB(buf){
    var dv = new DataView(buf), u8 = new Uint8Array(buf);
    if(dv.getUint32(0, true) !== 0x46546C67) return null;      // 'glTF'
    var total = dv.getUint32(8, true), off = 12, json = null, bin = null;
    while(off < total){
      var len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
      var body = buf.slice(off + 8, off + 8 + len);
      if(type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(body));
      else if(type === 0x004E4942) bin = body;
      off += 8 + len;
    }
    if(!json || !bin) return null;
    var TYPES = {5126:Float32Array, 5123:Uint16Array, 5125:Uint32Array, 5121:Uint8Array};
    var SIZE  = {SCALAR:1, VEC2:2, VEC3:3, VEC4:4};
    function read(i){
      var a = json.accessors[i], bv = json.bufferViews[a.bufferView];
      var C = TYPES[a.componentType], n = SIZE[a.type];
      return new C(bin, (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * n);
    }
    var p = json.meshes[0].primitives[0];
    return {pos:read(p.attributes.POSITION), nor:read(p.attributes.NORMAL), idx:read(p.indices)};
  }

  /* ---- shaders ----------------------------------------------------------
     Emissive body plus a fresnel rim. The rim is what makes a flat extruded
     glyph read as a solid at 30px: without it the silhouette is one wash of
     orange and the turn is invisible. */
  var VS =
    'attribute vec3 p;attribute vec3 n;uniform mat4 mvp;uniform mat3 nm;' +
    'varying vec3 vn;varying vec3 vp;' +
    'void main(){vn=normalize(nm*n);vp=p;gl_Position=mvp*vec4(p,1.0);}';
  var FS =
    'precision mediump float;varying vec3 vn;varying vec3 vp;' +
    'uniform vec3 warm;uniform vec3 hot;' +
    'void main(){' +
    ' vec3 N=normalize(vn);vec3 V=vec3(0.0,0.0,1.0);' +
    ' float key=max(dot(N,normalize(vec3(-0.35,0.55,0.85))),0.0);' +
    ' float fill=max(dot(N,normalize(vec3(0.6,-0.3,0.4))),0.0);' +
    ' float rim=pow(1.0-abs(dot(N,V)),2.2);' +
    ' vec3 c=warm*(0.55+0.45*key+0.16*fill)+hot*rim*0.9;' +
    ' gl_FragColor=vec4(c,1.0);}';

  function shader(type, src){
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
  if(!vs || !fs){ host.remove(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ host.remove(); return; }
  gl.useProgram(prog);

  var uMVP = gl.getUniformLocation(prog, 'mvp'),
      uNM  = gl.getUniformLocation(prog, 'nm'),
      aP   = gl.getAttribLocation(prog, 'p'),
      aN   = gl.getAttribLocation(prog, 'n');
  gl.uniform3f(gl.getUniformLocation(prog, 'warm'), 1.00, 0.807, 0.00);   // #FFCE00
  gl.uniform3f(gl.getUniformLocation(prog, 'hot'),  1.00, 0.94, 0.62);   // the rim, one step hotter

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);          // an extruded glyph is closed; backfaces cost nothing to drop
  gl.clearColor(0, 0, 0, 0);
  gl.viewport(0, 0, cv.width, cv.height);

  /* The published build inlines the model as a data: URI. Decoding it here
     rather than fetching it keeps the whole thing off the network layer, so
     no connect-src policy can quietly take the mark away. */
  function load(u){
    if(u.slice(0, 5) !== 'data:') return fetch(u).then(function(r){ return r.arrayBuffer(); });
    return new Promise(function(res, rej){
      try{
        var bin = atob(u.slice(u.indexOf(',') + 1));
        var out = new Uint8Array(bin.length);
        for(var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        res(out.buffer);
      }catch(e){ rej(e); }
    });
  }

  var count = 0;
  load(src).then(function(buf){
    var m = readGLB(buf);
    if(!m){ host.remove(); return; }
    function put(data, loc, n){
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
    }
    put(m.pos, aP, 3); put(m.nor, aN, 3);
    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    idxType = m.idx.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    if(idxType === gl.UNSIGNED_INT && !gl.getExtension('OES_element_index_uint')){ host.remove(); return; }
    count = m.idx.length;
    host.classList.add('ready');
    place(); kick();
  }).catch(function(){ host.remove(); });
  var idxType;

  /* ---- where it sits ----------------------------------------------------
     It opens near the top of the hero, travels down through most of the
     scroll, then returns to the bar and stays there. The two segments meet at
     the same point, so the dock is arrived at rather than snapped to. */
  var hero = document.querySelector('.hero');
  var TOP = 0.13, HOLD = 0.58;      // held until the hero is nearly gone
  var y = 0, rot = 0;

  function ease(t){ return t * t * (3 - 2 * t); }
  function span(){ return hero ? hero.offsetTop + hero.offsetHeight : 0; }
  function navY(){ return 58 / 2; }

  /* It keeps its place in the frame while the hero is on screen — the page
     slides past underneath it rather than carrying it down — and only leaves
     that spot to take up its position in the bar. */
  function place(){
    if(!hero || calm){ y = navY(); return; }
    var p = Math.min(Math.max(window.pageYOffset / Math.max(span(), 1), 0), 1);
    var start = TOP * window.innerHeight;
    y = p < HOLD ? start
                 : start + (navY() - start) * ease((p - HOLD) / (1 - HOLD));
  }

  /* Scroll drives the turn, and the trip is exactly one revolution, so the
     mark arrives in the bar face-front rather than on whatever angle the
     scroll happened to stop at — the difference between a placed object and
     a loose asset. Past the dock it keeps turning, far more slowly. */
  function turn(){
    if(calm) return 0.55;
    var sy = window.pageYOffset, sp = span();
    if(!sp) return sy * 0.0012;                         // no hero: starts face-on
    return Math.min(sy / sp, 1) * Math.PI * 2 + Math.max(0, sy - sp) * 0.0012;
  }

  /* ---- the turn ----------------------------------------------------------
     Orthographic on purpose: a 30px object gets nothing from perspective
     except distortion. The whole matrix is one rotation scaled uniformly, so
     depth stays in proportion with width and the z-buffer actually sorts the
     glyph's overlapping strokes — the counters and the extruded sides cross
     each other constantly as it turns, and without real depth they fight. */
  var TILT = 0.38;                    // held, so the face never goes fully edge-on

  function matrices(){
    var k = (W / 0.85) * 2 / BOX;     // mesh is 0.85 wide -> W css px -> clip units
    var cr = Math.cos(rot), sr = Math.sin(rot);
    var ct = Math.cos(TILT), st = Math.sin(TILT);
    // R = Rx(TILT) * Ry(rot), column-major
    var r00 = cr, r10 = st * sr,  r20 = -ct * sr;
    var r01 = 0,  r11 = ct,       r21 = st;
    var r02 = sr, r12 = -st * cr, r22 = ct * cr;
    gl.uniformMatrix4fv(uMVP, false, new Float32Array([
      r00 * k, r10 * k, r20 * k, 0,
      r01 * k, r11 * k, r21 * k, 0,
      r02 * k, r12 * k, r22 * k, 0,
      0,       0,       0,       1
    ]));
    // uniform scale, so the rotation alone is the normal matrix
    gl.uniformMatrix3fv(uNM, false, new Float32Array([
      r00, r10, r20,  r01, r11, r21,  r02, r12, r22
    ]));
  }

  var raf = null;
  function draw(){
    raf = null;
    if(!count) return;
    matrices();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, count, idxType, 0);
    host.style.transform = 'translate3d(-50%,' + y.toFixed(1) + 'px,0)';
  }
  function kick(){ if(raf === null) raf = requestAnimationFrame(draw); }

  function onScroll(){
    rot = turn();
    place(); kick();
  }
  /* Clicking it goes back to where it started. It is the only mark that is
     on every page and in every scroll position, so it is the obvious thing
     to reach for to get home — and a thing that moves and glows had better
     do something when pressed. */
  // On a page that has one, back to the top of the hero. On a page that does
  // not, the hero is on the homepage — so the mark is the way back to it
  // either way, which is what makes it worth having on every page.
  var back = document.querySelector('.nav-mark');
  host.setAttribute('role', 'button');
  host.setAttribute('tabindex', '0');
  host.setAttribute('aria-label', hero ? 'Back to the top' : 'Back to the homepage');
  host.style.pointerEvents = 'auto';
  var home = function(){
    if(hero) window.scrollTo({top:0, behavior: calm ? 'auto' : 'smooth'});
    else if(back) window.location.href = back.getAttribute('href');
  };
  host.addEventListener('click', home);
  host.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); home(); }
  });

  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', function(){ place(); kick(); });
  onScroll();
})();
