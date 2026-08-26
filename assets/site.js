/* Djarri Design Portfolio — shared behaviour.
   index.html carries the hero's own script inline and does not load this
   file's accent code twice; the nav is the only part it shares. */
(function(){
  'use strict';

  /* ---- the bar ----------------------------------------------------------
     On the homepage it stays out of the way until the hero has gone by. The
     hero already carries the wordmark and the credentials rail, so a bar laid
     over it would only repeat them on top of the composition. */
  var nav = document.querySelector('.nav');
  if(nav && nav.hasAttribute('data-reveal-after')){
    var after = document.querySelector(nav.getAttribute('data-reveal-after'));
    var apply = function(hidden){ nav.classList.toggle('nav-hidden', hidden); };
    apply(true);
    if(after && 'IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        // hidden while any part of the hero is still on screen
        apply(es[0].isIntersecting);
      }, {threshold:0, rootMargin:'-40px 0px 0px 0px'}).observe(after);
    }else{
      apply(false);
    }
  }

  /* ---- the client strip -------------------------------------------------
     The loop is two identical halves and the animation walks exactly one
     half-width, which reads as continuous only while a half is at least as
     wide as the window. A half has a ceiling: both the slot width and its
     margin clamp out, so past about 3270px the strip runs out of logos
     before the cycle ends and a gap crosses the screen — visible on an
     ultrawide monitor, or on any large display the user has zoomed out.
     So the number of copies is measured rather than assumed. */
  (function(){
    var track = document.querySelector('.track');
    var marquee = track && track.closest('.marquee');
    if(!track || !marquee) return;

    var initial = [].slice.call(track.children);
    if(initial.length < 2) return;
    var SPEED = 86;                                   // px/s, from the original 38s
    var perSet = initial.length / 2;                  // the markup ships exactly two
    var setHTML = initial.slice(0, perSet).map(function(el){ return el.outerHTML; }).join('');
    var copies = 2;

    // the first set carries the client names; every copy after it is the same
    // logos again and is hidden from assistive tech, whether it came from the
    // markup or from a rebuild
    function label(){
      [].forEach.call(track.children, function(el, i){
        if(i < perSet){ el.removeAttribute('aria-hidden'); return; }
        el.setAttribute('aria-hidden', 'true');
        var img = el.querySelector('img');
        if(img) img.alt = '';
      });
    }

    function fit(){
      var setW = track.scrollWidth / copies;
      if(!setW) return;
      // half the track has to cover the window; the count stays even so the
      // 50% the animation travels lands exactly on a set boundary
      var want = Math.max(2, 2 * Math.ceil(marquee.clientWidth / setW));
      if(want !== copies){
        copies = want;
        track.innerHTML = new Array(want + 1).join(setHTML);
        setW = track.scrollWidth / copies;
      }
      label();
      // speed stays constant however many copies it took
      track.style.animationDuration = ((setW * copies / 2) / SPEED).toFixed(2) + 's';
    }

    fit();
    var t = null;
    addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(fit, 160); });
    // web fonts land after first paint and change the slot widths with them
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

  /* ---- the pointer ------------------------------------------------------
     A 10px accent dot with a halo, standing in for the arrow. It opens into
     a ring over anything clickable: hiding the native cursor throws away the
     hand pointer, and that affordance has to come back rather than just go
     missing.

     Nothing here is scaled. The wrapper translates, the inner element
     resizes, and the two jobs are kept on separate elements — scaling a
     promoted layer stretches the bitmap it was rasterised from, which is
     what made the ring soft and stair-stepped. There is no animation loop
     either: the size change is a CSS transition and the position is written
     once per frame, with no easing, because a trailing cursor reads as lag
     rather than as craft. */
  (function(){
    if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var dot = document.createElement('div');
    dot.className = 'dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.appendChild(document.createElement('i'));
    document.body.appendChild(dot);
    document.documentElement.classList.add('has-dot');

    var HOT = 'a[href],button,input,select,textarea,summary,label,' +
              '[role="button"],[tabindex]:not([tabindex="-1"])';
    var x = 0, y = 0, raf = null, seeded = false;

    function draw(){
      raf = null;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    }

    addEventListener('mousemove', function(e){
      x = e.clientX; y = e.clientY;
      dot.classList.toggle('hot', !!(e.target && e.target.closest && e.target.closest(HOT)));
      if(!seeded){ seeded = true; draw(); dot.classList.add('on'); return; }
      if(raf === null) raf = requestAnimationFrame(draw);
    }, {passive:true});

    // leaving the window, or crossing into browser chrome, should take it away
    addEventListener('mouseout', function(e){
      if(!e.relatedTarget && !e.toElement) dot.classList.remove('on');
    });
    addEventListener('mouseover', function(){ if(seeded) dot.classList.add('on'); });
    addEventListener('blur', function(){ dot.classList.remove('on'); });
  })();

  /* ---- the reel ---------------------------------------------------------
     The homepage gallery. Everything about how a sheet looks at a given
     distance from the current one lives in the stylesheet; this decides only
     what that distance is.

     The sheets never reorder. A card's offset is simply its place in the
     markup minus the current one, so the row keeps the order it was written
     in and the whole strip slides until the pointed-at sheet is centred —
     point at the leftmost and it comes to the middle with the other four
     ranged to its right, exactly as they were. Wrapping the offsets the
     short way round would have kept the fan balanced at every position, but
     it teleports a sheet from one end of the row to the other to do it, and
     a row that reorders itself under the pointer is not a row any more.

     Two numbers come out of it. The true offset places the sheet along the
     row and sets how far out of focus it is; a copy of it clamped to two
     handles the turn and the scale, which have to stop somewhere or the
     fifth sheet from centre would be edge-on and microscopic.

     Pointing selects. Nothing here navigates and nothing responds to a
     click: the case study is reached by the line under the reel. On a touch
     screen there is no pointing, so a tap selects instead — the arms are
     there for the same reason, and for the keyboard. */
  [].forEach.call(document.querySelectorAll('[data-reel]'), function(reel){
    var cards = [].slice.call(reel.querySelectorAll('.reel-card'));
    var n = cards.length;
    if(n < 2) return;

    // open on the middle sheet, so the row is balanced before it is touched
    var at = Math.floor(n / 2);

    function paint(){
      cards.forEach(function(c, i){
        var o = i - at;                                  // order is never changed
        var co = Math.max(-2, Math.min(2, o));           // turn and scale stop here
        c.style.setProperty('--o', o);
        c.style.setProperty('--ao', Math.abs(o));
        c.style.setProperty('--co', co);
        c.style.setProperty('--cao', Math.abs(co));
        c.classList.toggle('on', o === 0);
      });
    }
    function to(i){
      i = Math.max(0, Math.min(n - 1, i));               // the row has ends now
      if(i === at) return;
      at = i; paint();
    }
    function go(d){ to(at + d); }

    /* Pointing at a sheet selects it — but only a real pointer. A touch
       screen reports a hover on tap, and taking it here as well as in the
       tap below would count one tap twice.

       The guard is the whole trick. Selecting slides the row, which moves a
       different sheet under a pointer that has not moved, which the browser
       reports as another mouseenter, which selects again — the row runs away
       on its own and settles wherever the churn happens to end. A
       synthesized enter of that kind carries the pointer's current position,
       and the pointer is exactly where it was when the last one was
       accepted; a real one cannot be. So the position is what is tested, not
       the event. */
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var held = null;
    cards.forEach(function(c, i){
      if(!fine){ c.addEventListener('click', function(){ to(i); }); return; }
      c.addEventListener('mouseenter', function(e){
        // exactly equal, not merely close: a synthesized enter carries the
        // pointer's current position unchanged, so it matches to the pixel,
        // while a real move of even one pixel does not. A tolerance here
        // throws away slow, deliberate movement — the kind used to pick out
        // one sheet from the next — and the reel stops answering it.
        if(held && e.clientX === held.x && e.clientY === held.y) return;
        held = {x:e.clientX, y:e.clientY};
        to(i);
      });
    });
    /* The row is evenly pitched, so a step lands the next sheet on exactly
       the position the last one occupied. That is what makes the guard above
       necessary — and also what makes it wrong at the door: leave the reel,
       read something, come back to the same sheet, and the enter arrives at
       a position the guard still holds as the last one it accepted. Leaving
       is the end of that gesture, so it forgets. */
    if(fine) reel.addEventListener('mouseleave', function(){ held = null; });

    reel.addEventListener('click', function(e){
      var arm = e.target.closest('[data-arm]');
      if(arm) go(+arm.getAttribute('data-arm'));
    });

    reel.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft'){ e.preventDefault(); go(-1); }
      else if(e.key === 'ArrowRight'){ e.preventDefault(); go(1); }
    });

    /* Drag, for a thumb as much as for a trackpad. The threshold is a
       fraction of the stage rather than a fixed count of pixels, so the same
       flick means the same thing on a phone and on a wide screen. */
    var stage = reel.querySelector('.reel-stage'), down = null;
    if(stage){
      stage.addEventListener('pointerdown', function(e){ if(!e.button) down = e.clientX; });
      stage.addEventListener('pointerup', function(e){
        if(down === null) return;
        var dx = e.clientX - down;
        down = null;
        if(Math.abs(dx) > stage.clientWidth * 0.04) go(dx < 0 ? 1 : -1);
      });
      stage.addEventListener('pointercancel', function(){ down = null; });
    }

    /* ---- the lens ------------------------------------------------------
       A patch of the picture, re-drawn warped, laid exactly over the part it
       replaces.

       Every earlier attempt put a whole transformed copy on top and cut a
       hole for it, and every one of them had a boundary: a uniform scale
       displaces a pixel in proportion to its distance from the centre, so
       the displacement is largest exactly where the two copies have to meet.
       The displacement has to fall to zero at the rim instead, which means
       it has to vary per pixel, which no CSS transform can do.

       So the interior is drawn a pixel at a time. Each pixel asks where it
       should be reading from: a point at distance d from the pointer takes
       its colour from d * k(d) instead, with k above one inside the disc and
       exactly one at the rim. Sampling from further out is what pulls the
       picture inward. The bend is zero at the centre — a point on the axis
       has nowhere to move — rises through the middle of the disc, and
       returns to zero at the edge, which is a real lens profile and is what
       the reference shows.

       Dispersion comes free. Red, green and blue are bent by slightly
       different amounts in the same pass, which is what dispersion is,
       rather than three offset copies of a picture stacked up.

       The cost is bounded: only the sheet in focus has a lens, the canvas
       is only as big as the aperture, and the distance-to-bend curve is a
       lookup table indexed by squared distance, so the inner loop has no
       square root in it. */
    if(fine){
      cards.forEach(function(c){
        var sheet = c.querySelector('.reel-sheet'), img = sheet && sheet.querySelector('img');
        if(!sheet || !img) return;

        var cv = null, ctx = null, src = null, sctx = null, out = null;
        var DPR = Math.min(2, window.devicePixelRatio || 1);
        var R = 0, S = 0, srcW = 0, srcH = 0, srcKey = '';
        var amt = 0, want = 0, raf = null, last = 0, px = 0, py = 0;
        var moved = 0;            // when the pointer last actually moved
        var GRACE = 90;           // how long stillness is tolerated before it fades
        var BEND = 0.147;         // how far out the middle of the disc reads
        var SPREAD = 0.0525;      // how much further red goes than blue
        var lutB = null, lutD = null;

        function radius(){
          var b = sheet.getBoundingClientRect();
          return Math.max(60, Math.min(b.width, b.height) * 0.435);
        }

        /* the source: the sheet's own picture at the size it is displayed,
           so a pixel here is a pixel there. Rebuilt when the sheet resizes
           or the picture is swapped, not per frame. */
        function source(){
          var b = sheet.getBoundingClientRect();
          var w = Math.round(b.width * DPR), h = Math.round(b.height * DPR);
          var key = w + 'x' + h + '|' + img.currentSrc;
          if(src && key === srcKey) return true;
          if(!img.complete || !img.naturalWidth) return false;
          src = src || document.createElement('canvas');
          src.width = w; src.height = h;
          sctx = src.getContext('2d', {willReadFrequently:true});
          // object-fit: cover, computed by hand — the canvas has no such thing
          var s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
          var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
          sctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
          try{ out = sctx.getImageData(0, 0, w, h); }catch(e){ return false; }
          srcW = w; srcH = h; srcKey = key;
          return true;
        }

        /* Two curves, not one, because the bend and the dispersion are
           strongest in different places.

           The bend has to be zero on the axis — a point at the centre has
           nowhere to move — and zero at the rim, or there is a boundary. It
           peaks in between, which is the profile the reference shows.

           The dispersion is a property of how hard the light is being bent,
           not of how far the picture has moved, so it belongs near the edge
           where a real lens bends most: barely there on the axis, rising
           through the disc, and brought back to nothing in the last of it
           so the split does not simply stop at the rim and draw the ring
           all over again. */
        function tables(n){
          if(lutB && lutB.length === n) return;
          lutB = new Float32Array(n);
          lutD = new Float32Array(n);
          for(var i = 0; i < n; i++){
            var t = Math.sqrt(i / (n - 1));        // 0 at the centre, 1 at the rim
            lutB[i] = Math.sin(Math.PI * t) * (1 - t) * 1.9;   // 0, up, 0
            lutD[i] = t * t * (1 - t) * 6.75;                  // 0, up late, 0
          }
        }

        function draw(){
          var r = Math.round(R * DPR), n = r * 2;
          if(cv.width !== n){ cv.width = n; cv.height = n; ctx = cv.getContext('2d'); }
          var im = ctx.createImageData(n, n), d = im.data, sd = out.data;
          tables(r * r + 1);
          var kb = lutB, kd = lutD, lim = kb.length;
          var ox = Math.round(px * DPR) - r, oy = Math.round(py * DPR) - r;
          var bend = BEND * amt, sp = SPREAD * amt;
          for(var y = 0; y < n; y++){
            var dy = y - r + 0.5;
            for(var x = 0; x < n; x++){
              var dx = x - r + 0.5;
              var q = (dx * dx + dy * dy) | 0;
              var o = (y * n + x) * 4;
              if(q >= lim){ d[o + 3] = 0; continue; }
              var fb = kb[q] * bend, fd = kd[q] * sp;
              // three bends, one per channel — the dispersion
              for(var ch = 0; ch < 3; ch++){
                var m = 1 + fb + (ch - 1) * fd;
                var sx = (ox + r + dx * m) | 0, sy = (oy + r + dy * m) | 0;
                if(sx < 0) sx = 0; else if(sx >= srcW) sx = srcW - 1;
                if(sy < 0) sy = 0; else if(sy >= srcH) sy = srcH - 1;
                d[o + ch] = sd[(sy * srcW + sx) * 4 + ch];
              }
              d[o + 3] = 255;
            }
          }
          ctx.putImageData(im, 0, 0);
          cv.style.left = (px - R) + 'px';
          cv.style.top  = (py - R) + 'px';
          cv.style.width  = (R * 2) + 'px';
          cv.style.height = (R * 2) + 'px';
        }

        function tick(now){
          raf = null;
          var dt = last ? Math.min(64, now - last) : 16; last = now;
          /* The lens is a consequence of movement, not of presence. Holding
             the pointer still over a sheet puts it out; moving again brings
             it back. */
          if(want > 0 && now - moved > GRACE) want = 0;
          /* Opening still takes 240ms. Closing takes none: the moment the
             pointer stops — or leaves the sheet — the glass is gone on that
             frame rather than draining away. GRACE is what decides that the
             pointer has stopped, and it is doing more work now than it was:
             with no fade to soften a gap in the event stream, anything under
             it would read as a blink rather than a dip. */
          if(want <= 0){ amt = 0; }
          else { amt += dt / 240; if(amt > 1) amt = 1; }
          if(amt <= 0){ cv.style.display = 'none'; last = 0; return; }
          if(!source()){ last = 0; return; }
          cv.style.display = 'block';
          R = radius();
          draw();
          // keep running while it is fading, and while it is up waiting to
          // find out whether the pointer has stopped
          raf = requestAnimationFrame(tick);
        }
        function kick(){ if(raf === null) raf = requestAnimationFrame(tick); }

        sheet.addEventListener('mousemove', function(e){
          if(!c.classList.contains('on')) return;
          var b = sheet.getBoundingClientRect();
          if(!b.width) return;
          px = e.clientX - b.left; py = e.clientY - b.top;
          moved = (window.performance || Date).now();
          if(!cv){
            cv = document.createElement('canvas');
            cv.className = 'reel-lens';
            cv.setAttribute('aria-hidden', 'true');
            sheet.appendChild(cv);
          }
          want = 1; kick();
        });
        sheet.addEventListener('mouseleave', function(){ want = 0; kick(); });
      });
    }

    paint();
  });

  /* ---- concept lines resolve as they enter ------------------------------
     The one motion act two gets. .rv starts at opacity 0, so anything
     carrying it is invisible until this runs — on a case study that includes
     the h1, which is why this cannot live only in the homepage's script.
     Both fallbacks below show the text rather than hiding it. */
  (function(){
    var targets = document.querySelectorAll('.rv');
    if(!targets.length) return;
    if(!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      [].forEach.call(targets, function(el){ el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        // stagger a tension/concept pair so the sentence lands before the idea
        var d = +(en.target.dataset.rvDelay || 0);
        setTimeout(function(){ en.target.classList.add('in'); }, d);
        io.unobserve(en.target);
      });
    }, {threshold:.15, rootMargin:'0px 0px -8% 0px'});
    [].forEach.call(targets, function(el){ io.observe(el); });
  })();

  /* ---- the accent -------------------------------------------------------
     Every character is its own switch: a letter is either inside the pool and
     fully the accent, or outside it and untouched. Nothing is ever half a
     colour, so a glyph is never cut in two by a gradient edge crossing it.

     The homepage runs its own copy inline, alongside the hero's parallax and
     lens, which share the same pointer plumbing. Running this one there too
     would split every character a second time — nesting a .ch inside each
     .ch — and bind two listeners to every zone. The bar above is the only
     part of this file the homepage wants. */
  if(document.querySelector('.hero')) return;
  if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var zones = document.querySelectorAll('.gt-zone');
  if(!zones.length) return;

  function split(root){
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, nodes = [];
    while((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function(node){
      var t = node.nodeValue;
      if(!/\S/.test(t)) return;
      var frag = document.createDocumentFragment();
      for(var i = 0; i < t.length; i++){
        if(/\s/.test(t[i])){ frag.appendChild(document.createTextNode(t[i])); continue; }
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = t[i];
        frag.appendChild(s);
      }
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* Character boxes, measured once per hover rather than once per frame:
     reading a rect per glyph per mousemove would force a layout flush on every
     one of them. Layout cannot change while the pointer is inside a zone, so
     the cache only has to survive until it leaves — or until the page scrolls
     or resizes underneath it, since the rects are viewport relative and the
     pointer coordinates they are compared against are too. */
  var caches = new WeakMap();
  function measure(zone){
    var got = caches.get(zone);
    if(got) return got;
    var r = parseFloat(getComputedStyle(zone).getPropertyValue('--gt-r')) || 110;
    var out = [];
    [].forEach.call(zone.querySelectorAll('.ch'), function(el){
      var b = el.getBoundingClientRect();
      if(!b.width && !b.height) return;
      out.push({el:el, x:b.left + b.width/2, y:b.top + b.height/2, r2:r*r, lit:false});
    });
    caches.set(zone, out);
    return out;
  }
  function drop(zone){ caches['delete'](zone); }

  [].forEach.call(zones, function(zone){
    [].forEach.call(zone.classList.contains('gt') ? [zone] : zone.querySelectorAll('.gt'), split);

    var frame = null, last = null;
    zone.addEventListener('mouseenter', function(){ drop(zone); });
    zone.addEventListener('mouseleave', function(){
      measure(zone).forEach(function(c){ c.lit = false; c.el.classList.remove('on'); });
      drop(zone);
    });
    zone.addEventListener('mousemove', function(e){
      last = e;
      if(frame !== null) return;               // one paint per frame, not per event
      frame = requestAnimationFrame(function(){
        frame = null;
        var chars = measure(zone);
        for(var i = 0; i < chars.length; i++){
          var c = chars[i], dx = last.clientX - c.x, dy = last.clientY - c.y;
          var lit = dx*dx + dy*dy <= c.r2;     // squared: the radius is fixed per zone
          if(lit !== c.lit){ c.lit = lit; c.el.classList.toggle('on', lit); }
        }
      });
    });
  });

  var flush = function(){ [].forEach.call(zones, drop); };
  addEventListener('scroll', flush, {passive:true});
  addEventListener('resize', flush);
})();
