/* LNE_FEED: the "For you" swipe feed on the Discover page.
   Cards come only from content that already exists: The Edge (edge_items), Opportunities and scholarships (opportunities),
   plus a small hand-checked set of "did you know" facts. No AI is used and no video: text only, so it is light on mobile data.
   Swipe up/down: each card snaps into place (CSS scroll-snap). After 10 cards it stops and offers 10 more or Learn.
   Save keeps the card's id on this phone only (localStorage 'lne_feed_saved').  Ask AI opens the AI Teacher with the question ready to send.
   Texts are plain English strings: js/i18n.js translates them like everywhere else; facts carry their own translations. */
(function () {
  'use strict';
  var BATCH = 10;
  var T = function (s) { try { return (window.LNE_I18N && LNE_I18N.t) ? LNE_I18N.t(s) : s; } catch (e) { return s; } };
  var LANG = (window.LNE_I18N && LNE_I18N.lang) || 'en';
  var FACTS = [
    { en: 'Sudan has more pyramids than Egypt.', ar: 'في السودان أهرامات أكثر مما في مصر.', fr: 'Le Soudan compte plus de pyramides que l’Égypte.', es: 'Sudán tiene más pirámides que Egipto.', zh: '苏丹的金字塔比埃及还多。' },
    { en: 'The word "algorithm" comes from the name of the scholar al-Khwarizmi.', ar: 'كلمة «خوارزمية» مأخوذة من اسم العالِم الخوارزمي.', fr: 'Le mot « algorithme » vient du nom du savant al-Khwarizmi.', es: 'La palabra «algoritmo» viene del nombre del sabio al-Juarismi.', zh: '“算法”一词来自学者花剌子密的名字。' },
    { en: 'Sunlight takes about 8 minutes to reach the Earth.', ar: 'يحتاج ضوء الشمس نحو 8 دقائق ليصل إلى الأرض.', fr: 'La lumière du Soleil met environ 8 minutes à atteindre la Terre.', es: 'La luz del Sol tarda unos 8 minutos en llegar a la Tierra.', zh: '阳光大约需要 8 分钟才能到达地球。' },
    { en: 'An octopus has three hearts.', ar: 'للأخطبوط ثلاثة قلوب.', fr: 'Une pieuvre a trois cœurs.', es: 'Un pulpo tiene tres corazones.', zh: '章鱼有三颗心脏。' },
    { en: 'A day on Venus is longer than a year on Venus.', ar: 'اليوم على كوكب الزهرة أطول من سنته.', fr: 'Sur Vénus, un jour dure plus longtemps qu’une année.', es: 'En Venus, un día dura más que un año.', zh: '金星上的一天比金星上的一年还长。' },
    { en: 'Your brain uses about one fifth of your body’s energy.', ar: 'يستهلك دماغك نحو خُمس طاقة جسمك.', fr: 'Votre cerveau utilise environ un cinquième de l’énergie de votre corps.', es: 'Tu cerebro usa alrededor de una quinta parte de la energía de tu cuerpo.', zh: '你的大脑消耗约五分之一的身体能量。' },
    { en: 'Sleeping after you study helps your brain keep what you learned.', ar: 'النوم بعد المذاكرة يساعد دماغك على الاحتفاظ بما تعلّمته.', fr: 'Dormir après avoir étudié aide votre cerveau à retenir ce que vous avez appris.', es: 'Dormir después de estudiar ayuda a tu cerebro a conservar lo aprendido.', zh: '学习后睡觉，有助于大脑记住所学内容。' },
    { en: 'The Nile basin is shared by 11 countries.', ar: 'يشترك في حوض النيل 11 دولة.', fr: 'Le bassin du Nil est partagé par 11 pays.', es: 'La cuenca del Nilo la comparten 11 países.', zh: '尼罗河流域由 11 个国家共享。' },
    { en: 'Bananas are berries, but strawberries are not.', ar: 'الموز يُعدّ من التوت علميًا، أما الفراولة فلا.', fr: 'Les bananes sont des baies, mais pas les fraises.', es: 'Los plátanos son bayas, pero las fresas no.', zh: '从植物学上讲，香蕉是浆果，而草莓不是。' },
    { en: 'Honey almost never spoils: edible honey has been found in very old tombs.', ar: 'العسل لا يكاد يفسد: عُثر على عسل صالح للأكل في مقابر قديمة جدًا.', fr: 'Le miel ne se gâte presque jamais : on en a trouvé de comestible dans de très anciennes tombes.', es: 'La miel casi nunca se estropea: se ha encontrado miel comestible en tumbas muy antiguas.', zh: '蜂蜜几乎不会变质：在很古老的墓中发现过仍可食用的蜂蜜。' }
  ];
  function css() {
    if (document.getElementById('lneFeedCss')) return;
    var s = document.createElement('style'); s.id = 'lneFeedCss';
    s.textContent = '.ff-h{display:flex;align-items:center;justify-content:space-between;margin:6px 2px 10px}.ff-h b{font-size:11.5px;letter-spacing:.9px;text-transform:uppercase;color:#6B6558}' +
      '.ff-h button{border:1.5px solid #E2C27A;background:#fff;border-radius:20px;padding:6px 12px;font-weight:700;font-size:12px;color:#8A4B1C;cursor:pointer}.ff-h button.on{background:#F7C65A}' +
      '.ff-box{height:min(70vh,560px);overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;border-radius:18px;-webkit-overflow-scrolling:touch}' +
      '.ff-c{scroll-snap-align:start;scroll-snap-stop:always;min-height:100%;display:flex;flex-direction:column;justify-content:flex-start;gap:10px;background:#FFFBF2;border:1.5px solid var(--k,#D4872A);border-top-width:6px;border-radius:18px;padding:16px;margin-bottom:10px;box-shadow:0 0 0 2px #F7C65A44,0 6px 18px rgba(138,75,28,.18);color:#141F38}' +
      '.ff-edge{--k:#2F8F8B;--kt:#1F6F6B}.ff-opp{--k:#5E8A3A;--kt:#46702A}.ff-fact{--k:#D4872A;--kt:#A25A1C}.ff-t{font-size:11px;letter-spacing:1.5px;font-weight:800;color:var(--kt,#A25A1C);display:flex;align-items:center;gap:8px}.ff-t [data-ic]{transform:scale(.8);transform-origin:left center}' +
      '.ff-c h2{font-size:20px;line-height:1.3;margin:0;font-family:inherit;overflow-wrap:anywhere}.ff-c p{font-size:15px;line-height:1.55;color:#5a4a3a;margin:0;overflow-wrap:anywhere}' +
      '.ff-m{font-size:12.5px;color:#8a6a4a}.ff-b{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.ff-b button,.ff-b a{padding:10px 14px;border-radius:12px;border:1.5px solid #E2C27A;background:#fff;font-weight:700;font-size:13.5px;color:#5A3214;cursor:pointer;text-decoration:none;font-family:inherit}' +
      '.ff-b .go{margin-inline-start:auto;background:linear-gradient(180deg,#F7C65A,#D4872A);border-color:#D4872A;color:#4A2810}.ff-b button.sv{background:#FFF0C8}' +
      '.ff-end{scroll-snap-align:start;min-height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:10px;background:#F3E6CC;border-radius:18px;padding:20px;color:#5A3214;margin-bottom:10px}.ff-end b{font-size:20px}' +
      '.ff-end .ff-b{justify-content:center}.ff-empty{padding:24px;text-align:center;color:#6B6558}';
    document.head.appendChild(s);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var IND = { ai: 'AI', health: 'Health', energy: 'Energy', space: 'Space', computing: 'Computing', finance: 'Finance & economy', transport: 'Transport' };
  function indName(k) { return IND[k] ? T(IND[k]) : (k || ''); }
  function cut(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
  function saved() { try { return JSON.parse(localStorage.getItem('lne_feed_saved') || '{}') || {}; } catch (e) { return {}; } }
  function setSaved(o) { try { localStorage.setItem('lne_feed_saved', JSON.stringify(o)); } catch (e) {} }
  function daysLeft(d) { var t = new Date(d); if (isNaN(t)) return null; var n = new Date(); t.setHours(23, 59, 59, 0); return Math.ceil((t - n) / 86400000); }

  async function load(sb) {
    var edge = [], opp = [];
    try {
      var r = await sb.from('edge_items').select('id,industry,title,what_text,why_text,source_name,created_at,tr').eq('hidden', false).order('created_at', { ascending: false }).limit(30);
      if (r.error) r = await sb.from('edge_items').select('id,industry,title,what_text,why_text,source_name,created_at').eq('hidden', false).order('created_at', { ascending: false }).limit(30);
      if (!r.error && r.data) edge = r.data;
    } catch (e) {}
    try { var o = await sb.from('opportunities').select('id,kind,title,country,deadline,description,status').eq('status', 'published').limit(60); if (!o.error && o.data) opp = o.data.filter(function (x) { var d = x.deadline ? daysLeft(x.deadline) : null; return d === null || d >= 0; }); } catch (e) {}
    var cards = [];
    edge.forEach(function (x) { cards.push({ id: 'e' + x.id, type: 'edge', tag: 'The Edge', ic: 'star', title: ((x.tr && x.tr[LANG] && x.tr[LANG].t) || x.title), text: cut((x.tr && x.tr[LANG] && x.tr[LANG].w) || x.what_text || x.why_text, 200), meta: indName(x.industry), href: 'skillstream-edge.html' }); });
    opp.forEach(function (x) { var d = x.deadline ? daysLeft(x.deadline) : null; cards.push({ id: 'o' + x.id, type: 'opp', tag: x.kind === 'scholarship' ? 'Scholarship' : 'Opportunity', ic: 'opp', title: x.title, text: cut(x.description, 200), meta: [x.country, d === null ? '' : (d === 0 ? T('Closes today') : T('Closes in') + ' ' + d + ' ' + T('days'))].filter(Boolean).join(' · '), href: 'skillstream-opportunities.html' }); });
    var facts = FACTS.map(function (f, i) { return { id: 'f' + i, type: 'fact', tag: 'Did you know', ic: 'ask', title: f[LANG] || f.en, text: '', meta: '', href: '', q: f.en }; });
    // shuffle each source, then take turns: edge, opportunity, fact, edge, ...
    function shuf(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    var q = [shuf(edge.length ? cards.filter(function (c) { return c.type === 'edge'; }) : []), shuf(cards.filter(function (c) { return c.type === 'opp'; })), shuf(facts)], out = [];
    while (q.some(function (a) { return a.length; })) q.forEach(function (a) { if (a.length) out.push(a.shift()); });
    return out;
  }

  function mount(root, sb) {
    if (!root) return; css();
    var all = [], shown = 0, onlySaved = false;
    var head = el('div', 'ff-h'); head.appendChild(el('b', '', T('For you')));
    var sv = el('button', '', T('Saved')); sv.type = 'button'; head.appendChild(sv); root.appendChild(head);
    var box = el('div', 'ff-box'); box.setAttribute('tabindex', '0'); root.appendChild(box);
    box.appendChild(el('div', 'ff-empty', T('Loading…')));
    function card(c) {
      var d = el('div', 'ff-c ff-' + c.type); var tg = el('div', 'ff-t'); var ic = document.createElement('span'); ic.setAttribute('data-ic', c.ic); tg.appendChild(ic); tg.appendChild(el('span', '', T(c.tag).toUpperCase())); d.appendChild(tg);
      var h = el('h2', '', c.title); if (c.type !== 'fact') h.setAttribute('data-no-i18n', ''); d.appendChild(h);
      if (c.text) { var p = el('p', '', c.text); p.setAttribute('data-no-i18n', ''); d.appendChild(p); }
      if (c.meta) { var m = el('div', 'ff-m', c.meta); m.setAttribute('data-no-i18n', ''); d.appendChild(m); }
      var b = el('div', 'ff-b');
      var s = saved(), sb1 = el('button', 'sv', s[c.id] ? '🔖 ' + T('Saved') : '🔖 ' + T('Save')); sb1.type = 'button';
      sb1.onclick = function () { var o = saved(); if (o[c.id]) { delete o[c.id]; sb1.textContent = '🔖 ' + T('Save'); } else { o[c.id] = { id: c.id, type: c.type, tag: c.tag, ic: c.ic, title: c.title, text: c.text, meta: c.meta, href: c.href, q: c.q || c.title }; sb1.textContent = '🔖 ' + T('Saved'); } setSaved(o); };
      b.appendChild(sb1);
      var ask = el('button', '', '🤖 ' + T('Ask AI')); ask.type = 'button';
      ask.onclick = function () { var q = (T('Explain this simply:') + ' ' + (c.q || c.title) + (c.text ? '. ' + c.text : '')).slice(0, 400); location.href = 'skillstream-ai-hub.html?ask=' + encodeURIComponent(q); };
      b.appendChild(ask);
      if (c.href) { var go = el('a', 'go', T('Open') + ' ›'); go.href = c.href; b.appendChild(go); }
      d.appendChild(b); return d;
    }
    function more() {
      var list = onlySaved ? Object.keys(saved()).map(function (k) { return saved()[k]; }) : all;
      box.textContent = '';
      if (!list.length) { box.appendChild(el('div', 'ff-empty', onlySaved ? T('Nothing saved yet.') : T('Nothing to show yet. Check again soon.'))); return; }
      var upto = onlySaved ? list.length : Math.min(shown, list.length);
      for (var i = 0; i < upto; i++) box.appendChild(card(list[i]));
      if (!onlySaved) {
        var end = el('div', 'ff-end'); end.appendChild(el('b', '', T('That’s all for now') + ' 🌙'));
        end.appendChild(el('div', '', T('Take a break, or keep exploring.')));
        var eb = el('div', 'ff-b');
        if (shown < list.length) { var mb = el('button', 'go', T('Show more')); mb.type = 'button'; mb.onclick = function () { shown += BATCH; var y = box.scrollTop; more(); box.scrollTop = y + box.clientHeight; }; eb.appendChild(mb); }
        var ln = el('a', '', T('Go to Learn')); ln.href = 'skillstream-hub-learn.html'; eb.appendChild(ln);
        end.appendChild(eb); box.appendChild(end);
      }
      try { if (window.LNE_WORLD && LNE_WORLD.refresh) LNE_WORLD.refresh(); } catch (e) {}
    }
    sv.onclick = function () { onlySaved = !onlySaved; sv.classList.toggle('on', onlySaved); more(); };
    load(sb).then(function (cards) { all = cards; shown = BATCH; more(); }).catch(function () { box.textContent = ''; box.appendChild(el('div', 'ff-empty', T('Could not load. Check your connection.'))); });
  }
  window.LNE_FEED = { mount: mount };
})();
