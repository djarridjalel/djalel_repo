/* Djarri Design — only what motion and the overlay require.
   No content is built here. Everything on the page exists in the HTML;
   this file toggles classes, moves focus, and refreshes one date. */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* -- 1. The batch line ---------------------------------------------------
     Written into the HTML at author time so it is correct with JS blocked;
     refreshed here so it is correct on the day it is read. */
  var batch = document.getElementById('batch');
  if (batch) {
    var d = new Date();
    var pad = function (n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; };
    var doy = Math.floor(
      (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5
    );
    batch.textContent =
      'LOT DJ-' + String(d.getFullYear()).slice(2) + pad(doy, 3) +
      ' · MFD ' + d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) +
      ' · REV 01';
  }

  /* -- 2. Reveal: 400ms opacity + 8px, once, never replayed --------------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (items.length) {
    if (reduce.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
      items.forEach(function (el) { io.observe(el); });
    }
  }

  /* -- 3. Plates ------------------------------------------------------------
     The overlay itself is CSS :target, so a sheet opens full size even with
     this file blocked. What follows is the part CSS cannot do: scroll lock,
     focus, and Escape. */
  function currentPlate() {
    if (!location.hash || location.hash.length < 2) return null;
    var el;
    try { el = document.querySelector(location.hash); } catch (err) { return null; }
    return el && el.classList.contains('plate') ? el : null;
  }

  function sync() {
    var plate = currentPlate();
    docEl.classList.toggle('plate-open', !!plate);
    if (!plate) return;
    var close = plate.querySelector('[data-plate-close]');
    if (close) close.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', sync);
  sync();

  document.addEventListener('keydown', function (e) {
    var plate = currentPlate();
    if (!plate) return;
    var close = plate.querySelector('[data-plate-close]');
    if (!close) return;

    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      close.click();
    } else if (e.key === 'Tab') {
      /* Only one control in the overlay: hold focus on it. */
      e.preventDefault();
      close.focus({ preventScroll: true });
    }
  });
}());
