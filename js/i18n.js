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
