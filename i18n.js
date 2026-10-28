/* Learning Never Ends — site-wide translation (en, ar, fr, es, zh).
   Include in <head> of every page:  <script src="js/i18n.js?v=1"></script>
   - Language is stored in localStorage 'language' (shared with Home and Settings).
   - Dictionary files js/i18n-<lang>.js map exact English UI text -> translation.
   - Text/attributes are translated as the page is built, and again whenever the page changes.
   - Texts containing {0},{1}… are treated as patterns (e.g. "Welcome, {0}").
   - Arabic switches the page to right-to-left. Text typed by users is never translated.
   API: LNE_I18N.lang, LNE_I18N.t(text,...args), LNE_I18N.setLang('fr')  */
(function () {
  var LANGS = { en: 'English', ar: 'العربية', fr: 'Français', es: 'Español', zh: '中文' };
  var lang = 'en';
  try { lang = localStorage.getItem('language') || 'en'; } catch (e) {}
  if (!LANGS[lang]) lang = 'en';

  var root = document.documentElement;
  root.setAttribute('lang', lang);
  root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  // The page is already in the chosen language: stop the browser's own auto-translate (Chrome) from re-translating it.
  root.setAttribute('translate', 'no');
  if (lang !== 'en') {
    var nt = document.createElement('meta'); nt.name = 'google'; nt.content = 'notranslate';
    (document.head || root).appendChild(nt);
  }

  var api = window.LNE_I18N = {
    lang: lang, langs: LANGS,
    t: function (s) { return s; },
    setLang: function (l) {
      if (!LANGS[l]) return;
      try { localStorage.setItem('language', l); } catch (e) {}
      location.reload();
    }
  };
  var ready = function () { initSwitcher(); };

  if (lang !== 'en') {
    document.write('<script src="js/i18n-' + lang + '.js?v=1"><\/script>');
    // The data script has run by the time this next one executes (document.write scripts load in order).
    document.write('<script>window.LNE_I18N_START&&window.LNE_I18N_START()<\/script>');
  }
  window.LNE_I18N_START = function () { if (window.LNE_I18N_DATA) start(window.LNE_I18N_DATA); };

  function start(D) {
    var exact = D, prefixes = [], patterns = [];
    Object.keys(D).forEach(function (k) {
      if (/\{\d+\}/.test(k)) {
        var names = [];
        var src = k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\d+)\}/g, function (_, n) { names.push(+n); return '\u0001'; });
        src = src.replace(/[{}]/g, '\\$&').replace(/\u0001/g, '(.+?)');
        patterns.push({ re: new RegExp('^' + src + '$', 's'), names: names, out: D[k], len: k.length });
      } else if (/[:：]$/.test(k) && k.length > 3) prefixes.push(k);
    });
    patterns.sort(function (a, b) { return b.len - a.len; });
    prefixes.sort(function (a, b) { return b.length - a.length; });

    function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
    function tr(core, depth) {
      if (exact.hasOwnProperty(core)) return exact[core];
      for (var i = 0; i < patterns.length; i++) {
        var m = patterns[i].re.exec(core);
        if (m) {
          return patterns[i].out.replace(/\{(\d+)\}/g, function (_, n) {
            var j = patterns[i].names.indexOf(+n); var v = j >= 0 ? m[j + 1] : '';
            return depth ? v : tr(v, 1) || v;
          });
        }
      }
      if (!depth) for (var p = 0; p < prefixes.length; p++) {
        var k = prefixes[p];
        if (core.length > k.length && core.indexOf(k) === 0) return exact[k] + ' ' + (tr(core.slice(k.length).trim(), 1) || core.slice(k.length).trim());
      }
      return null;
    }
    function t(s) {
      if (typeof s !== 'string' || !s) return s;
      var core = norm(s);
      if (!core) return s;
      var r = tr(core, 0);
      if (r == null) return s;
      var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
      return lead + r + trail;
    }
    api.t = function (s) {
      var r = t(s);
      for (var i = 1; i < arguments.length; i++) r = r.replace('{' + (i - 1) + '}', arguments[i]);
      return r;
    };

    var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, NOSCRIPT: 1, SVG: 1, PATH: 1 };
    var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
    function skipped(el) {
      for (; el && el.nodeType === 1; el = el.parentNode) {
        if (SKIP[el.nodeName.toUpperCase()] || el.hasAttribute('data-no-i18n') || el.isContentEditable === true && el.getAttribute('data-i18n-edit') == null && false) return true;
      }
      return false;
    }
    function doText(n) {
      var v = n.nodeValue;
      if (!v || !/[A-Za-z]/.test(v)) return;
      if (skipped(n.parentNode)) return;
      var r = t(v);
      if (r !== v) n.nodeValue = r;
    }
    function doEl(el) {
      if (el.nodeType !== 1 || SKIP[el.nodeName.toUpperCase()]) return;
      ATTRS.forEach(function (a) {
        var v = el.getAttribute && el.getAttribute(a);
        if (v && !skipped(el)) { var r = t(v); if (r !== v) el.setAttribute(a, r); }
      });
      if (el.nodeName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) {
        var r2 = t(el.value); if (r2 !== el.value) el.value = r2;
      }
    }
    function walk(node) {
      if (node.nodeType === 3) { doText(node); return; }
      if (node.nodeType !== 1 || SKIP[node.nodeName.toUpperCase()]) return;
      doEl(node);
      for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
    }
    var obs = new MutationObserver(function (muts) {
      obs.disconnect();
      try {
        muts.forEach(function (m) {
          if (m.type === 'characterData') doText(m.target);
          else if (m.type === 'attributes') doEl(m.target);
          else m.addedNodes.forEach(walk);
        });
        if (document.title) { var tt = t(document.title); if (tt !== document.title) document.title = tt; }
      } finally { observe(); }
    });
    function observe() { obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value']) }); }
    observe();
    document.addEventListener('DOMContentLoaded', function () { walk(document.body); if (document.title) document.title = t(document.title); });

    // Messages shown by alert / confirm / prompt
    var _a = window.alert, _c = window.confirm, _p = window.prompt;
    window.alert = function (m) { return _a.call(window, t(String(m))); };
    window.confirm = function (m) { return _c.call(window, t(String(m))); };
    window.prompt = function (m, d) { return _p.call(window, t(String(m)), d); };
  }

  function initSwitcher() {
    if (document.getElementById('langSwitcher') || document.getElementById('languageSelect') || document.getElementById('lneLang')) return;
    var s = document.createElement('select');
    s.id = 'lneLang'; s.setAttribute('aria-label', 'Language'); s.setAttribute('data-no-i18n', '');
    Object.keys(LANGS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = LANGS[k]; if (k === lang) o.selected = true; s.appendChild(o); });
    s.onchange = function () { api.setLang(s.value); };
    document.body.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();

