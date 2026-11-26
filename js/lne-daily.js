/* Daily colour setting: a small dropdown next to the language / comfort dropdowns. Kept on this phone. */
(function () {
  var D = window.LNE_DAILY; if (!D) return;
  var T = function (s) { try { return (window.LNE_I18N && LNE_I18N.t) ? LNE_I18N.t(s) : s; } catch (e) { return s; } };
  function build() {
    if (document.getElementById('lneDaily')) return true;
    var host = document.getElementById('lneComfort') || document.getElementById('lneLang');
    if (!host || !host.parentNode) return false;
    var sel = document.createElement('select'); sel.id = 'lneDaily'; sel.setAttribute('aria-label', 'Daily colour');
    var opts = [['daily', '🎨 ' + T('Daily colour')], ['classic', T('Classic brown')]];
    D.P.forEach(function (p, i) { opts.push([String(i), T(p[0])]); });
    opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
    sel.value = D.mode;
    sel.onchange = function () { try { localStorage.setItem('lne_daily', sel.value); } catch (e) {} location.reload(); };
    host.parentNode.insertBefore(sel, host.nextSibling);
    return true;
  }
  var n = 0, iv = setInterval(function () { if (build() || ++n > 20) clearInterval(iv); }, 300);
  var st = document.createElement('style');
  st.textContent = 'html #lneDaily{position:static;display:block;margin:0 auto 18px;z-index:1;font:600 12px/1 system-ui,sans-serif;padding:5px 8px;border-radius:999px;border:1px solid var(--edge,#E7D3B0);background:#EEF1F6;color:#141F38;min-width:170px;max-width:230px;min-height:40px;box-shadow:0 1px 6px rgba(15,24,48,.15)}';
  document.head.appendChild(st);
})();
