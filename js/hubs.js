/* Learning Never Ends — the three "hub" pages behind the bottom tabs: Learn, Community, Profile.
   Each hub only groups links to pages that already exist; it changes no data and rewrites no page.
   A hub page calls  LNE_HUB.render('learn' | 'discover' | 'community' | 'profile', role)  where role is 'teacher' or 'student'.
   Texts are plain English strings: js/i18n.js translates them like everywhere else.
   Load after js/nav.js (it provides the icons):  <script src="js/nav.js" defer></script><script src="js/hubs.js" defer></script> */
(function () {
  function L(icon, label, desc, href, only) { return { icon: icon, label: label, desc: desc, href: href, only: only || null }; }

  var HUBS = {
    learn: {
      student: {
        title: 'Learn', intro: 'Everything for your studies, in one place.',
        sections: [
          { title: 'My classes', links: [
            L('chat', 'Classrooms', 'Your classes, lessons and work', 'skillstream-classrooms.html'),
            L('ai', 'AI teacher', 'Your personal tutor, step by step', 'skillstream-ai-hub.html'),
            L('teach', 'AI classroom', 'Learn a topic at your own pace', 'skillstream-ai-hub.html#classroom')
          ] },
          { title: 'AI helpers', links: [
            L('ai', 'Stuck on a problem?', 'Get a hint, step by step', 'skillstream-ai-hub.html#homework'),
            L('book', 'Summarise', 'Turn long content into key points', 'skillstream-ai-hub.html#summary'),
            L('star', 'Quiz me', 'Test yourself on any topic', 'skillstream-ai-hub.html#quiz'),
            L('compass', 'Translate', 'Translate content instantly', 'skillstream-ai-hub.html#translate'),
            L('calendar', 'Build a plan', 'A plan to reach your goal', 'skillstream-ai-hub.html#plan')
          ] },
          { title: 'My learning', links: [
            L('plan', 'Ideas & Plans', 'Capture ideas and turn them into plans', 'skillstream-ideas.html'),
            L('ai', 'My Learning', 'Your goals and a path of steps to tick off', 'skillstream-engine.html'),
            L('book', 'My courses', 'The courses you are taking', 'skillstream-courses.html'),
            L('library', 'Academic studies', 'School and university subjects', 'skillstream-academic.html')
          ] },
          { title: 'Materials', links: [
            L('library', 'Library', 'Books, PDFs and photos', 'skillstream-library.html'),
            L('calendar', 'Calendar', 'Schedules, deadlines and classes', 'skillstream-calendar.html')
          ] },
          { title: 'More', more: true, links: [
            L('book', 'My work', 'Assignments and quizzes from all your classes', 'skillstream-mywork.html'),
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
            L('chat', 'Classrooms', 'Your classes, lessons and students', 'skillstream-classrooms.html'),
            L('plan', 'Ideas & Plans', 'Capture ideas and turn them into plans', 'skillstream-ideas.html'),
            L('ai', 'Teacher AI', 'Plan lessons, make quizzes and understand your students', 'skillstream-teacher-ai.html'),
            L('teach', 'Record a lesson', 'Talk and write on a board for your class', 'skillstream-record.html')
          ] },
          { title: 'More', more: true, links: [
            L('library', 'Library', 'Books, PDFs and photos', 'skillstream-library.html'),
            L('calendar', 'Calendar', 'Schedules, deadlines and classes', 'skillstream-calendar.html'),
            L('home', 'My school', 'Your school and its activities', 'skillstream-school.html'),
            L('compass', 'Focus mode', 'Work without distractions', 'skillstream-focus.html')
          ] }
        ]
      }
    },
    discover: {
      all: {
        title: 'Discover', intro: 'The future, the world and your next step.',
        sections: [
          { title: 'Explore', tiles: true, links: [
            L('ai', 'Future Architect', 'Understand change and design your future', 'skillstream-future-architect.html'),
            L('library', 'Discoveries', 'Things you found and records you set', 'skillstream-discoveries.html'),
            L('compass', 'World', 'See how countries are progressing, with real data', 'skillstream-world.html'),
            L('star', 'The Edge', 'What is new at the frontier of science and technology', 'skillstream-edge.html'),
            L('people', 'Opportunities', 'Opportunities to explore and save', 'skillstream-opportunities.html'),
            L('trophy', 'Scholarships', 'Official scholarship programmes and how to prepare', 'skillstream-scholarships.html'),
            L('teach', 'Jobs', 'Real job links and jobs posted by schools and employers', 'skillstream-jobs.html'),
            L('book', 'Careers', 'Careers and what each subject leads to', 'skillstream-careers.html'),
            L('compass', 'Worlds of knowledge', 'Explore and start learning', 'skillstream-discover.html')
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
          { title: 'Show and play', links: [
            L('star', 'Daily mission', 'Three new puzzles every day', 'skillstream-puzzle.html'),
            L('games', 'Games', 'Learn while you play', 'skillstream-games.html'),
            L('trophy', 'Leaderboard', 'See how you are doing', 'skillstream-leaderboard.html'),
            L('image', 'Showcase', 'See and share what people made', 'skillstream-showcase.html')
          ] },
          { title: 'More', more: true, links: [
            L('book', 'Shared work', 'A private space for work shared with a teacher', 'skillstream-shared.html'),
            L('chat', 'Whiteboard', 'Draw and explain ideas', 'skillstream-whiteboard.html'),
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
            L('user', 'My details', 'Your name, photo and bio', 'skillstream-profile.html'),
            L('star', 'My Passport', 'What you really did, with a link you can share', 'skillstream-passport.html')
          ] },
          { title: 'Account', links: [
            L('settings', 'Settings', 'Language, text size and your account', 'skillstream-settings.html'),
            L('user', 'My family', 'Link with a parent or guardian', 'skillstream-family.html')
          ] },
          { title: 'More', more: true, links: [
            L('compass', 'Discoveries and records', 'Things you found and records you set', 'skillstream-discoveries.html'),
            L('library', 'My Vault', 'Private notes only you can read', 'skillstream-vault.html'),
            L('library', 'Opportunities', 'Opportunities to explore and save', 'skillstream-opportunities.html'),
            L('chat', 'My AI history', 'Your past AI answers and plans', 'skillstream-ai-history.html'),
            L('people', 'Parent view', 'Follow the progress of a child you care for', 'skillstream-parent-home.html?as=parent'),
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
      '.hub-more{margin-top:20px}.hub-more summary{cursor:pointer;list-style:none;text-align:center;padding:14px;border-radius:14px;border:1.5px dashed #C9A24E;color:#8A6A1F;font-weight:700;font-size:15px}.hub-more summary::-webkit-details-marker{display:none}.hub-more[open] summary{margin-bottom:12px}' +
      '.hub-grid.hub-tiles{display:flex;overflow-x:auto;gap:8px;padding:2px 2px 8px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}.hub-tiles .hub-card{flex:0 0 112px;align-items:center;text-align:center;padding:10px 4px;gap:4px;scroll-snap-align:start}.hub-tiles .hub-card b{font-size:12px;overflow-wrap:break-word;word-break:normal;hyphens:none}.hub-tiles .hub-ic{transform:scale(.7);margin:-8px 0}.hub-tiles .hub-d{display:none}' +
      '@media (min-width:700px){.hub-grid:not(.hub-tiles){grid-template-columns:repeat(3,minmax(0,1fr))}}';
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
      var host = root;
      if (sec.more) {
        var dt = document.createElement('details'); dt.className = 'hub-more';
        var sm = document.createElement('summary'); sm.textContent = sec.title; dt.appendChild(sm);
        root.appendChild(dt); host = dt;
      } else {
        var h = document.createElement('div'); h.className = 'hub-h'; h.textContent = sec.title; root.appendChild(h);
      }
      var grid = document.createElement('div'); grid.className = 'hub-grid' + (sec.tiles ? ' hub-tiles' : '');
      links.forEach(function (l) {
        var a = document.createElement('a'); a.className = 'hub-card'; a.href = l.href;
        var ic = document.createElement('span'); ic.className = 'hub-ic'; ic.setAttribute('data-c', C3D[l.icon] || 'sap'); ic.setAttribute('aria-hidden', 'true'); ic.innerHTML = icons[l.icon] || '';   // our own fixed icon markup, never user data
        var b = document.createElement('b'); b.textContent = l.label;
        var d = document.createElement('span'); d.className = 'hub-d'; d.textContent = l.desc;
        a.appendChild(ic); a.appendChild(b); a.appendChild(d); grid.appendChild(a);
      });
      host.appendChild(grid);
    });
  }

  window.LNE_HUB = { render: render, HUBS: HUBS };
})();
