/* LNE_MATH: a small exact maths solver that runs on the phone (no AI, no network).
   Handles: + - x / ^, brackets, decimals, fractions, percentages ("20% of 150"),
   and linear equations in one letter ("2x + 3 = 11", "3(x-1) = x + 5").
   solve(text, labels) -> null (not maths, or too hard: let the AI try)
                        | { lines:[{s, c}], say }   c = 'black' | 'blue' | 'red'
   Every result is exact (BigInt fractions). Nothing is guessed. */
(function (root) {
  'use strict';
  var LIM = 1000000000000000000000000000000n;   // digits guard (~30 digits)
  function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a; }
  function F(n, d) { if (d === undefined) d = 1n; if (d === 0n) throw new Error('div0'); if (d < 0n) { n = -n; d = -d; } var g = gcd(n, d) || 1n; n /= g; d /= g; if (n > LIM || n < -LIM || d > LIM) throw new Error('big'); return { n: n, d: d }; }
  function add(a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return F(a.n * b.n, a.d * b.d); }
  function div(a, b) { if (b.n === 0n) throw new Error('div0'); return F(a.n * b.d, a.d * b.n); }
  function pw(a, e) {   // integer exponent only
    if (e.d !== 1n) throw new Error('unsupported'); var k = e.n; if (k > 12n || k < -12n) throw new Error('unsupported');
    var neg = k < 0n; if (neg) k = -k; var r = F(1n), i; for (i = 0n; i < k; i++) r = mul(r, a);
    return neg ? div(F(1n), r) : r;
  }
  function isZero(a) { return a.n === 0n; } function eq(a, b) { return a.n === b.n && a.d === b.d; }

  /* ---------- reading the text ---------- */
  var AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
  function normalise(s) {
    s = String(s || '').toLowerCase();
    s = s.replace(/[٠-٩]/g, function (c) { return AR.indexOf(c); }).replace(/[۰-۹]/g, function (c) { return FA.indexOf(c); });
    s = s.replace(/٫/g, '.').replace(/[×✕✖·∙⋅]/g, '*').replace(/÷/g, '/').replace(/[−–—‒]/g, '-').replace(/٪|％/g, '%').replace(/＝/g, '=').replace(/（/g, '(').replace(/）/g, ')');
    s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
    return s.replace(/\s+/g, ' ').trim();
  }
  var LEAD = /^(?:please |s'il vous pla[iî]t |por favor )?(?:solve|calculate|compute|evaluate|simplify|what is|what's|find|r[ée]sous|r[ée]soudre|calcule|calculer|combien font|combien fait|resuelve|resolver|calcula|calcular|cu[aá]nto es|احسب|حل|ما هو ناتج|ما ناتج|كم يساوي|计算|解|求)\s*[:：]?\s*/;
  var OF = /(?:of|de|من|的|d')/;

  function tokenize(s) {
    var t = [], i = 0, m;
    while (i < s.length) {
      var c = s[i];
      if (c === ' ') { i++; continue; }
      if ((m = /^(\d+)\s*\/\s*(\d+)(?![\d.])(?!\s*\^)/.exec(s.slice(i))) && !(t.length && (t[t.length - 1].k === '^' || t[t.length - 1].k === '/')) && !/^\d+\.|^\.\d/.test(s.slice(i))) {
        t.push({ k: 'n', v: m[1] + '/' + m[2], frac: true }); i += m[0].length; continue;
      }
      if ((m = /^\d+(?:\.\d+)?|^\.\d+/.exec(s.slice(i)))) { t.push({ k: 'n', v: m[0] }); i += m[0].length; continue; }
      if (/[a-z]/.test(c)) { t.push({ k: 'v', v: c }); i++; continue; }
      if ('+-*/^()=%'.indexOf(c) >= 0) { t.push({ k: c }); i++; continue; }
      throw new Error('char');
    }
    // implicit multiplication: 2x, 3(x+1), (a)(b), x(2)
    var o = [], j;
    for (j = 0; j < t.length; j++) {
      var p = o[o.length - 1], q = t[j];
      if (p && (p.k === 'n' || p.k === 'v' || p.k === ')' || p.k === '%') && (q.k === 'v' || q.k === '(' || (q.k === 'n' && (p.k === ')' )))) { if (!(p.k === '%')) o.push({ k: '*', imp: true }); }
      o.push(q);
    }
    return o;
  }
  /* grammar: sum := term (('+'|'-') term)* ; term := unary (('*'|'/') unary)* ; unary := '-' unary | power ;
     power := atom ('^' unary)? ; atom := number ['%'] | var | '(' sum ')' */
  function parse(tokens) {
    var i = 0, vars = {};
    function peek() { return tokens[i]; }
    function eat(k) { if (peek() && peek().k === k) return tokens[i++]; return null; }
    function sum() { var l = term(), o; while (peek() && (peek().k === '+' || peek().k === '-')) { o = tokens[i++].k; l = { t: 'b', o: o, l: l, r: term() }; } return l; }
    function term() { var l = unary(), o, tk; while (peek() && (peek().k === '*' || peek().k === '/')) { tk = tokens[i++]; o = tk.k; l = { t: 'b', o: o, l: l, r: unary(), imp: !!tk.imp }; } return l; }
    function unary() { if (eat('-')) return { t: 'u', x: unary() }; if (eat('+')) return unary(); return power(); }
    function power() { var b = atom(); if (peek() && peek().k === '^') { i++; return { t: 'b', o: '^', l: b, r: unary() }; } return b; }
    function atom() {
      var tk = tokens[i++]; if (!tk) throw new Error('end');
      if (tk.k === 'n') { var node = tk.frac ? { t: 'n', v: F(BigInt(tk.v.split('/')[0]), BigInt(tk.v.split('/')[1])), s: tk.v, frac: true } : { t: 'n', v: lit(tk.v), s: tk.v }; if (peek() && peek().k === '%') { i++; return { t: 'b', o: '/', l: node, r: { t: 'n', v: F(100n), s: '100' }, pct: true }; } return node; }
      if (tk.k === 'v') { vars[tk.v] = 1; return { t: 'x', n: tk.v }; }
      if (tk.k === '(') { var e = sum(); if (!eat(')')) throw new Error('paren'); return { t: 'p', x: e }; }
      throw new Error('syntax');
    }
    var tree = sum(); return { tree: tree, rest: tokens.slice(i), vars: Object.keys(vars) };
  }
  function lit(s) {   // exact value of "12.375"
    var a = s.split('.'), frac = a[1] || ''; if (s.replace('.', '').length > 18) throw new Error('big');
    return F(BigInt(a[0] || '0') * (10n ** BigInt(frac.length)) + BigInt(frac || '0'), 10n ** BigInt(frac.length));
  }

  /* ---------- showing numbers ---------- */
  var DEC = false;   // show results as decimals when the question used decimals
  function decimalOf(a, maxDigits) {   // exact decimal if it terminates, else null
    var d = a.d, two = 0, five = 0; while (d % 2n === 0n) { d /= 2n; two++; } while (d % 5n === 0n) { d /= 5n; five++; }
    if (d !== 1n) return null; var k = Math.max(two, five); if (k > (maxDigits || 8)) return null;
    var scaled = a.n * (10n ** BigInt(k)) / a.d, neg = scaled < 0n; if (neg) scaled = -scaled;
    var str = scaled.toString(); if (k) { while (str.length <= k) str = '0' + str; str = str.slice(0, str.length - k) + '.' + str.slice(str.length - k); }
    return (neg ? '-' : '') + str;
  }
  function approx(a, places) {
    var neg = a.n < 0n, n = neg ? -a.n : a.n, scaled = (n * (10n ** BigInt(places)) * 2n + a.d) / (2n * a.d), s = scaled.toString();
    while (s.length <= places) s = '0' + s; var r = s.slice(0, s.length - places) + '.' + s.slice(s.length - places); r = r.replace(/0+$/, '').replace(/\.$/, '');
    return (neg ? '-' : '') + r;
  }
  function show(a) {
    if (a.d === 1n) return a.n.toString();
    if (DEC) { var x = decimalOf(a); if (x !== null) return x; }
    return a.n.toString() + '/' + a.d.toString();
  }

  /* ---------- arithmetic with steps ---------- */
  function clone(n) { return JSON.parse(JSON.stringify(n, function (k, v) { return typeof v === 'bigint' ? { big: v.toString() } : v; }), function (k, v) { return v && typeof v === 'object' && typeof v.big === 'string' ? BigInt(v.big) : v; }); }
  var PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
  function str(n, par, side) {
    var s, p;
    if (n.t === 'n') { s = n.s !== undefined ? n.s : show(n.v); if ((n.v.n < 0n && par > 0) || (n.s === undefined && n.v.d !== 1n && par >= 2 && s.indexOf('/') >= 0)) s = '(' + s + ')'; return s; }
    if (n.t === 'x') return n.n;
    if (n.t === 'p') return '(' + str(n.x, 0) + ')';
    if (n.t === 'u') { s = '-' + str(n.x, 3); return par > 3 ? '(' + s + ')' : s; }
    if (n.pct) return str(n.l, 5) + '%';
    if (n.imp && n.o === '*') return str(n.l, 2, 'l') + str(n.r, 2, 'r');
    var op = n.o, glyph = op === '*' ? ' × ' : op === '/' ? ' ÷ ' : ' ' + (op === '-' ? '-' : op) + ' ';
    if (op === '^') glyph = '^';
    p = PREC[op]; s = str(n.l, p, 'l') + glyph + str(n.r, p + (op === '^' ? 0 : (side === 'r' ? 0 : 0)) + (op === '-' || op === '/' ? 0.5 : 0), 'r');
    return par > p || (par === p && side === 'r' && (op === '-' || op === '/')) ? '(' + s + ')' : s;
  }
  function evalOp(o, a, b) { return o === '+' ? add(a, b) : o === '-' ? sub(a, b) : o === '*' ? mul(a, b) : o === '/' ? div(a, b) : pw(a, b); }
  function isNum(n) { return n && n.t === 'n'; }
  /* one round of simplification: all operations that are ready and have the highest priority */
  function stepOnce(tree) {
    var best = -1, found = [];
    function scan(n, depth) {
      if (n.t === 'p') { scan(n.x, depth + 1); return; }
      if (n.t === 'u') { if (isNum(n.x)) { var pr = depth * 10 + 3; consider(n, pr); } else scan(n.x, depth); return; }
      if (n.t === 'b') {
        if (isNum(n.l) && isNum(n.r)) consider(n, depth * 10 + (n.pct ? 3 : n.o === '^' ? 4 : PREC[n.o] === 2 ? 2 : 1));
        else { scan(n.l, depth); scan(n.r, depth); }
      }
    }
    function consider(n, pr) { if (pr > best) { best = pr; found = [n]; } else if (pr === best) found.push(n); }
    var simp = false;
    (function tidy(n) { if (!n || typeof n !== 'object') return; if (n.t === 'n') { if (n.frac && n.s !== (n.v.d === 1n ? n.v.n.toString() : n.v.n + '/' + n.v.d)) { n.s = undefined; n.frac = false; simp = true; } return; } ['x', 'l', 'r'].forEach(function (k) { if (n[k] && typeof n[k] === 'object' && n[k].t) tidy(n[k]); }); })(tree);
    if (simp) return true;
    scan(tree, 0); if (best < 0) return false;
    found.forEach(function (n) {
      var isPct = n.t === 'b' && n.pct, v = n.t === 'u' ? F(-n.x.v.n, n.x.v.d) : evalOp(n.o, n.l.v, n.r.v), ps = isPct ? n.l.s + '/100' : undefined;
      for (var k in n) delete n[k]; n.t = 'n'; n.v = v; if (isPct) { n.s = ps; n.frac = true; }
    });
    return true;
  }
  function unwrap(n) {   // (5) -> 5, anywhere in the tree
    if (n.t === 'p') { n.x = unwrap(n.x); if (isNum(n.x)) return n.x; return n; }
    if (n.t === 'u') { n.x = unwrap(n.x); return n; }
    if (n.t === 'b') { n.l = unwrap(n.l); n.r = unwrap(n.r); } return n;
  }
  function hasDec(s) { return /\d\.\d|\.\d/.test(s); }
  function arith(tree, labels, rawText) {
    DEC = hasDec(rawText);
    var lines = [], cur = unwrap(clone(tree)), guard = 0, first = str(cur, 0);
    lines.push({ s: first, c: 'black' });
    if (isNum(cur) && !cur.frac) return null;   // just a number: nothing to solve
    if (isNum(cur)) { stepOnce(cur); var l1 = '= ' + str(cur, 0); if (l1 !== '= ' + first && l1.slice(2) !== first) lines.push({ s: l1, c: 'black' }); }
    while (!isNum(cur) && guard++ < 40) {
      if (!stepOnce(cur)) return null;
      cur = unwrap(cur);
      var ln = '= ' + str(cur, 0); if (lines[lines.length - 1].s !== ln && lines[lines.length - 1].s !== str(cur, 0)) lines.push({ s: ln, c: 'black' });
    }
    if (!isNum(cur)) return null;
    if (lines.length > 8) { lines = [lines[0], lines[1], { s: '…', c: 'black' }].concat(lines.slice(lines.length - 4)); }
    var v = cur.v; if (lines.length === 1 && v.d === 1n) return null;
    var last = lines.pop(); lines.push({ s: last.s, c: 'red' });
    if (v.d !== 1n && decimalOf(v) === null) lines.push({ s: '≈ ' + approx(v, 4), c: 'red' });
    else if (v.d !== 1n && !DEC) lines.push({ s: '= ' + decimalOf(v), c: 'red' });
    return { lines: lines, say: first + ' = ' + (v.d === 1n || decimalOf(v) !== null ? show(v) : show(v) + ' ≈ ' + approx(v, 4)) };
  }

  /* ---------- linear equations ---------- */
  function lin(n, vname) {   // -> {a, b} meaning a*x + b
    if (n.t === 'n') return { a: F(0n), b: n.v };
    if (n.t === 'x') return { a: F(1n), b: F(0n) };
    if (n.t === 'p') return lin(n.x, vname);
    if (n.t === 'u') { var u = lin(n.x, vname); return { a: F(-u.a.n, u.a.d), b: F(-u.b.n, u.b.d) }; }
    var l = lin(n.l, vname), r = lin(n.r, vname);
    if (n.o === '+') return { a: add(l.a, r.a), b: add(l.b, r.b) };
    if (n.o === '-') return { a: sub(l.a, r.a), b: sub(l.b, r.b) };
    if (n.o === '*') { if (isZero(l.a)) return { a: mul(r.a, l.b), b: mul(r.b, l.b) }; if (isZero(r.a)) return { a: mul(l.a, r.b), b: mul(l.b, r.b) }; throw new Error('unsupported'); }
    if (n.o === '/') { if (!isZero(r.a)) throw new Error('unsupported'); return { a: div(l.a, r.b), b: div(l.b, r.b) }; }
    if (n.o === '^') { if (isZero(l.a) && isZero(r.a)) return { a: F(0n), b: pw(l.b, r.b) }; throw new Error('unsupported'); }
    throw new Error('unsupported');
  }
  function coefStr(a, v) {   // "2x", "x", "-x", "(1/2)x"
    if (eq(a, F(1n))) return v; if (eq(a, F(-1n))) return '-' + v;
    var s = show(a); if (s.indexOf('/') >= 0) s = '(' + s + ')'; return s + v;
  }
  function polyStr(p, v) {   // "2x + 3", "-x - 5", "7"
    var out = '';
    if (!isZero(p.a)) out = coefStr(p.a, v);
    if (!isZero(p.b) || out === '') { var b = p.b; if (out === '') out = show(b); else out += (b.n < 0n ? ' - ' + show(F(-b.n, b.d)) : ' + ' + show(b)); }
    return out;
  }
  function equation(L, R, v, labels, rawText) {
    DEC = hasDec(rawText);
    var a = lin(L, v), b = lin(R, v), lines = [], origL = str(unwrap(clone(L)), 0), origR = str(unwrap(clone(R)), 0);
    lines.push({ s: origL + ' = ' + origR, c: 'blue' });
    var sl = polyStr(a, v), sr = polyStr(b, v);
    if (sl !== origL || sr !== origR) lines.push({ s: sl + ' = ' + sr, c: 'black' });
    var A = sub(a.a, b.a), C = sub(b.b, a.b);
    if (!isZero(b.a)) {   // variable on both sides: collect it on the left
      lines.push({ s: coefStr(a.a, v) + ' ' + (b.a.n < 0n ? '+ ' + coefStr(F(-b.a.n, b.a.d), v) : '- ' + coefStr(b.a, v)) + ' = ' + show(b.b) + (a.b.n < 0n ? ' + ' + show(F(-a.b.n, a.b.d)) : ' - ' + show(a.b)), c: 'black' });
      if (isZero(a.b) === false || true) lines.push({ s: coefStr(A, v) + ' = ' + show(C), c: 'black' });
    } else if (!isZero(a.b)) {
      lines.push({ s: coefStr(a.a, v) + ' = ' + show(b.b) + (a.b.n < 0n ? ' + ' + show(F(-a.b.n, a.b.d)) : ' - ' + show(a.b)), c: 'black' });
      lines.push({ s: coefStr(A, v) + ' = ' + show(C), c: 'black' });
    }
    if (isZero(A)) { lines.push({ s: isZero(C) ? labels.every : labels.none, c: 'red' }); return { lines: lines, say: lines[lines.length - 1].s }; }
    if (!eq(A, F(1n))) { var As = show(A); lines.push({ s: v + ' = ' + show(C) + ' ÷ ' + (A.n < 0n || As.indexOf('/') >= 0 ? '(' + As + ')' : As), c: 'black' }); }
    var x = div(C, A), xs = show(x);
    lines.push({ s: v + ' = ' + xs, c: 'red' });
    if (x.d !== 1n && decimalOf(x) === null) lines.push({ s: '≈ ' + approx(x, 4), c: 'red' });
    // check by putting the answer back
    var vl = add(mul(a.a, x), a.b), vr = add(mul(b.a, x), b.b);
    if (eq(vl, vr)) {
      var sub2 = unwrap(clone(L)); (function put(n) { if (!n || typeof n !== 'object') return; if (n.t === 'x') { n.t = 'n'; n.v = x; n.s = undefined; delete n.n; return; } if (n.t === 'b') n.imp = false; ['x', 'l', 'r'].forEach(function (k) { if (n[k] && n[k].t) put(n[k]); }); })(sub2);
      lines.push({ s: labels.check + ': ' + str(sub2, 0) + ' = ' + show(vl) + ' ✓', c: 'black' });
    }
    return { lines: lines, say: origL + ' = ' + origR + ' → ' + v + ' = ' + xs };
  }

  /* ---------- entry point ---------- */
  var DEFAULT = { check: 'Check', none: 'No solution', every: 'Every number is a solution', div0: 'Cannot divide by zero' };
  function solve(text, labels) {
    labels = Object.assign({}, DEFAULT, labels || {});
    try {
      var raw = normalise(text); if (!raw || raw.length > 90) return null;
      var s = raw.replace(LEAD, '').replace(/[?؟]\s*$/, '').replace(/\s*=\s*$/, '').trim();
      // "20% of 150"  ->  20% * 150
      s = s.replace(new RegExp('(%)\\s*' + OF.source + '\\s*', 'g'), '% * ');
      s = s.replace(new RegExp('(\\d)\\s+' + OF.source + '\\s+(?=[\\d(])', 'g'), '$1 * ');   // "half of" style left alone
      if (!/[0-9]/.test(s) || /[^0-9a-z+\-*\/^()=%.\s]/.test(s)) return null;
      var toks = tokenize(s), hasEq = toks.some(function (t) { return t.k === '='; });
      if (!hasEq) {
        if (toks.some(function (t) { return t.k === 'v'; })) return null;     // letters without "=": not something to solve
        var p = parse(toks); if (p.rest.length) return null;
        if (!toks.some(function (t) { return t.frac || t.k === '+' || t.k === '-' || t.k === '*' || t.k === '/' || t.k === '^' || t.k === '%'; })) return null;
        return arith(p.tree, labels, s);
      }
      var at = toks.findIndex(function (t) { return t.k === '='; });
      if (toks.filter(function (t) { return t.k === '='; }).length !== 1) return null;
      var pl = parse(toks.slice(0, at)), pr = parse(toks.slice(at + 1));
      if (pl.rest.length || pr.rest.length) return null;
      var vs = {}; pl.vars.concat(pr.vars).forEach(function (x) { vs[x] = 1; }); var names = Object.keys(vs);
      if (names.length !== 1) return null;
      return equation(pl.tree, pr.tree, names[0], labels, s);
    } catch (e) {
      if (e && e.message === 'div0') return { lines: [{ s: labels.div0, c: 'red' }], say: labels.div0 };
      return null;
    }
  }
  var API = { solve: solve, _normalise: normalise };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.LNE_MATH = API;
})(typeof window !== 'undefined' ? window : this);
