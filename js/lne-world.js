/* Learning Never Ends - the living world (sci-fi stage 2)
   Makes the app feel like a place you are inside: a starfield with real depth that drifts and
   reacts to scrolling and to tilting the phone, a rare shooting star, a slow scan beam, a short
   "entering the universe" moment once per visit, and a quick warp when you move between pages.
   Light by design: one small canvas at 30 frames a second, paused when the tab is hidden, switched
   off for reduced motion and for Data Saver, fewer stars on weak phones. No images, no fonts. */
(function () {
  'use strict';
  if (window.LNE_WORLD) return;
  var reduce = false, save = false, weak = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  try { save = !!(navigator.connection && navigator.connection.saveData); } catch (e) {}
  try { weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2); } catch (e) {}
  var d = document, root = d.documentElement;
  window.LNE_WORLD = { on: false };

  /* ---- comfort: Auto (warm at night) / Day / Night / Calm (no motion). Kept on this phone. ---- */
  function comfortMode() { try { return localStorage.getItem('lne_comfort') || 'auto'; } catch (e) { return 'auto'; } }
  function effective(m) { if (m !== 'auto') return m; var h = new Date().getHours(); return (h >= 20 || h < 6) ? 'night' : 'day'; }
  function applyComfort() { root.setAttribute('data-comfort', effective(comfortMode())); }
  applyComfort();
  function buildComfort() {
    try {
      if (!d.getElementById('lneTint')) { var tint = d.createElement('div'); tint.id = 'lneTint'; tint.setAttribute('aria-hidden', 'true'); d.body.appendChild(tint); }
      if (d.getElementById('lneComfort')) return;
      var sel = d.createElement('select'); sel.id = 'lneComfort'; sel.setAttribute('aria-label', 'Comfort'); sel.title = 'Comfort';
      [['auto', 'Auto'], ['day', 'Day'], ['night', 'Night'], ['calm', 'Calm']].forEach(function (o) { var op = d.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
      sel.value = comfortMode();
      sel.onchange = function () { var was = root.getAttribute('data-comfort'); try { localStorage.setItem('lne_comfort', sel.value); } catch (e) {} applyComfort(); if ((was === 'calm') !== (root.getAttribute('data-comfort') === 'calm')) location.reload(); };
      var lang = d.getElementById('lneLang'), size = d.getElementById('lneSize');
      if (lang && lang.parentNode) lang.parentNode.insertBefore(sel, lang.nextSibling);
      else if (size && size.parentNode) size.parentNode.insertBefore(sel, size.nextSibling);
      else return;
    } catch (e) {}
  }
  function ready0(fn) { if (d.body) fn(); else d.addEventListener('DOMContentLoaded', fn); }

  /* ---- artwork banners: <div class="lne-art" data-art="hero" data-h="160"></div> becomes a small compressed picture.
     Skipped entirely on Data Saver. Pictures are decoration only (empty alt text). ---- */
  function fillArt() {
    try {
      var nodes = d.querySelectorAll('.lne-art[data-art]:not([data-done])');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i]; el.setAttribute('data-done', '1');
        if (save) { el.style.display = 'none'; continue; }
        var img = new Image(); img.alt = ''; img.decoding = 'async'; img.loading = 'lazy';
        img.style.objectPosition = el.getAttribute('data-pos') || '50% 40%';
        el.style.height = (parseInt(el.getAttribute('data-h'), 10) || 150) + 'px';
        (function (box) { img.onerror = function () { box.style.display = 'none'; }; })(el);
        img.src = 'css/art-' + el.getAttribute('data-art') + '.webp?v=1';
        el.appendChild(img);
      }
    } catch (e) {}
  }
  ready0(function () { fillArt(); try { var t = 0; new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = 0; fillArt(); }, 60); }).observe(d.body, { childList: true, subtree: true }); } catch (e) {} });
  ready0(function () { var n = 0, t = setInterval(function () { buildComfort(); if (d.getElementById('lneComfort') || ++n > 12) clearInterval(t); }, 250); });
  if (reduce || save || root.getAttribute('data-comfort') === 'calm') return;

  function ready(fn) { if (d.body) fn(); else d.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var cv = d.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.id = 'lneWorld';
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
    d.body.insertBefore(cv, d.body.firstChild);
    var c = cv.getContext('2d'); if (!c) return;
    var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), stars = [], shoot = null, warp = 0, tiltX = 0, tiltY = 0, scrollY = 0, last = 0, hidden = false, nextShoot = 6000 + Math.random() * 6000;
    var COL = ['255,255,255', '255,255,255', '255,255,255', '228,197,131', '94,224,240', '143,123,255'];
    function build() {
      W = innerWidth; H = innerHeight; cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      var n = Math.round(Math.min(90, Math.max(30, W * H / 9000)) * (weak ? 0.55 : 1)); stars = [];
      for (var i = 0; i < n; i++) { var z = Math.random(); stars.push({ x: Math.random() * W, y: Math.random() * H, z: z < .55 ? 1 : z < .88 ? 2 : 3, p: Math.random() * 6.28, col: COL[(Math.random() * COL.length) | 0] }); }
    }
    build(); addEventListener('resize', build);
    addEventListener('scroll', function () { scrollY = window.pageYOffset || 0; }, { passive: true });
    addEventListener('deviceorientation', function (e) { if (e.gamma == null) return; tiltX = Math.max(-1, Math.min(1, e.gamma / 35)); tiltY = Math.max(-1, Math.min(1, ((e.beta || 0) - 45) / 35)); }, { passive: true });
    addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { tiltX = (e.clientX / W - .5) * 2; tiltY = (e.clientY / H - .5) * 2; } }, { passive: true });
    d.addEventListener('visibilitychange', function () { hidden = d.hidden; if (!hidden) { last = 0; requestAnimationFrame(frame); } });

    function frame(t) {
      if (hidden) return;
      requestAnimationFrame(frame);
      if (t - last < 33) return;           // about 30 frames a second
      var dt = last ? Math.min(100, t - last) : 33; last = t;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      var sp = 1 + warp * 14;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], k = s.z;
        s.x -= dt * 0.004 * k * sp; s.y += dt * 0.0016 * k * sp;
        if (s.x < -4) s.x = W + 4; if (s.y > H + 4) s.y = -4;
        var px = s.x + tiltX * 9 * k, py = ((s.y - scrollY * 0.05 * k + tiltY * 7 * k) % H + H) % H;
        var tw = .6 + .4 * Math.sin(t / 900 + s.p), r = .5 + k * .55;
        c.fillStyle = 'rgba(' + s.col + ',' + (tw * (.35 + k * .22)).toFixed(2) + ')';
        if (warp > .05) { c.fillRect(px, py, r, r + warp * 22 * k); } else { c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.fill(); }
        if (k === 3 && warp < .05) { c.fillStyle = 'rgba(' + s.col + ',' + (tw * .07).toFixed(2) + ')'; c.beginPath(); c.arc(px, py, r * 4, 0, 6.2832); c.fill(); }
      }
      nextShoot -= dt;
      if (nextShoot <= 0 && !shoot) { shoot = { x: W * (.3 + Math.random() * .6), y: H * Math.random() * .4, l: 0 }; nextShoot = 9000 + Math.random() * 12000; }
      if (shoot) {
        shoot.l += dt * .0016; var a = 1 - shoot.l; if (a <= 0) shoot = null; else {
          var x1 = shoot.x - shoot.l * 260, y1 = shoot.y + shoot.l * 130, g = c.createLinearGradient(x1, y1, x1 + 70, y1 - 35);
          g.addColorStop(0, 'rgba(94,224,240,0)'); g.addColorStop(1, 'rgba(255,255,255,' + (a * .85).toFixed(2) + ')');
          c.strokeStyle = g; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + 70, y1 - 35); c.stroke();
        }
      }
      if (warp > 0) warp = Math.max(0, warp - dt * .0006);
    }
    requestAnimationFrame(frame);
    window.LNE_WORLD = { on: true, warp: function () { warp = 1; } };

    /* a slow scan beam, like a ship display refreshing */
    var beam = d.createElement('div'); beam.className = 'lne-beam'; beam.setAttribute('aria-hidden', 'true'); d.body.appendChild(beam);

    /* entering the universe: once per visit, short, never blocks a tap */
    try {
      if (!sessionStorage.getItem('lne_entered')) {
        sessionStorage.setItem('lne_entered', '1');
        var ov = d.createElement('div'); ov.className = 'lne-enter'; ov.setAttribute('aria-hidden', 'true');
        ov.innerHTML = '<div class="lne-enter-ring"></div><div class="lne-enter-t">Entering the Universe</div>';
        d.body.appendChild(ov); setTimeout(function () { try { ov.remove(); } catch (e) { ov.style.display = 'none'; } }, 1500);
      }
    } catch (e) {}

    /* warp between pages */
    d.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var h = a.getAttribute('href') || ''; if (!h || h.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(h)) return;
      var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      e.preventDefault(); window.LNE_WORLD.warp(); root.classList.add('lne-warping');
      setTimeout(function () { location.href = u.href; }, 230);
    }, false);
    addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('lne-warping'); });
  });
})();