/* ---------------------------------------------------------------------------
   AI requests: attach the signed-in user's Supabase token to calls to /api/ask-ai
   so the server can verify who is asking (the endpoint now requires a login).
   The token already lives in this browser (Supabase keeps the session in
   localStorage); nothing new is stored and it is only sent to our own server.
   --------------------------------------------------------------------------- */
(function () {
  var origFetch = window.fetch;
  if (!origFetch) return;

  function accessToken() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^sb-.+-auth-token$/.test(k)) {
          var v = JSON.parse(localStorage.getItem(k));
          var t = v && (v.access_token || (v.currentSession && v.currentSession.access_token));
          if (t) return t;
        }
      }
    } catch (e) {}
    return null;
  }

  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/(^|\/)api\/ask-ai(\?|$)/.test(url)) {
        var t = accessToken();
        if (t) {
          init = init || {};
          var h = new Headers(init.headers || (typeof input !== 'string' && input && input.headers) || {});
          if (!h.has('Authorization')) h.set('Authorization', 'Bearer ' + t);
          init.headers = h;
        }
      }
    } catch (e) {}
    return origFetch.call(this, input, init);
  };
})();

/* ---------------------------------------------------------------------------
   Text size: everyone can make the whole app bigger. Four steps, remembered per device.
   Default is "Large". Uses the browser's page zoom for the whole page so every text, button and card grows together.
   Stored only in this browser (localStorage 'lne_textsize').
   --------------------------------------------------------------------------- */
(function () {
  var STEPS = [
    { k: 'n',   z: 1,    label: 'Normal text' },
    { k: 'l',   z: 1.15, label: 'Large text' },
    { k: 'xl',  z: 1.3,  label: 'Extra large text' },
    { k: 'max', z: 1.45, label: 'Maximum text' }
  ];
  function get() {
    var k = 'l';
    try { k = localStorage.getItem('lne_textsize') || 'l'; } catch (e) {}
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].k === k) return STEPS[i];
    return STEPS[1];
  }
  function apply(step) { document.documentElement.style.zoom = step.z === 1 ? '' : String(step.z); }
  apply(get()); // before the page paints

  function t(s) { try { return (window.LNE_I18N && window.LNE_I18N.t) ? window.LNE_I18N.t(s) : s; } catch (e) { return s; } }
  function build() {
    if (document.getElementById('lneSize')) return;
    var wrap = document.createElement('div');
    wrap.id = 'lneSize'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', t('Text size'));
    wrap.style.cssText = 'display:flex;justify-content:center;gap:8px;margin:0 auto 18px;';
    var cur = get();
    STEPS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-no-i18n', ''); b.textContent = 'A';
      b.setAttribute('aria-label', t(s.label));
      b.setAttribute('aria-pressed', s.k === cur.k ? 'true' : 'false');
      b.style.cssText = 'font:700 ' + (12 + i * 3) + 'px/1 Inter,system-ui,sans-serif;min-width:44px;min-height:44px;border-radius:12px;cursor:pointer;border:1.5px solid ' +
        (s.k === cur.k ? '#141F38' : '#E9E2D2') + ';background:' + (s.k === cur.k ? '#141F38' : '#fff') + ';color:' + (s.k === cur.k ? '#fff' : '#141F38') + ';';
      b.onclick = function () {
        try { localStorage.setItem('lne_textsize', s.k); } catch (e) {}
        apply(s);
        Array.prototype.forEach.call(wrap.children, function (c, j) {
          var on = j === i;
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
          c.style.background = on ? '#141F38' : '#fff'; c.style.color = on ? '#fff' : '#141F38'; c.style.borderColor = on ? '#141F38' : '#E9E2D2';
        });
      };
      wrap.appendChild(b);
    });
    var sw = document.getElementById('lneLang');
    if (sw && sw.parentNode) sw.parentNode.insertBefore(wrap, sw.nextSibling); else document.body.appendChild(wrap);
  }
  function ready() { setTimeout(build, 0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
