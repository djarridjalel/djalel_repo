/* Djarri Design Studio — shared behaviour.
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
    /* Half speed. The CSS duration is only the fallback for a script that
       never runs — this is what actually sets the pace, because the number
       of copies, and so the length of the track, depends on the window. */
    var SPEED = 43;                                   // px/s, half of the original 86
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
              '[role="button"],[tabindex]:not([tabindex="-1"]),' +
              '.reel-card:not(.on)';   // the sheets are picked by clicking now
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
        /* Where in the fan this sheet sits. The chosen one takes the hero
           slot, hard against the outer edge of the frame, and the others
           queue inward behind it in the order they are written. It is a
           permutation of 0..n-1, so no two sheets ever land on the same
           slot — which is what went wrong the last time position was
           derived from the selection: a distance clamped at both ends put
           the sheet two before the current one exactly on the one two
           after it, and two of the five became unpointable. */
        var p = i === at ? 0 : (i < at ? i + 1 : i);
        c.style.setProperty('--p', p);
        c.style.setProperty('--o', o);
        c.style.setProperty('--ao', Math.abs(o));
        c.style.setProperty('--co', co);
        c.style.setProperty('--cao', Math.abs(co));
        c.classList.toggle('on', o === 0);
        if(dots[i]){
          dots[i].classList.toggle('on', o === 0);
          dots[i].setAttribute('aria-current', o === 0 ? 'true' : 'false');
        }
      });
    }
    function to(i){
      i = Math.max(0, Math.min(n - 1, i));               // the row has ends now
      if(i === at) return;
      at = i; paint();
    }
    function go(d){ to(at + d); }

    /* Picking a sheet is a click, on every input. The row is a deliberate
       choice about what to look at, not something the pointer trips over on
       its way past.

       Selecting on hover needed a guard against its own feedback: the row
       slid, which moved a different sheet under a pointer that had not
       moved, which the browser reported as another mouseenter, which
       selected again. A click carries no such loop, so the guard is gone
       with it. */
    /* ---- the dots ------------------------------------------------------
       One mark per sheet, under the deck. The sheets themselves are still
       pickable, but a 39px band is a poor target and an ambiguous one — the
       dots say plainly how many there are, which one you are on, and give
       every sheet the same easy hit. They are built here rather than written
       into the page because their count is the deck's count, and because a
       control that only works with the script should only exist with it. */
    var dots = [];
    var dotRow = document.createElement('div');
    dotRow.className = 'reel-dots';
    dotRow.setAttribute('role', 'group');
    dotRow.setAttribute('aria-label', 'Choose a sheet');
    cards.forEach(function(c, i){
      var b = document.createElement('button');
      var name = c.querySelector('.reel-cap b');
      b.type = 'button';
      b.className = 'reel-dot';
      b.setAttribute('aria-label', name ? name.textContent : 'Sheet ' + (i + 1));
      b.addEventListener('click', function(){ to(i); hold(); });
      dotRow.appendChild(b);
      dots.push(b);
    });
    reel.appendChild(dotRow);

    /* ---- the turn ------------------------------------------------------
       The deck turns itself over every two seconds, so a visitor who never
       touches it still sees all five sheets.

       It stops whenever it would be rude or pointless: under the pointer or
       keyboard focus, because that is someone reading one sheet on purpose;
       off screen, because nothing is watching; on a hidden tab; and for
       anyone who has asked for less motion. A manual pick restarts the
       clock rather than leaving the next turn to land a fraction of a second
       later. */
    var TURN = 2000;
    var beat = null, held = false, seen = false;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    function run(){
      if(beat === null && seen && !held && !still.matches && !document.hidden){
        beat = setInterval(function(){ at = (at + 1) % n; paint(); }, TURN);
      }
    }
    function stop(){ if(beat !== null){ clearInterval(beat); beat = null; } }
    function hold(){ stop(); run(); }
    function grab(v){ held = v; v ? stop() : run(); }
    reel.addEventListener('mouseenter', function(){ grab(true); });
    reel.addEventListener('mouseleave', function(){ grab(false); });
    reel.addEventListener('focusin',    function(){ grab(true); });
    reel.addEventListener('focusout',   function(){ grab(false); });
    document.addEventListener('visibilitychange', function(){ document.hidden ? stop() : run(); });
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        es.forEach(function(e){ seen = e.isIntersecting; seen ? run() : stop(); });
      }, {threshold: 0.25}).observe(reel);
    } else { seen = true; run(); }

    /* Selection no longer cares what kind of pointer this is — a click is a
       click. The lens still does: it is a hover effect, so it is built only
       where there is a real pointer to drive it. */
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var dragged = false;               // set by the stage below; a drag is not a pick
    cards.forEach(function(c, i){
      c.addEventListener('click', function(){
        if(dragged) return;            // the flick already chose; don't choose twice
        to(i); hold();
      });
    });

    reel.addEventListener('click', function(e){
      var arm = e.target.closest('[data-arm]');
      if(arm){ go(+arm.getAttribute('data-arm')); hold(); }
    });

    reel.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft'){ e.preventDefault(); go(-1); hold(); }
      else if(e.key === 'ArrowRight'){ e.preventDefault(); go(1); hold(); }
    });

    /* Drag, for a thumb as much as for a trackpad. The threshold is a
       fraction of the stage rather than a fixed count of pixels, so the same
       flick means the same thing on a phone and on a wide screen. */
    var stage = reel.querySelector('.reel-stage'), down = null;
    if(stage){
      stage.addEventListener('pointerdown', function(e){ if(!e.button){ down = e.clientX; dragged = false; } });
      stage.addEventListener('pointerup', function(e){
        if(down === null) return;
        var dx = e.clientX - down;
        down = null;
        /* A flick steps the row; the click that follows it must not then
           select whatever sheet the finger happened to lift over. Anything
           shorter than the threshold is a click that wandered a little, and
           is still a pick. */
        if(Math.abs(dx) > stage.clientWidth * 0.04){ dragged = true; go(dx < 0 ? 1 : -1); hold(); }
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
        var leaving = false;      // the pointer left the sheet, rather than paused on it
        var GRACE = 90;           // how long stillness is tolerated before it fades
        var BEND = 0.088;         // how far out the middle of the disc reads
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
          /* There may be no canvas yet. Selecting slides the row, which drags
             sheets out from under a pointer that never moved over them, and
             each of those gets a mouseleave without ever having had a
             mousemove — so the lens it is being asked to put out was never
             built. Cheap to say so here rather than at all three callers. */
          if(!cv) return;
          var dt = last ? Math.min(64, now - last) : 16; last = now;
          /* The lens is a consequence of movement, not of presence. Holding
             the pointer still over a sheet lets it drain away; moving again
             brings it back. */
          if(want > 0 && now - moved > GRACE) want = 0;
          /* Opening takes 240ms. Pausing takes 2.5s to undo, which also
             means a gap in the event stream costs a barely visible dip
             rather than a blink: GRACE still decides when the pointer has
             stopped, but it no longer has to be right about it to the frame.

             Leaving the sheet is a different gesture and gets its own exit.
             At 2.5s the disc would still be lit on a sheet the hand left
             two sheets ago — riding along as that sheet slides aside and
             blurs out, which reads as something stuck rather than
             something fading. */
          var rate = want > amt ? dt / 240 : (leaving ? dt / 260 : dt / 2500);
          amt += (want > amt ? 1 : -1) * rate;
          if(amt > 1) amt = 1; if(amt < 0) amt = 0;
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
          leaving = false;
          if(!cv){
            cv = document.createElement('canvas');
            cv.className = 'reel-lens';
            cv.setAttribute('aria-hidden', 'true');
            sheet.appendChild(cv);
          }
          want = 1; kick();
        });
        sheet.addEventListener('mouseleave', function(){ leaving = true; want = 0; kick(); });
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
