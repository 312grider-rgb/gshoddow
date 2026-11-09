/* Learning Never Ends — the three "hub" pages behind the bottom tabs: Learn, Community, Profile.
   Each hub only groups links to pages that already exist; it changes no data and rewrites no page.
   A hub page calls  LNE_HUB.render('learn' | 'community' | 'profile', role)  where role is 'teacher' or 'student'.
   Texts are plain English strings: js/i18n.js translates them like everywhere else.
   Load after js/nav.js (it provides the icons):  <script src="js/nav.js" defer></script><script src="js/hubs.js" defer></script> */
(function () {
  function L(icon, label, desc, href, only) { return { icon: icon, label: label, desc: desc, href: href, only: only || null }; }

  var HUBS = {
    learn: {
      student: {
        title: 'Learn', intro: 'Everything for your studies, in one place.',
        sections: [
          { title: 'My learning', links: [
            L('ai', 'My Learning', 'Your goals and a path of steps to tick off', 'skillstream-engine.html'),
            L('book', 'My courses', 'The courses you are taking', 'skillstream-courses.html'),
            L('book', 'Self-paced learning', 'Learn at your own speed', 'skillstream-self-paced.html'),
            L('library', 'Academic studies', 'School and university subjects', 'skillstream-academic.html')
          ] },
          { title: 'Lessons and materials', links: [
            L('book', 'Lessons', 'Recorded lessons from your teachers', 'skillstream-lessons.html'),
            L('library', 'Library', 'Books, PDFs and videos', 'skillstream-library.html'),
            L('book', 'My work', 'Assignments and quizzes from your classes', 'skillstream-mywork.html'),
            L('calendar', 'Calendar', 'Schedules, deadlines and classes', 'skillstream-calendar.html')
          ] },
          { title: 'Classes and school', links: [
            L('chat', 'Classrooms', 'Join a class with a code from your teacher', 'skillstream-classrooms.html'),
            L('home', 'My school', 'Your school and its activities', 'skillstream-school.html'),
            L('teach', 'Our teachers', 'Meet the teachers', 'skillstream-teachers-directory.html'),
            L('compass', 'Focus mode', 'Study without distractions', 'skillstream-focus.html')
          ] }
        ]
      },
      teacher: {
        title: 'Teach', intro: 'Your classes, lessons and students.',
        sections: [
          { title: 'Your teaching', links: [
            L('book', 'Courses', 'Create and manage your courses', 'skillstream-courses.html'),
            L('chat', 'Classrooms', 'Your classes and students', 'skillstream-classrooms.html'),
            L('ai', 'Teacher AI', 'Plan lessons, make quizzes and understand your students', 'skillstream-teacher-ai.html'),
            L('teach', 'Record a lesson', 'Talk and write on a board for your class', 'skillstream-record.html'),
            L('book', 'Lessons', 'The recorded lessons in your classes', 'skillstream-lessons.html')
          ] },
          { title: 'Resources', links: [
            L('library', 'Library', 'Books, PDFs and videos', 'skillstream-library.html'),
            L('calendar', 'Calendar', 'Schedules, deadlines and classes', 'skillstream-calendar.html'),
            L('home', 'My school', 'Your school and its activities', 'skillstream-school.html'),
            L('compass', 'Focus mode', 'Work without distractions', 'skillstream-focus.html')
          ] }
        ]
      }
    },
    community: {
      all: {
        title: 'Community', intro: 'Talk, work together and share with others.',
        sections: [
          { title: 'Messages', links: [
            L('chat', 'Private messages', 'Chat with teachers, classmates and your classes', 'skillstream-messages.html'),
            L('chat', 'Study groups', 'Learn together in groups', 'skillstream-community.html')
          ] },
          { title: 'Work together', links: [
            L('book', 'Shared work', 'A private space for work shared with a teacher', 'skillstream-shared.html'),
            L('chat', 'Whiteboard', 'Draw and explain ideas', 'skillstream-whiteboard.html')
          ] },
          { title: 'Show and play', links: [
            L('image', 'Showcase', 'See and share what people made', 'skillstream-showcase.html'),
            L('star', 'Daily mission', 'Three new puzzles every day', 'skillstream-puzzle.html'),
            L('games', 'Games', 'Learn while you play', 'skillstream-games.html'),
            L('trophy', 'Leaderboard', 'See how you are doing', 'skillstream-leaderboard.html'),
            L('star', 'Learning challenges', 'Small challenges to grow your skills', 'skillstream-challenges.html'),
            L('star', 'Feedback and recognition', 'Kind words and recognition from teachers', 'skillstream-recognition.html')
          ] }
        ]
      }
    },
    profile: {
      all: {
        title: 'Profile', intro: 'Your identity, your growth and your settings.',
        sections: [
          { title: 'My identity', links: [
            L('user', 'Profile', 'Your name, photo and details', 'skillstream-profile.html'),
            L('star', 'My Passport', 'What you really did, with a link you can share', 'skillstream-passport.html')
          ] },
          { title: 'My growth', links: [
            L('compass', 'Discoveries and records', 'Things you found and records you set', 'skillstream-discoveries.html'),
            L('library', 'My Vault', 'Private notes only you can read', 'skillstream-vault.html'),
            L('library', 'Opportunities', 'Opportunities to explore and save', 'skillstream-opportunities.html'),
            L('chat', 'My AI history', 'Your past AI answers and plans', 'skillstream-ai-history.html')
          ] },
          { title: 'My family', links: [
            L('user', 'My family', 'Link with a parent or guardian', 'skillstream-family.html'),
            L('people', 'Parent view', 'Follow the progress of a child you care for', 'skillstream-parent-home.html?as=parent')
          ] },
          { title: 'Account', links: [
            L('settings', 'Settings', 'Language, text size and your account', 'skillstream-settings.html'),
            L('star', 'Plans and pricing', 'See the plans', 'skillstream-pricing.html'),
            L('chat', 'Send feedback', 'Tell us what to improve', 'skillstream-feedback.html'),
            L('teach', 'Become a teacher', 'Apply to teach on the platform', 'skillstream-teach-apply.html', 'student')
          ] }
        ]
      },
      parent: {
        title: 'Profile', intro: 'Your account and the learners you follow.',
        sections: [
          { title: 'Learners', links: [
            L('people', 'Learners I follow', 'See a short progress summary', 'skillstream-family.html'),
            L('user', 'Parent home', 'Your overview', 'skillstream-parent-home.html')
          ] },
          { title: 'Account', links: [
            L('settings', 'Settings', 'Language, text size and your account', 'skillstream-settings.html'),
            L('chat', 'Send feedback', 'Tell us what to improve', 'skillstream-feedback.html'),
            L('book', 'Learner view', 'Switch to the learner view', 'skillstream-parent-home.html?as=learner')
          ] }
        ]
      }
    }
  };

  function css() {
    if (document.getElementById('ln-hub-css')) return;
    var st = document.createElement('style'); st.id = 'ln-hub-css';
    st.textContent =
      '.hub-wrap{padding:18px;max-width:900px;margin:0 auto}' +
      '.hub-h{font-size:11.5px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:#6B6558;margin:20px 2px 10px}' +
      '.hub-h:first-child{margin-top:4px}' +
      '.hub-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}' +
      '.hub-card{min-width:0;display:flex;flex-direction:column;gap:6px;background:#fff;border:1px solid #E9E2D2;border-radius:14px;padding:14px 12px;color:#141F38;text-decoration:none;box-shadow:0 2px 10px rgba(20,31,56,.06);min-height:92px}' +
      '.hub-card:active{background:#FBF4E2;border-color:#C9A24E}' +
      '.hub-card .hub-ic{color:#8A6A1F;display:flex;line-height:0}' +
      '.hub-card b{font-size:14.5px;line-height:1.25;overflow-wrap:break-word}' +
      '.hub-card span.hub-d{font-size:12.5px;line-height:1.4;color:#6B6558;overflow-wrap:break-word}' +
      '.hub-card:focus-visible{outline:3px solid #C9A24E;outline-offset:2px}' +
      '@media (min-width:700px){.hub-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}';
    document.head.appendChild(st);
  }

  function pick(key, role) {
    var h = HUBS[key]; if (!h) return null;
    return h[role] || h.all || h.student || null;
  }

  var C3D = { user:'sap', home:'sap', teach:'sap', star:'amb', trophy:'amb', compass:'eme', book:'eme', library:'ame', ai:'ame', chat:'oce', calendar:'oce', image:'rose', games:'rose', settings:'sla', more:'sla' };
  function render(key, role) {
    css();
    var parentView = false; try { parentView = role !== 'teacher' && localStorage.getItem('lne_view') === 'parent'; } catch (e) {}
    var def = pick(key, role === 'teacher' ? 'teacher' : (parentView && HUBS[key] && HUBS[key].parent ? 'parent' : 'student')); if (!def) return;
    var icons = window.LNE_ICONS || {};
    var root = document.getElementById('hubRoot'); if (!root) return;
    root.textContent = '';
    var h1 = document.getElementById('hubTitle'); if (h1) h1.textContent = def.title;
    var p = document.getElementById('hubIntro'); if (p) p.textContent = def.intro;
    var tt = def.title + ' — Learning Never Ends'; document.title = tt;
    def.sections.forEach(function (sec) {
      var links = sec.links.filter(function (l) { return !l.only || l.only === (role === 'teacher' ? 'teacher' : 'student'); });
      if (!links.length) return;
      var h = document.createElement('div'); h.className = 'hub-h'; h.textContent = sec.title; root.appendChild(h);
      var grid = document.createElement('div'); grid.className = 'hub-grid';
      links.forEach(function (l) {
        var a = document.createElement('a'); a.className = 'hub-card'; a.href = l.href;
        var ic = document.createElement('span'); ic.className = 'hub-ic'; ic.setAttribute('data-c', C3D[l.icon] || 'sap'); ic.setAttribute('aria-hidden', 'true'); ic.innerHTML = icons[l.icon] || '';   // our own fixed icon markup, never user data
        var b = document.createElement('b'); b.textContent = l.label;
        var d = document.createElement('span'); d.className = 'hub-d'; d.textContent = l.desc;
        a.appendChild(ic); a.appendChild(b); a.appendChild(d); grid.appendChild(a);
      });
      root.appendChild(grid);
    });
  }

  window.LNE_HUB = { render: render, HUBS: HUBS };
})();
