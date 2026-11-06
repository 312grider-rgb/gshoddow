/* LNE_UNIVERSE: the "My Learning Universe" picture on Home.
   A small static SVG built only from numbers the app already has:
   planets = courses started, stars = lessons finished, gold stars = certificates.
   Nothing is invented: with no progress it shows a dim, honest empty sky.
   LNE_UNIVERSE.render(el, {courses, lessons, certs}) */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500];
  // Plain texts go through T(). Texts with numbers are written in English and the page's translator fills the pattern.
  var T = function (s) { try { return (root.LNE_I18N && root.LNE_I18N.t) ? root.LNE_I18N.t(s) : s; } catch (e) { return s; } };
  function fill(s, a) { return s.replace(/\{(\d+)\}/g, function (m, i) { return a[i] !== undefined ? a[i] : m; }); }
  function sv(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function div(cls, txt) { var e = document.createElement('div'); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function css() {
    if (document.getElementById('lneUniverseViz')) return;
    var s = document.createElement('style'); s.id = 'lneUniverseViz';
    s.textContent = '.lu-card{padding:16px 16px 14px;margin-bottom:16px;box-shadow:0 8px 24px rgba(16,26,54,.16)}' +
      '.lu-k{font-size:13px;letter-spacing:1.6px;text-transform:uppercase;color:#E4C583;font-weight:800;margin-bottom:6px}' +
      '.lu-svg{display:block;width:100%;height:auto;max-height:190px}' +
      '.lu-line{font-size:15.5px;line-height:1.45;margin-top:6px}' +
      '.lu-bar{height:8px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:8px}' +
      '.lu-bar>i{display:block;height:100%;background:#40B99A;border-radius:4px}' +
      '.lu-legend{font-size:13px;line-height:1.5;opacity:.72;margin-top:10px}';
    document.head.appendChild(s);
  }
  function star5(cx, cy, R, r) { var p = [], i, a; for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; var rad = i % 2 ? r : R; p.push((cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1)); } return p.join(' '); }
  // the 12 places for lesson stars, in the order they light up (a loose constellation)
  var SPOTS = [[24, 98], [46, 76], [70, 88], [92, 62], [116, 74], [138, 48], [34, 52], [60, 36], [88, 28], [112, 20], [18, 22], [140, 100]];
  var LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6], [6, 7], [7, 8], [8, 9], [6, 10], [4, 11]];

  function draw(n) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 320 130'); svg.setAttribute('class', 'lu-svg'); svg.setAttribute('role', 'img'); svg.setAttribute('focusable', 'false');
    var lit = Math.min(n.lessons, SPOTS.length), i;
    LINKS.forEach(function (l) { if (l[0] < lit && l[1] < lit) sv('line', { x1: SPOTS[l[0]][0], y1: SPOTS[l[0]][1], x2: SPOTS[l[1]][0], y2: SPOTS[l[1]][1], stroke: 'rgba(228,197,131,.55)', 'stroke-width': 1 }, svg); });
    SPOTS.forEach(function (p, k) {
      if (k < lit) { sv('circle', { cx: p[0], cy: p[1], r: 6.5, fill: 'rgba(248,245,237,.14)' }, svg); sv('circle', { cx: p[0], cy: p[1], r: 2.8, fill: '#F8F5ED' }, svg); }
      else sv('circle', { cx: p[0], cy: p[1], r: 2.4, fill: 'none', stroke: 'rgba(248,245,237,.28)', 'stroke-width': 1 }, svg);
    });
    // the learner, with two orbits; one planet for each course started (up to 6)
    var cx = 208, cy = 70, rx = 66, ry = 27, phi = -12 * Math.PI / 180;
    [[rx, ry, .32], [rx + 30, ry + 12, .14]].forEach(function (o) { sv('ellipse', { cx: cx, cy: cy, rx: o[0], ry: o[1], fill: 'none', stroke: 'rgba(201,166,83,' + o[2] + ')', 'stroke-width': 1, transform: 'rotate(-12 ' + cx + ' ' + cy + ')' }, svg); });
    sv('circle', { cx: cx, cy: cy, r: 13, fill: 'rgba(201,166,83,.18)' }, svg); sv('circle', { cx: cx, cy: cy, r: 6.5, fill: '#C9A653' }, svg);
    var pl = Math.min(n.courses, 6);
    for (i = 0; i < pl; i++) {
      var t = -Math.PI / 2 + i * (2 * Math.PI / Math.max(pl, 3)) + .5;
      var px = cx + rx * Math.cos(t) * Math.cos(phi) - ry * Math.sin(t) * Math.sin(phi), py = cy + rx * Math.cos(t) * Math.sin(phi) + ry * Math.sin(t) * Math.cos(phi);
      sv('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: 7.5, fill: 'rgba(64,185,154,.2)' }, svg); sv('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: 4.6, fill: '#40B99A' }, svg);
    }
    if (n.courses === 0) sv('circle', { cx: cx + rx * .9, cy: cy - 10, r: 4, fill: 'none', stroke: 'rgba(64,185,154,.5)', 'stroke-width': 1, 'stroke-dasharray': '2 2' }, svg);
    // certificates: gold stars top right (up to 4)
    var cs = Math.min(n.certs, 4);
    for (i = 0; i < 4; i++) {
      var sx = 252 + i * 18, sy = 16 + (i % 2) * 7;
      sv('polygon', { points: star5(sx, sy, 7.5, 3.2), fill: i < cs ? '#E4C583' : 'none', stroke: i < cs ? 'none' : 'rgba(228,197,131,.3)', 'stroke-width': 1 }, svg);
    }
    return svg;
  }
  function next(lessons) { for (var i = 0; i < MILESTONES.length; i++) if (MILESTONES[i] > lessons) return { to: MILESTONES[i], from: i ? MILESTONES[i - 1] : 0 }; return null; }

  function render(el, d) {
    if (!el) return; css();
    var n = { courses: Math.max(0, d.courses | 0), lessons: Math.max(0, d.lessons | 0), certs: Math.max(0, d.certs | 0) };
    var card = div('uv-sky lu-card');
    card.appendChild(div('lu-k', T('My Learning Universe')));
    var svg = draw(n);
    svg.setAttribute('aria-label', n.courses + ' ' + T('Courses Started') + ', ' + n.lessons + ' ' + T('Lessons Done') + ', ' + n.certs + ' ' + T('Certificates'));
    card.appendChild(svg);
    if (n.lessons === 0) card.appendChild(div('lu-line', T('Your universe is waiting. Finish a lesson to light your first star.')));
    else {
      var nx = next(n.lessons);
      card.appendChild(div('lu-line', nx ? fill('Lessons done: {0}. Next milestone at {1}.', [n.lessons, nx.to]) : fill('Lessons done: {0}.', [n.lessons])));
      if (nx) { var bar = div('lu-bar'), fillI = document.createElement('i'); fillI.style.width = Math.max(4, Math.min(100, Math.round((n.lessons - nx.from) * 100 / (nx.to - nx.from)))) + '%'; bar.appendChild(fillI); card.appendChild(bar); }
    }
    card.appendChild(div('lu-legend', T('Planets are courses you started. Stars are lessons you finished. Gold stars are certificates.')));
    el.textContent = ''; el.appendChild(card);
  }
  root.LNE_UNIVERSE = { render: render, next: next };
})(typeof window !== 'undefined' ? window : this);
