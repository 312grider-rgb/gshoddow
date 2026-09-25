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
    // Default to learner nav immediately so it never blocks on auth;
    // swap to teacher nav once/if we know the role.
    render(LEARNER_ITEMS);

    if (window.SSAuth && window.SSAuth.ready) {
      window.SSAuth.ready.then(function () {
        var user = window.SSAuth.currentUser && window.SSAuth.currentUser();
        if (user && user.role === 'teacher') {
          var old = document.querySelector('.ln-bottom-nav');
          if (old) old.remove();
          render(TEACHER_ITEMS);
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
