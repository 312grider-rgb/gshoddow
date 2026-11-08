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
      '.ln-nav-item{flex:1 1 0;min-width:0;padding-left:1px;padding-right:1px;font-size:10px}' +
      '.ln-nav-item .ln-nav-l{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ln-nav-item .ln-nav-icon{display:flex;line-height:0}' +
      '.ln-nav-item.active{color:#141F38}' +
      '.ln-nav-item.active svg{stroke-width:2.4}' +
      // wide screens: the same five places, as a centred bar (before, the bar was hidden there)
      '@media (min-width:900px){.ln-bottom-nav{left:50%;right:auto;transform:translateX(-50%);width:min(560px,92vw);border:1px solid #E9E2D2;border-bottom:0;border-radius:18px 18px 0 0;box-shadow:0 -4px 18px rgba(20,31,56,.08)}}';
    document.head.appendChild(st);
  }

  window.LNE_ICONS = ICON;   // the hub pages reuse these icons
  ICON.people = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.7c2 .6 3.3 2.3 3.6 5.3"/></svg>';

  // Five places, the same for everyone: Home · Learn (Teach for teachers) · AI · Community · Profile.
  // Learn, Community and Profile are hub pages that group the existing pages (see js/hubs.js).
  // Arabic 'Profile' is too wide for a small tab; this short form is used only on the tab bar.
  function navText(label){ try { if (label === 'Profile' && localStorage.language === 'ar') return 'ملفي'; } catch (e) {} return label; }

  var LEARNER_ITEMS = [
    { icon: ICON.home,   label: 'Home',      href: 'skillstream-dashboard.html' },
    { icon: ICON.book,   label: 'Learn',     href: 'skillstream-hub-learn.html' },
    { icon: ICON.ai,     label: 'AI',        href: 'skillstream-ai-hub.html' },
    { icon: ICON.people, label: 'Community', href: 'skillstream-hub-community.html' },
    { icon: ICON.user,   label: 'Profile',   href: 'skillstream-hub-profile.html' }
  ];
  var TEACHER_ITEMS = [
    { icon: ICON.home,   label: 'Home',      href: 'skillstream-teacher-dashboard.html' },
    { icon: ICON.teach,  label: 'Teach',     href: 'skillstream-hub-learn.html' },
    { icon: ICON.ai,     label: 'AI',        href: 'skillstream-ai-hub.html' },
    { icon: ICON.people, label: 'Community', href: 'skillstream-hub-community.html' },
    { icon: ICON.user,   label: 'Profile',   href: 'skillstream-hub-profile.html' }
  ];

  var PARENT_ITEMS = [
    { icon: ICON.home,   label: 'Home',      href: 'skillstream-parent-home.html' },
    { icon: ICON.people, label: 'Learners',  href: 'skillstream-family.html' },
    { icon: ICON.user,   label: 'Profile',   href: 'skillstream-hub-profile.html' }
  ];
  // The parent view is a display choice kept on this phone (and in the account); what a parent can see is still decided by the database.
  function isParentView() { try { return localStorage.getItem('lne_view') === 'parent'; } catch (e) { return false; } }

  // Which pages belong under which tab (so the right tab is highlighted on every page)
  var GROUPS = {
    'skillstream-hub-learn.html': ['skillstream-hub-learn.html', 'skillstream-courses.html', 'skillstream-self-paced.html', 'skillstream-academic.html', 'skillstream-classrooms.html',
      'skillstream-engine.html', 'skillstream-lessons.html', 'skillstream-record.html', 'skillstream-teacher-ai.html', 'skillstream-mywork.html', 'skillstream-library.html', 'skillstream-calendar.html',
      'skillstream-school.html', 'skillstream-teachers-directory.html', 'skillstream-focus.html', 'skillstream-live-session.html', 'skillstream-live-video.html', 'skillstream-session-detail.html'],
    'skillstream-ai-hub.html': ['skillstream-ai-hub.html', 'skillstream-future-architect.html'],
    'skillstream-hub-community.html': ['skillstream-hub-community.html', 'skillstream-messages.html', 'skillstream-community.html', 'skillstream-shared.html', 'skillstream-whiteboard.html',
      'skillstream-showcase.html', 'skillstream-puzzle.html', 'skillstream-games.html', 'skillstream-leaderboard.html', 'skillstream-challenges.html', 'skillstream-recognition.html', 'skillstream-chess.html', 'skillstream-ludo.html'],
    'skillstream-hub-profile.html': ['skillstream-hub-profile.html', 'skillstream-profile.html', 'skillstream-passport.html', 'skillstream-vault.html', 'skillstream-family.html',
      'skillstream-discoveries.html', 'skillstream-opportunities.html', 'skillstream-ai-history.html', 'skillstream-settings.html', 'skillstream-pricing.html', 'skillstream-feedback.html', 'skillstream-teach-apply.html']
  };

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
      var grp = item.href && GROUPS[item.href];
      var exact = items.some(function (x) { return x.href === current; });
    var on = item.href === current || (!exact && grp && grp.indexOf(current) >= 0);
      btn.className = 'ln-nav-item' + (on ? ' active' : '');
      if (on) btn.setAttribute('aria-current', 'page');
      btn.innerHTML = '<span class="ln-nav-icon">' + item.icon + '</span><span class="ln-nav-l">' + navText(item.label) + '</span>';
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
    // On other pages, use the role this phone saw last time (saved below), so a teacher keeps the teacher tabs everywhere.
    var savedRole = ''; try { savedRole = localStorage.getItem('lne_role') || ''; } catch (e) {}
    function isT(role) { return role === 'teacher' || role === 'both' || (role === 'admin' && savedRole === 'teacher'); }
    function remember(role) { try {
      if (role === 'admin') { if (/teacher-dashboard/i.test(fname)) { localStorage.setItem('lne_role', 'teacher'); savedRole = 'teacher'; } else if (/skillstream-dashboard/i.test(fname)) { localStorage.setItem('lne_role', 'student'); savedRole = 'student'; } return; }
      if (role) localStorage.setItem('lne_role', isT(role) ? 'teacher' : 'student');
    } catch (e) {} }
    var guessedItems = (/teacher/i.test(fname) || savedRole === 'teacher') ? TEACHER_ITEMS : (isParentView() ? PARENT_ITEMS : LEARNER_ITEMS);
    render(guessedItems);

    // If SSAuth IS present, trust the real role once it resolves, in case
    // it disagrees with the filename guess (e.g. a shared page both roles use).
    if (window.SSAuth && window.SSAuth.ready) {
      window.SSAuth.ready.then(function () {
        var user = window.SSAuth.currentUser && window.SSAuth.currentUser();
        if (!user) return;
        remember(user.role);
        var correctItems = isT(user.role) ? TEACHER_ITEMS : (isParentView() ? PARENT_ITEMS : LEARNER_ITEMS);
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
        remember(profile.role);
        var correctItems = isT(profile.role) ? TEACHER_ITEMS : (isParentView() ? PARENT_ITEMS : LEARNER_ITEMS);
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
