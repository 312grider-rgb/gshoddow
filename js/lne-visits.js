/* js/lne-visits.js — anonymous page/button counter. Sends only a fixed label (e.g. "landing"); nothing about the person.
   window.LNE_VISIT('landing') counts once per browser session per label. Never blocks or breaks the page. */
(function () {
  var URL = 'https://vauudtedojtcveiqajlr.supabase.co/rest/v1/rpc/log_page_visit';
  var KEY = 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE';
  window.LNE_VISIT = function (label) {
    try {
      var k = 'lne_v_' + label;
      try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) {}
      fetch(URL, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify({ p: label }) }).catch(function () {});
    } catch (e) {}
  };
})();
