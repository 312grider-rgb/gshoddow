/* Search the app: a small round button on every page. Type a word (Arabic or English) and jump to the page.
   Everything runs on the phone: no database, no data used. Loaded by js/i18n.js. */
(function () {
  'use strict';
  var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var SKIP = /^(skillstream-(login|forgot-password|reset-password|confirm|signup|live-video|live-session|session-detail|whiteboard|chess|ludo|xo|payments|teachers)\.html|index\.html)$/;
  if (SKIP.test(path) || /admin/.test(path) || window.__lneSearch) return;
  window.__lneSearch = 1;
  var lang = (window.LNE_I18N && window.LNE_I18N.lang) || 'en';

  // u = page, e = English name, a = Arabic name, k = extra words (English + Arabic)
  var P = [
    ['skillstream-home.html', 'Home', 'الرئيسية', 'start welcome main بداية'],
    ['skillstream-dashboard.html', 'My dashboard', 'لوحتي', 'student progress stats تقدم طالب'],
    ['skillstream-classrooms.html', 'Classrooms', 'الفصول', 'class classroom join create code students chat assignments quiz grades attendance recordings lessons people صف فصل انضمام واجب اختبار درجات حضور تسجيل'],
    ['skillstream-whiteboard.html', 'Whiteboard', 'السبورة', 'board draw write teach سبورة رسم كتابة شرح'],
    ['skillstream-record.html', 'Record a lesson', 'تسجيل درس', 'record voice audio lesson تسجيل صوت'],
    ['skillstream-lessons.html', 'Lessons', 'الدروس', 'lesson videos watch دروس'],
    ['skillstream-courses.html', 'My courses', 'دوراتي', 'course learn study دورة تعلم'],
    ['skillstream-self-paced.html', 'Self-paced learning', 'التعلم الذاتي', 'self learning alone تعلم ذاتي'],
    ['skillstream-academic.html', 'Academic studies', 'الدراسات الأكاديمية', 'school university subjects math science مدرسة جامعة مواد رياضيات علوم'],
    ['skillstream-library.html', 'Library', 'المكتبة', 'books read pdf كتب قراءة'],
    ['skillstream-ai-hub.html', 'AI tools', 'أدوات الذكاء الاصطناعي', 'ai help tutor ask question homework ذكاء اصطناعي مساعدة سؤال'],
    ['skillstream-teacher-ai.html', 'Teacher AI', 'مساعد المعلم الذكي', 'lesson plan teacher assistant خطة درس'],
    ['skillstream-ai-history.html', 'My AI history', 'سجل الذكاء الاصطناعي', 'history past answers سجل'],
    ['skillstream-teachers-directory.html', 'Our teachers', 'معلمونا', 'teacher find tutor معلم مدرس'],
    ['skillstream-teach-apply.html', 'Become a teacher', 'كن معلماً', 'apply teach teacher تقديم تدريس'],
    ['skillstream-teacher-dashboard.html', 'Teacher dashboard', 'لوحة المعلم', 'teacher students classes معلم'],
    ['skillstream-messages.html', 'Messages', 'الرسائل', 'chat message inbox رسائل محادثة'],
    ['skillstream-community.html', 'Community', 'المجتمع', 'friends forum share مجتمع أصدقاء'],
    ['skillstream-hub-community.html', 'Community hub', 'مركز المجتمع', 'community'],
    ['skillstream-hub-learn.html', 'Learn hub', 'مركز التعلم', 'learn'],
    ['skillstream-hub-profile.html', 'Profile hub', 'مركز الملف الشخصي', 'profile'],
    ['skillstream-calendar.html', 'Calendar', 'التقويم', 'schedule date events موعد جدول'],
    ['skillstream-challenges.html', 'Learning challenges', 'تحديات التعلم', 'challenge compete تحدي مسابقة'],
    ['skillstream-puzzle.html', 'Daily mission', 'المهمة اليومية', 'puzzle daily puzzle لغز يومي'],
    ['skillstream-games.html', 'Games', 'الألعاب', 'play fun game ألعاب لعب'],
    ['skillstream-chess.html', 'Chess', 'الشطرنج', 'game شطرنج'],
    ['skillstream-ludo.html', 'Ludo', 'لودو', 'game'],
    ['skillstream-xo.html', 'X-O', 'إكس أو', 'game tic tac toe'],
    ['skillstream-leaderboard.html', 'Leaderboard', 'لوحة الصدارة', 'rank points top ranking ترتيب نقاط'],
    ['skillstream-scholarships.html', 'Scholarships', 'المنح الدراسية', 'scholarship grant funding منحة'],
    ['skillstream-jobs.html', 'Jobs', 'الوظائف', 'job work hiring وظيفة عمل'],
    ['skillstream-careers.html', 'Careers', 'المسارات المهنية', 'career future مهنة مستقبل'],
    ['skillstream-opportunities.html', 'Opportunities', 'الفرص', 'opportunity internship فرص تدريب'],
    ['skillstream-discover.html', 'Discover', 'اكتشف', 'explore new اكتشاف'],
    ['skillstream-discoveries.html', 'Discoveries and records', 'الاكتشافات والسجلات', 'records discoveries'],
    ['skillstream-edge.html', 'The Edge', 'الحافة', 'news edge latest أخبار'],
    ['skillstream-future-architect.html', 'Future Architect', 'مهندس المستقبل', 'future plan change مستقبل خطة'],
    ['skillstream-world.html', 'World', 'العالم', 'world map'],
    ['skillstream-passport.html', 'My passport', 'جواز سفري', 'passport certificate شهادة جواز'],
    ['skillstream-vault.html', 'My vault', 'خزانتي', 'vault saved files خزنة ملفات'],
    ['skillstream-mywork.html', 'My work', 'أعمالي', 'work projects assignments أعمال مشاريع'],
    ['skillstream-showcase.html', 'Project showcase', 'معرض المشاريع', 'showcase project مشروع معرض'],
    ['skillstream-shared.html', 'Shared with teachers', 'مشارك مع المعلمين', 'shared'],
    ['skillstream-engine.html', 'My learning', 'تعلمي', 'learning engine path'],
    ['skillstream-focus.html', 'Focus mode', 'وضع التركيز', 'focus timer pomodoro study تركيز مؤقت'],
    ['skillstream-school.html', 'My school', 'مدرستي', 'school مدرسة'],
    ['skillstream-family.html', 'My family', 'عائلتي', 'family parent عائلة أسرة'],
    ['skillstream-parent-home.html', 'Parent home', 'صفحة ولي الأمر', 'parent father mother ولي أمر'],
    ['skillstream-recognition.html', 'Student feedback and recognition', 'التقدير والملاحظات', 'recognition thanks feedback شكر تقدير'],
    ['skillstream-profile.html', 'My profile', 'ملفي الشخصي', 'profile name photo account حساب صورة اسم'],
    ['skillstream-settings.html', 'Settings', 'الإعدادات', 'settings language password text size notifications لغة كلمة المرور حجم الخط'],
    ['skillstream-pricing.html', 'Plans and pricing', 'الخطط والأسعار', 'price pay plan subscription free سعر دفع اشتراك مجاني'],
    ['skillstream-faq.html', 'FAQ', 'الأسئلة الشائعة', 'help questions support مساعدة أسئلة'],
    ['skillstream-contact.html', 'Contact', 'اتصل بنا', 'contact us email support تواصل'],
    ['skillstream-feedback.html', 'Send feedback', 'أرسل ملاحظاتك', 'feedback idea problem bug ملاحظات مشكلة اقتراح'],
    ['skillstream-about.html', 'About', 'عن المنصة', 'about us who من نحن'],
    ['skillstream-privacy.html', 'Privacy policy', 'سياسة الخصوصية', 'privacy data خصوصية'],
    ['skillstream-terms.html', 'Terms of service', 'شروط الخدمة', 'terms rules شروط']
  ];
  var UI = {
    en: ['Search', 'Search the app…', 'No results. Try another word.', 'Close'],
    ar: ['بحث', 'ابحث في التطبيق…', 'لا توجد نتائج. جرّب كلمة أخرى.', 'إغلاق'],
    fr: ['Rechercher', "Rechercher dans l'application…", 'Aucun résultat. Essayez un autre mot.', 'Fermer'],
    es: ['Buscar', 'Buscar en la app…', 'Sin resultados. Prueba otra palabra.', 'Cerrar'],
    zh: ['搜索', '在应用中搜索…', '没有结果，请换个词。', '关闭']
  };
  var L = UI[lang] || UI.en;

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[^a-z0-9؀-ۿÀ-ɏ一-鿿 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function label(p) {
    if (lang === 'ar') return p[2];
    try { var t = window.LNE_I18N && window.LNE_I18N.t ? window.LNE_I18N.t(p[1]) : p[1]; return t || p[1]; } catch (e) { return p[1]; }
  }
  var idx = null;
  function build() {
    idx = P.map(function (p) { return { p: p, name: norm(label(p)), hay: norm(p[1] + ' ' + p[2] + ' ' + p[3] + ' ' + label(p)) }; });
  }
  function find(q) {
    var toks = norm(q).split(' ').filter(Boolean);
    if (!toks.length) return [];
    if (!idx) build();
    var out = [];
    idx.forEach(function (it) {
      var score = 0, ok = true;
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (it.name.indexOf(t) === 0) score += 6;
        else if (it.name.indexOf(' ' + t) >= 0) score += 5;
        else if (it.name.indexOf(t) >= 0) score += 4;
        else if (it.hay.indexOf(' ' + t) >= 0 || it.hay.indexOf(t) === 0) score += 2;
        else if (t.length >= 3 && it.hay.indexOf(t) >= 0) score += 1;
        else { ok = false; break; }
      }
      if (ok) out.push({ it: it, s: score });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 8).map(function (x) { return x.it.p; });
  }

  function mk(tag, css, txt) { var n = document.createElement(tag); if (css) n.style.cssText = css; if (txt) n.textContent = txt; return n; }
  var btn, ov, input, list;
  function close() { if (ov) { ov.style.display = 'none'; document.body.style.overflow = ''; } }
  function show(q) {
    list.textContent = '';
    var r = find(q);
    if (!norm(q)) return;
    if (!r.length) { list.appendChild(mk('div', 'padding:16px;color:#8A4B1C;font:600 16px/1.4 system-ui,sans-serif', L[2])); return; }
    r.forEach(function (p) {
      var a = mk('a', 'display:block;padding:14px 16px;margin:0 0 8px;background:#fff;border:1.5px solid #E9E2D2;border-radius:14px;color:#5A3214;font:700 17px/1.3 system-ui,sans-serif;text-decoration:none', label(p));
      a.href = p[0]; a.setAttribute('data-no-i18n', ''); list.appendChild(a);
    });
  }
  function open() {
    if (!ov) {
      ov = mk('div', 'position:fixed;inset:0;z-index:2147483000;background:#F8EFE0;display:none;overflow:auto;padding:12px 14px 80px;box-sizing:border-box');
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', L[0]);
      var row = mk('div', 'display:flex;gap:8px;align-items:center;margin:0 0 12px');
      input = mk('input', 'flex:1;min-width:0;box-sizing:border-box;min-height:48px;padding:0 14px;border:2px solid #8A4B1C;border-radius:14px;background:#fff;color:#5A3214;font:600 17px system-ui,sans-serif');
      input.type = 'search'; input.placeholder = L[1]; input.setAttribute('aria-label', L[0]); input.autocomplete = 'off'; input.setAttribute('data-no-i18n', '');
      var x = mk('button', 'min-width:48px;min-height:48px;border:1.5px solid #E9E2D2;border-radius:14px;background:#fff;color:#5A3214;font:700 20px system-ui,sans-serif;cursor:pointer', '×');
      x.type = 'button'; x.setAttribute('aria-label', L[3]); x.onclick = close;
      row.appendChild(input); row.appendChild(x); ov.appendChild(row);
      list = mk('div'); ov.appendChild(list);
      input.addEventListener('input', function () { show(input.value); });
      ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
      document.body.appendChild(ov);
    }
    ov.style.display = 'block'; document.body.style.overflow = 'hidden';
    input.value = ''; list.textContent = '';
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
  }
  function place() {
    // Sit in the top corner of the page header. If the bell (or another button) is already there, move beside it.
    var hd = document.querySelector('header.top');
    btn.style.insetInlineEnd = '14px';
    var r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, hit = false;
    try {
      document.elementsFromPoint(cx, cy).forEach(function (el) {
        if (el === btn || btn.contains(el)) return;
        var n = el.closest && el.closest('button,a,[role=button]');
        if (n && n !== btn && (!hd || hd.contains(n))) hit = true;
      });
    } catch (e) {}
    if (hit) btn.style.insetInlineEnd = '78px';
    var ey = document.getElementById('lneSearchPad'); if (ey) ey.textContent = 'html header.top .eyebrow{padding-inline-end:' + (hit ? 124 : 70) + 'px}';
  }
  function init() {
    if (document.getElementById('lneSearchBtn') || !document.body) return;
    var hd = document.querySelector('header.top');
    btn = mk('button', 'position:' + (hd ? 'absolute' : 'fixed') + ';top:14px;inset-inline-end:14px;z-index:9000;width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,.85);background:#5A3214;color:#fff;box-shadow:0 3px 10px rgba(90,50,20,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0');
    btn.id = 'lneSearchBtn'; btn.type = 'button'; btn.setAttribute('aria-label', L[0]);
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>';
    btn.onclick = open;
    if (hd) {
      if (getComputedStyle(hd).position === 'static') hd.style.position = 'relative';
      hd.appendChild(btn);
      var st = document.createElement('style'); st.id = 'lneSearchPad'; document.head.appendChild(st);
    } else document.body.appendChild(btn);
    place(); setTimeout(place, 900); setTimeout(place, 2000); setTimeout(place, 4000);
  }
  window.addEventListener('popstate', close);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
