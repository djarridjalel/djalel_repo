/* Content overrides.
   Every editable node on the site carries a data-ed key. This reads whatever
   has been saved for those keys and writes it back over the nodes, so an edit
   made in the editor appears here without any file being hand-edited.

   Two sources, and which of them applies depends on how the page was opened:

     assets/content.json   the published copy — committed, served, seen by
                           everyone. Fetched relative to this script, so it
                           resolves the same from /index.html and /work/*.
                           Always applied.
     local storage         the editor's working copy, only ever in the
                           editor's own browser. Applied ONLY in preview,
                           which is any page opened with ?preview=1.

   That split is the point. Without it the person doing the editing sees
   their unpublished draft every time they visit their own site, and has no
   way to tell what a visitor actually sees — the site looks published when
   it isn't. The plain URL is therefore always the real thing, and the draft
   needs asking for. */
(function(){
  'use strict';
  var KEY = 'djarri:content';
  var PREVIEW = /(?:^|[?&])preview=1(?:&|$)/.test(location.search);

  // resolve against this file's own URL, not the page's
  var here = (document.currentScript && document.currentScript.src) || '';
  var jsonURL = here ? here.replace(/[^/]*$/, 'content.json') : 'assets/content.json';

  var published = null;

  function apply(data){
    if(!data) return;
    var t = data.texts || {}, im = data.images || {};
    Object.keys(t).forEach(function(k){
      // querySelectorAll, not querySelector: the client strip duplicates its
      // markup, so one key legitimately addresses several nodes
      [].forEach.call(document.querySelectorAll('[data-ed="' + k + '"]'), function(el){
        el.innerHTML = t[k];
      });
    });
    Object.keys(im).forEach(function(k){
      [].forEach.call(document.querySelectorAll('img[data-ed="' + k + '"]'), function(el){
        el.src = im[k];
        el.removeAttribute('srcset');
      });
    });
  }

  function draft(){
    try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch(e){ return null; }
  }

  function run(){
    apply(published);
    if(PREVIEW) apply(draft());
  }

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(run);

  // the published file, if there is one. It arrives after first paint, which
  // is why the draft is re-applied on top once it lands.
  if(window.fetch){
    fetch(jsonURL, {cache:'no-cache'}).then(function(r){
      return r.ok ? r.json() : null;
    }).then(function(d){
      if(!d) return;
      published = d;
      ready(run);
    }).catch(function(){ /* no published copy: nothing to do */ });
  }

  if(!PREVIEW) return;

  /* ---- preview -----------------------------------------------------------
     A preview that only works on the page it was opened at is not a preview
     of a site, it is a preview of a page: the first link out of it lands on
     the live version and the draft silently disappears. So every internal
     link carries the flag onward, and a bar says plainly which of the two
     this is — the one thing a preview must never leave in doubt. */
  function carry(){
    [].forEach.call(document.querySelectorAll('a[href]'), function(a){
      var raw = a.getAttribute('href');
      if(!raw || raw.charAt(0) === '#') return;      // same page, nothing to carry
      var u;
      try{ u = new URL(raw, location.href); }catch(e){ return; }
      if(u.origin !== location.origin) return;       // mailto:, tel:, another site
      if(!/(\.html?|\/)$/.test(u.pathname)) return;  // an asset, not a page
      u.searchParams.set('preview', '1');
      a.setAttribute('href', u.pathname + u.search + u.hash);
    });
  }

  function live(){
    var u = new URL(location.href);
    u.searchParams['delete']('preview');
    return u.pathname + (u.search === '?' ? '' : u.search) + u.hash;
  }

  function bar(){
    var css = document.createElement('style');
    css.textContent =
      '.dj-prev{position:fixed;left:0;right:0;bottom:0;z-index:9000;' +
        'display:flex;align-items:center;gap:14px;flex-wrap:wrap;' +
        'padding:11px 18px;background:#FFCE00;color:#0A0A0B;' +
        'font:500 12px/1.3 "IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;' +
        'letter-spacing:.08em;text-transform:uppercase;' +
        'box-shadow:0 -8px 24px rgba(0,0,0,.28)}' +
      '.dj-prev b{font-weight:700}' +
      '.dj-prev .sp{flex:1 1 auto}' +
      '.dj-prev a{color:#0A0A0B;text-decoration:none;' +
        'border:1px solid rgba(10,10,11,.42);border-radius:3px;padding:6px 11px}' +
      '.dj-prev a:hover{background:rgba(10,10,11,.1)}' +
      '@media (max-width:640px){.dj-prev{font-size:10px;padding:9px 12px;gap:9px}}';
    document.head.appendChild(css);

    var el = document.createElement('div');
    el.className = 'dj-prev';
    el.setAttribute('role', 'status');
    var d = draft(), n = d ? (Object.keys(d.texts||{}).length + Object.keys(d.images||{}).length) : 0;
    el.innerHTML =
      '<span><b>Preview</b> — ' + (n ? n + ' unpublished change' + (n===1?'':'s') : 'no unpublished changes') +
      '. Visitors do not see this.</span>' +
      '<span class="sp"></span>' +
      '<a href="' + live() + '">See the live page</a>' +
      '<a href="editor.html" data-ed-link>Back to the editor</a>';
    // the editor is at the site root, so a case study has to climb out to it
    if(/\/work\//.test(location.pathname)){
      el.querySelector('[data-ed-link]').setAttribute('href', '../editor.html');
    }
    document.body.appendChild(el);
    // give the page back the strip of itself the bar is sitting on
    document.body.style.paddingBottom = el.offsetHeight + 'px';
  }

  ready(function(){ carry(); bar(); });

  // the editor writes to storage in the other tab; reflect it here as it types
  addEventListener('storage', function(e){ if(e.key === KEY) run(); });
})();
