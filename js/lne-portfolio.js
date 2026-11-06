/* LNE_PORTFOLIO: the "Human Potential Portfolio" card on the Profile tab (students).
   A constellation drawn from the learner's OWN Passport entries: every skill tag is a star;
   two skills are joined when they appear in the same entry. How bright a star is depends on
   how well it is backed up (the same three levels as the Passport page):
   reviewed by a teacher (gold), recorded by the app (bright), said by the learner (ring).
   Nothing is invented and nothing is shared: only the signed-in person's own rows are read.
   LNE_PORTFOLIO.mount(el, sb, userId) */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var T = function (s) { try { return (root.LNE_I18N && root.LNE_I18N.t) ? root.LNE_I18N.t(s) : s; } catch (e) { return s; } };
  var RANK = { self: 1, recorded: 2, reviewed: 3 };
  var SPOTS = [[160, 62], [104, 40], [214, 36], [64, 78], [258, 74], [120, 100], [204, 98], [32, 36], [292, 38], [160, 20], [86, 112], [236, 116]];
  function sv(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function css() {
    if (document.getElementById('lnePortfolioCss')) return;
    var s = document.createElement('style'); s.id = 'lnePortfolioCss';
    s.textContent = '.lp-card{padding:16px;margin-bottom:6px;box-shadow:0 8px 24px rgba(16,26,54,.16)}' +
      '.lp-k{font-size:13px;letter-spacing:1.6px;text-transform:uppercase;color:#E4C583;font-weight:800;margin-bottom:6px}' +
      '.lp-svg{display:block;width:100%;height:auto;max-height:200px}' +
      '.lp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
      '.lp-chip{background:rgba(255,255,255,.1);border-radius:14px;padding:4px 11px;font-size:14px;font-weight:600;overflow-wrap:anywhere;max-width:100%}' +
      '.lp-chip b{color:#E4C583;margin-inline-start:4px}' +
      '.lp-facts{display:flex;gap:8px;margin-top:14px}' +
      '.lp-fact{flex:1;min-width:0;background:rgba(255,255,255,.08);border-radius:12px;padding:10px 3px;text-align:center}' +
      '.lp-fact b{display:block;font-size:22px;line-height:1.1}' +
      '.lp-fact span{display:block;font-size:12px;opacity:.78;margin-top:3px;overflow-wrap:break-word;hyphens:auto}' +
      '.lp-empty{font-size:15.5px;line-height:1.5;margin-top:6px}' +
      '.lp-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;opacity:.8;margin-top:12px}' +
      '.lp-legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-inline-end:5px;vertical-align:-1px;box-sizing:border-box}' +
      '.lp-go{display:block;text-align:center;margin-top:14px;background:#C9A653;color:#101A36;font-weight:800;font-size:15px;padding:12px;border-radius:12px;text-decoration:none;min-height:44px;box-sizing:border-box}';
    document.head.appendChild(s);
  }
  // entries: [{skill_tags:[], trust_level}] -> the stars and the lines between them
  function build(entries) {
    var map = {}, order = [];
    entries.forEach(function (e) {
      var tags = (e.skill_tags || []).map(function (t) { return String(t).trim(); }).filter(Boolean);
      tags.forEach(function (t) {
        var k = t.toLowerCase(), r = RANK[e.trust_level] || 1;
        if (!map[k]) { map[k] = { name: t, n: 0, trust: 1 }; order.push(k); }
        map[k].n++; if (r > map[k].trust) map[k].trust = r;
      });
    });
    var skills = order.map(function (k) { return map[k]; }).sort(function (a, b) { return b.trust - a.trust || b.n - a.n || a.name.localeCompare(b.name); }).slice(0, SPOTS.length);
    var idx = {}; skills.forEach(function (s, i) { idx[s.name.toLowerCase()] = i; });
    var links = {}, out = [];
    entries.forEach(function (e) {
      var ids = (e.skill_tags || []).map(function (t) { return idx[String(t).trim().toLowerCase()]; }).filter(function (v) { return v !== undefined; });
      ids = ids.filter(function (v, i) { return ids.indexOf(v) === i; });
      for (var a = 0; a < ids.length; a++) for (var b = a + 1; b < ids.length; b++) { var key = Math.min(ids[a], ids[b]) + '-' + Math.max(ids[a], ids[b]); if (!links[key]) { links[key] = 1; out.push([Math.min(ids[a], ids[b]), Math.max(ids[a], ids[b])]); } }
    });
    return { skills: skills, links: out, total: order.length };
  }
  function draw(b) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 320 130'); svg.setAttribute('class', 'lp-svg'); svg.setAttribute('role', 'img'); svg.setAttribute('focusable', 'false');
    b.links.forEach(function (l) { sv('line', { x1: SPOTS[l[0]][0], y1: SPOTS[l[0]][1], x2: SPOTS[l[1]][0], y2: SPOTS[l[1]][1], stroke: 'rgba(228,197,131,.5)', 'stroke-width': 1 }, svg); });
    b.skills.forEach(function (s, i) {
      var p = SPOTS[i], big = Math.min(3 + s.n * .6, 5.5);
      if (s.trust === 3) { sv('circle', { cx: p[0], cy: p[1], r: big + 5, fill: 'rgba(228,197,131,.22)' }, svg); sv('circle', { cx: p[0], cy: p[1], r: big, fill: '#E4C583' }, svg); }
      else if (s.trust === 2) { sv('circle', { cx: p[0], cy: p[1], r: big + 4, fill: 'rgba(248,245,237,.16)' }, svg); sv('circle', { cx: p[0], cy: p[1], r: big, fill: '#F8F5ED' }, svg); }
      else sv('circle', { cx: p[0], cy: p[1], r: big, fill: 'none', stroke: 'rgba(248,245,237,.75)', 'stroke-width': 1.4 }, svg);
    });
    return svg;
  }
  function render(el, d) {
    css();
    var b = build(d.entries || []), card = h('div', 'uv-sky lp-card');
    card.appendChild(h('div', 'lp-k', T('My Human Potential Portfolio')));
    if (!b.skills.length) {
      var e = document.createElementNS(NS, 'svg'); e.setAttribute('viewBox', '0 0 320 60'); e.setAttribute('class', 'lp-svg'); e.setAttribute('aria-hidden', 'true');
      [[50, 30], [110, 16], [170, 38], [232, 20], [280, 36]].forEach(function (p) { sv('circle', { cx: p[0], cy: p[1], r: 3, fill: 'none', stroke: 'rgba(248,245,237,.3)', 'stroke-width': 1 }, e); });
      card.appendChild(e); card.appendChild(h('div', 'lp-empty', T('No stars yet. Add an entry with skills to your Passport and they will appear here.')));
    } else {
      var svg = draw(b); svg.setAttribute('aria-label', b.skills.map(function (s) { return s.name; }).join(', ')); card.appendChild(svg);
      var chips = h('div', 'lp-chips'); b.skills.forEach(function (s) { var c = h('span', 'lp-chip', s.name); if (s.n > 1) c.appendChild(h('b', null, '×' + s.n)); chips.appendChild(c); }); card.appendChild(chips);
      var lg = h('div', 'lp-legend'), dots = [['#E4C583', 'Reviewed by a teacher', ''], ['#F8F5ED', 'Recorded by the app', ''], ['transparent', 'Said by me', '1.4px solid rgba(248,245,237,.75)']];
      dots.forEach(function (x) { var s = h('span'), i = h('i'); i.style.background = x[0]; if (x[2]) i.style.border = x[2]; s.appendChild(i); s.appendChild(document.createTextNode(T(x[1]))); lg.appendChild(s); }); card.appendChild(lg);
    }
    var f = h('div', 'lp-facts');
    [[d.entries ? d.entries.length : 0, 'Passport entries'], [d.lessons, 'Lessons Done'], [d.certs, 'Certificates']].forEach(function (x) { var t = h('div', 'lp-fact'); t.appendChild(h('b', null, x[0] === null || x[0] === undefined ? '–' : String(x[0]))); t.appendChild(h('span', null, T(x[1]))); f.appendChild(t); });
    card.appendChild(f);
    var go = h('a', 'lp-go', T('Open my Passport')); go.href = 'skillstream-passport.html'; card.appendChild(go);
    el.textContent = ''; el.appendChild(card);
  }
  async function count(q) { try { var r = await q; return r.error ? null : (r.count || 0); } catch (e) { return null; } }
  async function mount(el, sb, userId) {
    if (!el) return;
    try {
      var res = await Promise.all([
        sb.from('passport_entries').select('skill_tags,trust_level').eq('user_id', userId).limit(200),
        count(sb.from('lesson_progress').select('lesson_id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true)),
        count(sb.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', userId))
      ]);
      if (el.dataset.off) return;
      render(el, { entries: res[0] && !res[0].error && res[0].data ? res[0].data : [], lessons: res[1], certs: res[2] });
    } catch (e) { if (!el.dataset.off) render(el, { entries: [], lessons: null, certs: null }); }
  }
  root.LNE_PORTFOLIO = { mount: mount, render: render, build: build };
})(typeof window !== 'undefined' ? window : this);
