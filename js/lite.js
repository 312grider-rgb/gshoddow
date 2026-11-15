/* Same text size everywhere: no readable text is smaller than 16px.
   (The text-size buttons still scale the whole page on top of this.) */
(function () {
  var MIN = 16, timer = 0;
  function skip(el) {
    return !!(el.closest && el.closest('.ln-nav-item,#lneSize,.lne-enter,svg,script,style,[data-keep-size]'));
  }
  function run() {
    timer = 0;
    var all = document.body ? document.body.getElementsByTagName('*') : [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.__lf) continue;
      var has = false, n = el.childNodes;
      for (var j = 0; j < n.length; j++) if (n[j].nodeType === 3 && n[j].textContent.trim().length > 1) { has = true; break; }
      if (!has) continue;
      el.__lf = 1;
      if (skip(el)) continue;
      var fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs && fs < MIN) el.style.fontSize = MIN + 'px';
    }
  }
  function later() { if (!timer) timer = setTimeout(run, 250); }
  function start() {
    run();
    try { new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
