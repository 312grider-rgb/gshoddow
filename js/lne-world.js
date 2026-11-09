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
        var xp = Math.max(0, parseInt(st.xp, 10) || 0), RK = [['Cadet', 0], ['Pilot', 60], ['Navigator', 180], ['Engineer', 400], ['Commander', 800], ['Admiral', 1500]], ri = 0;
        RK.forEach(function (r, k) { if (xp >= r[1]) ri = k; });
        var nx = RK[ri + 1], pc = nx ? Math.min(100, Math.round((xp - RK[ri][1]) / (nx[1] - RK[ri][1]) * 100)) : 100;
        /* the AI guide: one short, kind tip that follows how the day is going */
        var g = d.createElement('a'); g.className = 'lne-guide'; g.href = 'skillstream-ai-hub.html';
        if (!save) { var gi = new Image(); gi.alt = ''; gi.width = 44; gi.height = 44; gi.src = 'css/logo-mark.png?v=2'; g.appendChild(gi); }
        var gt = d.createElement('div'); gt.className = 'lg-tx';
        var gb = d.createElement('b'); gb.textContent = 'Your AI guide'; gt.appendChild(gb);
        var gs = d.createElement('span'); gs.textContent = done ? 'Mission complete. Great work, see you tomorrow.' : (streak > 0 ? 'Your streak is alive. Today\'s mission keeps it going.' : 'Three puzzles are waiting. A few minutes keeps your learning sharp.'); gt.appendChild(gs);
        g.appendChild(gt); el.appendChild(g);
        var a = d.createElement('a'); a.className = 'lne-mission'; a.href = 'skillstream-puzzle.html';
        var ic = d.createElement('div'); ic.className = 'lm-ring'; ic.style.setProperty('--p', pc + '%'); ic.setAttribute('aria-hidden', 'true');
        var ii = d.createElement('i'); ii.textContent = String(ri + 1); ii.setAttribute('data-no-i18n', ''); ic.appendChild(ii); a.appendChild(ic);
        var box = d.createElement('div'); box.className = 'lm-tx';
        var h = d.createElement('h3'); h.textContent = 'Daily mission'; box.appendChild(h);
        var p = d.createElement('p'); p.textContent = 'Three new puzzles, a few minutes. Keep your streak alive.'; box.appendChild(p);
        var rk = d.createElement('div'); rk.className = 'lm-rank';
        var rn = d.createElement('span'); rn.textContent = RK[ri][0]; rk.appendChild(rn);
        if (nx) { var dot = d.createElement('span'); dot.textContent = ' · '; dot.setAttribute('data-no-i18n', ''); rk.appendChild(dot); var pb = d.createElement('b'); pb.textContent = String(nx[1] - xp); pb.setAttribute('data-no-i18n', ''); rk.appendChild(pb); var pt = d.createElement('span'); pt.textContent = ' points to go'; rk.appendChild(pt); }
        box.appendChild(rk);
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

/* ---- glossy 3D tiles for AI tools: any element with data-ic="name" gets one ---- */
(function(){
  var P={
   teach:['ame','<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>'],
   ask:['oce','<path d="M4 5h16v11H9l-5 4z"/><path d="M10 9.5a2 2 0 114 0c0 1.5-2 1.5-2 3M12 14.5v.01"/>'],
   sum:['eme','<path d="M5 6h14M5 11h14M5 16h9"/>'],
   tr:['oce','<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'],
   room:['sap','<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'],
   quiz:['amb','<path d="M5 12l4 4 10-10"/>'],
   lvl:['rose','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'],
   plan:['eme','<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'],
   hw:['amb','<path d="M4 20l1-4L16 5l3 3L8 19z"/>'],
   car:['sap','<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'],
   opp:['amb','<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'],
   hist:['sla','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
   learn:['eme','<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>'],
   board:['ame','<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 12l3-3 3 2 4-4M8 20h8"/>'],
   stud:['oce','<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6M16 5a3 3 0 010 6M17 14c2.5.5 4 2.5 4 6"/>']
  };
  function run(){
    var els=document.querySelectorAll('[data-ic]:not([data-ic-done])');
    for(var i=0;i<els.length;i++){
      var e=els[i],p=P[e.getAttribute('data-ic')]; e.setAttribute('data-ic-done','1'); if(!p) continue;
      var s=document.createElement('span'); s.className='ai-ic'; s.setAttribute('data-c',p[0]); s.setAttribute('aria-hidden','true');
      s.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+p[1]+'</svg>';
      if(e.childNodes.length===0&&e.tagName==='SPAN'){ e.className='ai-ic'; e.setAttribute('data-c',p[0]); e.innerHTML=s.innerHTML; e.style.marginInlineEnd='8px'; }
      else e.insertBefore(s,e.firstChild);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
