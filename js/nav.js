/* Learning Never Ends — shared bottom nav
   Include this AFTER skillstream-auth.js (uses window.SSAuth if present)
   and AFTER css/theme.css.
     <script src="skillstream-auth.js"></script>
     <script src="js/nav.js" defer></script>

   Does not touch any existing page markup, styles, or logic — it only
   appends one <nav> element to the end of <body> and pads the body so it
   doesn't sit under it. Safe to add to a page without removing anything.
*/
(function () {
  var ICON = {
    home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    ai: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M17 17h4"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
  };

  function injectStyles() {
    if (document.getElementById('ln-nav-css')) return;
    var st = document.createElement('style');
    st.id = 'ln-nav-css';
    st.textContent =
      '.ln-bottom-nav{position:fixed;left:0;right:0;bottom:0;z-index:50;background:#fff;border-top:1px solid #E9E2D2;padding:8px 6px calc(8px + env(safe-area-inset-bottom,0px));display:flex;justify-content:space-around}' +
      '.ln-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;color:#6B6558;font-size:10.5px;font-weight:600;font-family:inherit;background:none;border:none;padding:4px 8px;border-radius:10px;cursor:pointer;text-decoration:none}' +
      '.ln-nav-item .ln-nav-icon{display:flex;line-height:0}' +
      '.ln-nav-item.active{color:#141F38}' +
      '.ln-nav-item.active svg{stroke-width:2.4}' +
      '@media (min-width:900px){.ln-bottom-nav{display:none}}';
    document.head.appendChild(st);
  }

  var LEARNER_ITEMS = [
    { icon: ICON.home, label: 'Home',    href: 'skillstream-dashboard.html' },
    { icon: ICON.book, label: 'Learn',   href: 'skillstream-courses.html' },
    { icon: ICON.ai, label: 'AI',      href: 'skillstream-ai-hub.html' },
    { icon: ICON.chat, label: 'Messages',href: 'skillstream-messages.html' },
    { icon: ICON.user, label: 'Profile', href: 'skillstream-profile.html' }
  ];

  var TEACHER_ITEMS = [
    { icon: ICON.home, label: 'Home',    href: 'skillstream-teacher-dashboard.html' },
    { icon: ICON.book, label: 'Courses', href: 'skillstream-courses.html' },
    { icon: ICON.ai, label: 'AI',      href: 'skillstream-ai-hub.html' },
    { icon: ICON.chat, label: 'Messages',href: 'skillstream-messages.html' },
    { icon: ICON.user, label: 'Profile', href: 'skillstream-profile.html' }
  ];

  function currentFile() {
    var path = window.location.pathname.split('/').pop();
    return path === '' ? 'index.html' : path;
  }

  function render(items) {
    injectStyles();
    var current = currentFile();
    var nav = document.createElement('nav');
    nav.className = 'ln-bottom-nav';
    items.forEach(function (item) {
      var btn = document.createElement('a');
      btn.href = item.href;
      var onAiFamily = item.href === 'skillstream-ai-hub.html' && current === 'skillstream-future-architect.html';
      btn.className = 'ln-nav-item' + (item.href === current || onAiFamily ? ' active' : '');
      btn.innerHTML = '<span class="ln-nav-icon">' + item.icon + '</span>' + item.label;
      nav.appendChild(btn);
    });
    document.body.appendChild(nav);
    // Keep content clear of the fixed nav without fighting a page's own
    // padding-bottom rule — inline style wins regardless of that page's CSS.
    var extra = 78;
    var existing = parseInt(window.getComputedStyle(document.body).paddingBottom, 10) || 0;
    document.body.style.paddingBottom = (existing < extra ? extra : existing) + 'px';
  }

  function init() {
    // Guess from the filename first (works even on pages that don't load
    // SSAuth at all, e.g. skillstream-teacher-dashboard.html today).
    var fname = currentFile();
    var guessedItems = /teacher/i.test(fname) ? TEACHER_ITEMS : LEARNER_ITEMS;
    render(guessedItems);

    // If SSAuth IS present, trust the real role once it resolves, in case
    // it disagrees with the filename guess (e.g. a shared page both roles use).
    if (window.SSAuth && window.SSAuth.ready) {
      window.SSAuth.ready.then(function () {
        var user = window.SSAuth.currentUser && window.SSAuth.currentUser();
        if (!user) return;
        var correctItems = user.role === 'teacher' ? TEACHER_ITEMS : LEARNER_ITEMS;
        if (correctItems !== guessedItems) {
          var old = document.querySelector('.ln-bottom-nav');
          if (old) old.remove();
          render(correctItems);
        }
      }).catch(function () {});
      return;
    }

    // No SSAuth on this page (e.g. pages with their own inline Supabase
    // client). If that page opts in by exposing window.lnAuthReady (a
    // promise) and window.currentProfile once it resolves, use the real
    // role instead of the filename guess — without creating a second
    // Supabase/auth client of our own.
    if (window.lnAuthReady && typeof window.lnAuthReady.then === 'function') {
      window.lnAuthReady.then(function () {
        var profile = window.currentProfile;
        if (!profile || !profile.role) return;
        var correctItems = profile.role === 'teacher' ? TEACHER_ITEMS : LEARNER_ITEMS;
        if (correctItems !== guessedItems) {
          var old = document.querySelector('.ln-bottom-nav');
          if (old) old.remove();
          render(correctItems);
        }
      }).catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
