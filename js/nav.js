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
  var LEARNER_ITEMS = [
    { icon: '🏠', label: 'Home',    href: 'skillstream-dashboard.html' },
    { icon: '📚', label: 'Learn',   href: 'skillstream-courses.html' },
    { icon: '🧠', label: 'AI',      href: 'skillstream-ai-hub.html' },
    { icon: '💬', label: 'Messages',href: 'skillstream-messages.html' },
    { icon: '👤', label: 'Profile', href: 'skillstream-profile.html' }
  ];

  var TEACHER_ITEMS = [
    { icon: '🏠', label: 'Home',    href: 'skillstream-teacher-dashboard.html' },
    { icon: '📘', label: 'Courses', href: 'skillstream-courses.html' },
    { icon: '🧠', label: 'AI',      href: 'skillstream-ai-hub.html' },
    { icon: '💬', label: 'Messages',href: 'skillstream-messages.html' },
    { icon: '👤', label: 'Profile', href: 'skillstream-profile.html' }
  ];

  function currentFile() {
    var path = window.location.pathname.split('/').pop();
    return path === '' ? 'index.html' : path;
  }

  function render(items) {
    var current = currentFile();
    var nav = document.createElement('nav');
    nav.className = 'ln-bottom-nav';
    items.forEach(function (item) {
      var btn = document.createElement('a');
      btn.href = item.href;
      btn.className = 'ln-nav-item' + (item.href === current ? ' active' : '');
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
