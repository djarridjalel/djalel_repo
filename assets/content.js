/* Content overrides.
   Every editable node on the site carries a data-ed key. This reads whatever
   has been saved for those keys and writes it back over the nodes, so an edit
   made in /editor.html appears here without any file being hand-edited.

   Two sources, applied in order:
     assets/content.json   the published copy — committed, served, seen by
                           everyone. Fetched relative to this script, so it
                           resolves the same from /index.html and /work/*.
     local storage         the working copy, only ever in the editor's own
                           browser. Applied second, so an unexported edit
                           previews on top of what is live.
   Either may be absent; a missing content.json is the normal case and is
   ignored rather than logged. */
(function(){
  'use strict';
  var KEY = 'djarri:content';

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

  function local(){
    try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch(e){ return null; }
  }

  function run(){ apply(published); apply(local()); }

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(run);

  // the published file, if there is one. It arrives after first paint, which
  // is why the local copy is re-applied on top once it lands.
  if(window.fetch){
    fetch(jsonURL, {cache:'no-cache'}).then(function(r){
      return r.ok ? r.json() : null;
    }).then(function(d){
      if(!d) return;
      published = d;
      ready(run);
    }).catch(function(){ /* no published copy: nothing to do */ });
  }

  // the editor writes to storage in another tab; reflect it live
  addEventListener('storage', function(e){ if(e.key === KEY) run(); });
})();
