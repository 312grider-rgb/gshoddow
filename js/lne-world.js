/* Learning Never Ends - the calm world layer (Silver and Cream)
   Comfort modes (Auto / Day / Night / Calm), the Daily mission card on the Welcome back pages, the small picture
   banners, a short "entering" moment once per visit and a quick fade between pages.
   Nothing in the background moves. Switched off for reduced motion and Data Saver where it would add motion or data. */
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


  /* ---- the Daily mission card: <div data-mission></div> on the "Welcome back" pages (students, teachers, parents) ---- */
  function fillMission() {
    try {
      var nodes = d.querySelectorAll('[data-mission]:not([data-done])');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i]; el.setAttribute('data-done', '1');
        var dt = new Date(), day = Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000), st = {};
        try { st = JSON.parse(localStorage.getItem('lne_puzzle') || '{}') || {}; } catch (e) {}
        var done = st.day === day && (st.res || []).length >= 3, streak = (st.last === day || st.last === day - 1) ? (st.streak || 0) : 0;
        var a = d.createElement('a'); a.className = 'lne-mission'; a.href = 'skillstream-puzzle.html';
        var ic = d.createElement('div'); ic.className = 'lm-ic'; ic.textContent = '🪐'; a.appendChild(ic);
        var box = d.createElement('div'); box.className = 'lm-tx';
        var h = d.createElement('h3'); h.textContent = 'Daily mission'; box.appendChild(h);
        var p = d.createElement('p'); p.textContent = 'Three new puzzles, a few minutes. Keep your streak alive.'; box.appendChild(p);
        var m = d.createElement('div'); m.className = 'lm-meta';
        var b = d.createElement('b'); b.textContent = String(streak); b.setAttribute('data-no-i18n', ''); m.appendChild(b);
        var sp = d.createElement('span'); sp.textContent = 'Day streak'; m.appendChild(sp);
        var go = d.createElement('span'); go.className = 'lm-go'; go.textContent = done ? 'Mission complete' : 'Start the mission'; m.appendChild(go);
        box.appendChild(m); a.appendChild(box);
        el.appendChild(a);
      }
    } catch (e) {}
  }
  ready0(function () { fillMission(); });

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
  ready0(function () { fillArt(); try { var t = 0; new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = 0; fillArt(); fillMission(); }, 60); }).observe(d.body, { childList: true, subtree: true }); } catch (e) {} });
  ready0(function () { var n = 0, t = setInterval(function () { buildComfort(); if (d.getElementById('lneComfort') || ++n > 12) clearInterval(t); }, 250); });
  if (reduce || save || root.getAttribute('data-comfort') === 'calm') return;

  function ready(fn) { if (d.body) fn(); else d.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    /* Silver and Cream: no canvas, nothing moves in the background. */
    window.LNE_WORLD = { on: true, warp: function () {} };


    /* entering the universe: once per visit, short, never blocks a tap */
    try {
      if (!sessionStorage.getItem('lne_entered')) {
        sessionStorage.setItem('lne_entered', '1');
        var ov = d.createElement('div'); ov.className = 'lne-enter'; ov.setAttribute('aria-hidden', 'true');
        ov.innerHTML = (save ? '' : '<img src="css/logo-full.webp?v=1" alt="" width="420" height="280">') + '<div class="lne-enter-ring"></div><div class="lne-enter-t">Entering the Universe</div>';
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
