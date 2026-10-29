/* Learning Never Ends — one "Learn" place.
   Adds a small tab strip to the study pages: My courses · Self-paced · Academic · Classes.
   Include with:  <script src="js/learntabs.js" defer></script>  */
(function () {
  var TABS = [
    { label: 'My courses',  href: 'skillstream-courses.html' },
    { label: 'Self-paced',  href: 'skillstream-self-paced.html' },
    { label: 'Academic',    href: 'skillstream-academic.html' },
    { label: 'Classes',     href: 'skillstream-classrooms.html' }
  ];
  function build() {
    if (document.getElementById('ln-learntabs')) return;
    var cur = window.location.pathname.split('/').pop() || '';
    if (!document.getElementById('ln-learntabs-css')) {
      var st = document.createElement('style');
      st.id = 'ln-learntabs-css';
      st.textContent =
        '#ln-learntabs{display:flex;gap:8px;overflow-x:auto;padding:12px 16px;background:#FBF7EF;border-bottom:1px solid #E9E2D2;position:sticky;top:0;z-index:40;-webkit-overflow-scrolling:touch}' +
        '#ln-learntabs a{flex:none;padding:8px 14px;border-radius:20px;border:1.5px solid #E9E2D2;background:#fff;color:#141F38;font:600 13px/1 Inter,system-ui,sans-serif;text-decoration:none}' +
        '#ln-learntabs a.on{background:#141F38;border-color:#141F38;color:#fff}';
      document.head.appendChild(st);
    }
    var bar = document.createElement('div');
    bar.id = 'ln-learntabs';
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
