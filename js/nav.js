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
    user: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    teach: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    games: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11" r="1"/><circle cx="18.5" cy="14" r="1"/></svg>',
    library: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16M9 4v16"/><path d="M14 5l4 .8-3 14.2-4-.8z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    compass: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    image: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>'
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
      '.ln-sheet-bg{position:fixed;inset:0;z-index:60;background:rgba(20,31,56,.45);display:flex;align-items:flex-end}' +
      '.ln-sheet{width:100%;max-height:80vh;overflow:auto;background:#FBF7EF;border-radius:18px 18px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(20,31,56,.25)}' +
      '.ln-sheet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-weight:700;color:#141F38;font-size:16px}' +
      '.ln-sheet-x{background:#fff;border:1px solid #E9E2D2;border-radius:9px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;color:#141F38;cursor:pointer}' +
      '.ln-sheet-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.ln-sheet-item{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #E9E2D2;border-radius:12px;padding:13px 12px;color:#141F38;font-size:13.5px;font-weight:600;text-decoration:none}' +
      '.ln-sheet-item.active{border-color:#C9A24E;background:#FBF4E2}' +
      '.ln-sheet-item svg{flex:none;color:#8A6A1F}' +
      '@media (min-width:900px){.ln-bottom-nav{display:none}}';
    document.head.appendChild(st);
  }

  var LEARNER_ITEMS = [
    { icon: ICON.home, label: 'Home',    href: 'skillstream-dashboard.html' },
    { icon: ICON.book, label: 'Learn',   href: 'skillstream-courses.html' },
    { icon: ICON.ai, label: 'AI',      href: 'skillstream-ai-hub.html' },
    { icon: ICON.chat, label: 'Messages',href: 'skillstream-messages.html' },
    { icon: ICON.more, label: 'More', more: true }
  ];

  var TEACHER_ITEMS = [
    { icon: ICON.home, label: 'Home',    href: 'skillstream-teacher-dashboard.html' },
    { icon: ICON.book, label: 'Courses', href: 'skillstream-courses.html' },
    { icon: ICON.ai, label: 'AI',      href: 'skillstream-ai-hub.html' },
    { icon: ICON.chat, label: 'Messages',href: 'skillstream-messages.html' },
    { icon: ICON.more, label: 'More', more: true }
  ];

  // Available to everyone (students, teachers, admins) on every page, games included.
  var MORE_LINKS = [
    { icon: ICON.user,     label: 'Profile',                 href: 'skillstream-profile.html' },
    { icon: ICON.ai,       label: 'My Learning',             href: 'skillstream-engine.html' },
    { icon: ICON.chat,     label: 'My AI history',           href: 'skillstream-ai-history.html' },
    { icon: ICON.library,  label: 'Library',                 href: 'skillstream-library.html' },
    { icon: ICON.games,    label: 'Games',                   href: 'skillstream-games.html' },
    { icon: ICON.settings, label: 'Settings',                href: 'skillstream-settings.html' },
    { icon: ICON.compass,  label: 'Discoveries and records', href: 'skillstream-discoveries.html' },
    { icon: ICON.star,     label: 'Plans and pricing',       href: 'skillstream-pricing.html' },
    { icon: ICON.image,    label: 'Showcase',                href: 'skillstream-showcase.html' },
    { icon: ICON.calendar, label: 'Calendar',                href: 'skillstream-calendar.html' },
    { icon: ICON.trophy,   label: 'Leaderboard',             href: 'skillstream-leaderboard.html' },
    { icon: ICON.teach,    label: 'Become a teacher',        href: 'skillstream-teach-apply.html' }
  ];
  var MESSAGE_PAGES = ['skillstream-messages.html', 'skillstream-community.html', 'skillstream-shared.html'];
  var LEARN_PAGES = ['skillstream-courses.html', 'skillstream-self-paced.html', 'skillstream-academic.html', 'skillstream-classrooms.html'];
  var MORE_PAGES = MORE_LINKS.map(function (l) { return l.href; }).concat(['skillstream-chess.html', 'skillstream-ludo.html', 'skillstream-challenges.html']);

  function openMore() {
    if (document.getElementById('ln-sheet-bg')) return;
    var current = currentFile();
    var bg = document.createElement('div');
    bg.className = 'ln-sheet-bg'; bg.id = 'ln-sheet-bg';
    var sheet = document.createElement('div');
    sheet.className = 'ln-sheet';
    var head = document.createElement('div');
    head.className = 'ln-sheet-head';
    head.innerHTML = '<span>More</span><button type="button" class="ln-sheet-x">Close</button>';
    var grid = document.createElement('div');
    grid.className = 'ln-sheet-grid';
    MORE_LINKS.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.className = 'ln-sheet-item' + (l.href === current ? ' active' : '');
      a.innerHTML = l.icon + '<span>' + l.label + '</span>';
      grid.appendChild(a);
    });
    sheet.appendChild(head); sheet.appendChild(grid); bg.appendChild(sheet);
    function close() { bg.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    head.querySelector('button').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
  }

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
      var btn = document.createElement(item.more ? 'button' : 'a');
      if (item.more) { btn.type = 'button'; btn.addEventListener('click', openMore); }
      else btn.href = item.href;
      var onAiFamily = item.href === 'skillstream-ai-hub.html' && current === 'skillstream-future-architect.html';
      var onMessages = item.href === 'skillstream-messages.html' && MESSAGE_PAGES.indexOf(current) >= 0;
      var onLearn = item.href === 'skillstream-courses.html' && LEARN_PAGES.indexOf(current) >= 0;
      var onMore = item.more && MORE_PAGES.indexOf(current) >= 0;
      btn.className = 'ln-nav-item' + (item.href === current || onAiFamily || onMessages || onLearn || onMore ? ' active' : '');
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
