/* Learning Never Ends — one "Messages" place.
   Adds a small tab strip to the message pages so they feel like one area:
   Private (1-to-1 chat) · Groups (study groups) · Shared work (files shared with teachers).
   (Class chats appear in the Private inbox; classes themselves live under Learn.)
   Include with:  <script src="js/msgtabs.js" defer></script>
   It only inserts one element and never touches the page's own code. */
(function () {
  var TABS = [
    { label: 'Private',     href: 'skillstream-messages.html' },
    { label: 'Groups',      href: 'skillstream-community.html' },
    { label: 'Shared work', href: 'skillstream-shared.html' }
  ];
  function build() {
    if (document.getElementById('ln-msgtabs')) return;
    var cur = window.location.pathname.split('/').pop() || '';
    if (!document.getElementById('ln-msgtabs-css')) {
      var st = document.createElement('style');
      st.id = 'ln-msgtabs-css';
      st.textContent =
        '#ln-msgtabs{display:flex;gap:8px;overflow-x:auto;padding:12px 16px;background:#FBF7EF;border-bottom:1px solid #E9E2D2;position:sticky;top:0;z-index:40;-webkit-overflow-scrolling:touch}' +
        '#ln-msgtabs a{flex:none;padding:8px 14px;border-radius:20px;border:1.5px solid #E9E2D2;background:#fff;color:#141F38;font:600 13px/1 Inter,system-ui,sans-serif;text-decoration:none}' +
        '#ln-msgtabs a.on{background:#141F38;border-color:#141F38;color:#fff}';
      document.head.appendChild(st);
    }
    var bar = document.createElement('div');
    bar.id = 'ln-msgtabs';
    bar.setAttribute('role', 'tablist');
    TABS.forEach(function (t) {
      var a = document.createElement('a');
      a.href = t.href; a.textContent = t.label;
      if (t.href === cur) { a.className = 'on'; a.setAttribute('aria-current', 'page'); }
      bar.appendChild(a);
    });
    var hdr = document.querySelector('header.top');
    if (hdr && hdr.parentNode) hdr.parentNode.insertBefore(bar, hdr.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
