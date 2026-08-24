/* Content overrides.
   Every editable node on the site carries a data-ed key. This reads whatever
   the editor has saved and writes it back over those nodes, so a change made
   in /editor.html shows up here immediately without the files being touched.

   Two sources, in order: assets/content.json if it exists (that is the
   committed, published copy, the one every visitor sees) and then whatever is
   in this browser's local storage (the working copy, only ever visible to the
   person editing). Local wins, so an edit previews on top of what is live.

   Runs before first paint where it can: the script tag is not deferred, and
   the DOM it needs is above it. */
(function(){
  'use strict';
  var KEY = 'djarri:content';

  function apply(data){
    if(!data) return;
    var t = data.texts || {}, im = data.images || {};
    Object.keys(t).forEach(function(k){
      // querySelectorAll, not querySelector: the client strip duplicates its
      // markup, so one key legitimately addresses several nodes
      var nodes = document.querySelectorAll('[data-ed="' + k + '"]');
      [].forEach.call(nodes, function(el){ el.innerHTML = t[k]; });
    });
    Object.keys(im).forEach(function(k){
      var nodes = document.querySelectorAll('img[data-ed="' + k + '"]');
      [].forEach.call(nodes, function(el){
        el.src = im[k];
        el.removeAttribute('srcset');
      });
    });
  }

  function local(){
    try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch(e){ return null; }
  }

  function run(){
    apply(window.__djarriPublished || null);
    apply(local());
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  // the editor writes to storage in another tab; reflect it live
  addEventListener('storage', function(e){ if(e.key === KEY) run(); });
})();
