/* Learning Never Ends — shared board drawing + lesson player.
   Used by the lesson recorder (skillstream-record.html) and the lesson page (skillstream-lessons.html).
   Everything is drawn on a canvas (no HTML from lesson data is ever inserted into the page).
   A lesson = scenes. A scene = { title, ms, audio, clear, say, items:[{ t, ..., at, d }] }
     at = when the item starts (ms from the start of its scene), d = how long it took to draw (ms). */
(function () {
  var COLORS = { black: '#1B1B1B', blue: '#1F5FBF', red: '#C0392B', green: '#2E7D32', orange: '#E67E22', purple: '#7B3FA0' };
  var FONT = "'Inter','Segoe UI',Tahoma,'Noto Sans Arabic','Noto Sans SC',Arial,sans-serif";
  var CJK = /[　-鿿豈-﫿]/;
  var TYPES = { pen: 1, line: 1, arrow: 1, rect: 1, box: 1, circle: 1, text: 1 };
  var mctx = document.createElement('canvas').getContext('2d');

  function num(v, lo, hi, d) { v = Number(v); if (!isFinite(v)) return d; return Math.max(lo, Math.min(hi, v)); }
  function setFont(c, size, weight) { c.font = (weight || 600) + ' ' + size + 'px ' + FONT; }
  function wrapLines(c, s, maxW) {
    var out = [];
    String(s).split('\n').forEach(function (par) {
      var cjk = CJK.test(par), units = cjk ? Array.from(par) : par.split(/\s+/), glue = cjk ? '' : ' ', line = '';
      units.forEach(function (u) {
        var t = line ? line + glue + u : u;
        if (c.measureText(t).width <= maxW || !line) {
          if (c.measureText(t).width > maxW && !cjk) {
            var cur = line ? line + glue : '';
            Array.from(u).forEach(function (ch) { if (c.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; });
            line = cur;
          } else line = t;
        } else { out.push(line); line = u; }
      });
      out.push(line);
    });
    return out;
  }
  var LT = new WeakMap();   // remembers how a text item was wrapped (measuring text is the slowest part of drawing)
  function layoutText(c, it, W) {
    var size = it.size || 28; setFont(c, size);
    var maxW = Math.max(40, it.w || (W - (it.x || 0) - 20));
    var key = size + '|' + maxW + '|' + it.s, h = LT.get(it);
    if (h && h.key === key) return h.L;
    var lines = wrapLines(c, it.s, maxW), lh = size * 1.25;
    var L = { lines: lines, lh: lh, size: size };
    LT.set(it, { key: key, L: L }); return L;
  }

  /* draw one item; k = progress 0..1 */
  function drawItem(c, it, k, W) {
    c.save();
    var col = COLORS[it.c] || COLORS.black;
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = it.lw || 4; c.lineCap = 'round'; c.lineJoin = 'round';
    if (k < 1 && it.t !== 'line' && it.t !== 'arrow' && it.t !== 'pen') c.globalAlpha = Math.max(0.05, k);
    if (it.t === 'pen') {
      var p = it.pts || [];
      if (k < 1) p = p.slice(0, Math.max(1, Math.ceil(p.length * k)));
      if (p.length === 1) { c.beginPath(); c.arc(p[0][0], p[0][1], (it.lw || 4) / 2, 0, 7); c.fill(); }
      else if (p.length > 1) {
        c.beginPath(); c.moveTo(p[0][0], p[0][1]);
        for (var i = 1; i < p.length - 1; i++) { var mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; c.quadraticCurveTo(p[i][0], p[i][1], mx, my); }
        c.lineTo(p[p.length - 1][0], p[p.length - 1][1]); c.stroke();
      }
    } else if (it.t === 'line' || it.t === 'arrow') {
      var ex = it.x1 + (it.x2 - it.x1) * k, ey = it.y1 + (it.y2 - it.y1) * k;
      c.beginPath(); c.moveTo(it.x1, it.y1); c.lineTo(ex, ey); c.stroke();
      if (it.t === 'arrow' && k > 0.85) {
        var a = Math.atan2(it.y2 - it.y1, it.x2 - it.x1), h = 12 + (it.lw || 4) * 2;
        c.beginPath(); c.moveTo(it.x2, it.y2); c.lineTo(it.x2 - h * Math.cos(a - 0.45), it.y2 - h * Math.sin(a - 0.45));
        c.moveTo(it.x2, it.y2); c.lineTo(it.x2 - h * Math.cos(a + 0.45), it.y2 - h * Math.sin(a + 0.45)); c.stroke();
      }
    } else if (it.t === 'rect' || it.t === 'box') {
      if (it.f) { c.save(); c.globalAlpha *= 0.15; c.fillRect(it.x, it.y, it.w, it.h); c.restore(); }
      c.strokeRect(it.x, it.y, it.w, it.h);
      if (it.t === 'box' && it.s) {
        var size = it.size || 26, L;
        for (; size >= 11; size -= 2) { setFont(c, size); L = wrapLines(c, it.s, it.w - 14); if (L.length * size * 1.25 <= it.h - 8 && L.every(function (l) { return c.measureText(l).width <= it.w - 10; })) break; }
        setFont(c, size); c.textAlign = 'center'; c.textBaseline = 'middle';
        var lh = size * 1.25, y0 = it.y + it.h / 2 - (L.length - 1) * lh / 2;
        L.forEach(function (l, i2) { c.fillText(l, it.x + it.w / 2, y0 + i2 * lh); });
      }
    } else if (it.t === 'circle') {
      c.beginPath(); c.arc(it.x, it.y, it.r, 0, Math.PI * 2);
      if (it.f) { c.save(); c.globalAlpha *= 0.15; c.fill(); c.restore(); }
      c.stroke();
    } else if (it.t === 'text') {
      var T = layoutText(c, it, W); setFont(c, T.size); c.textBaseline = 'top'; c.textAlign = it.a === 'c' ? 'center' : 'left';
      T.lines.forEach(function (l, i3) { c.fillText(l, it.x, it.y + i3 * T.lh); });
    }
    c.restore();
  }

  function bbox(it, W) {
    if (it.t === 'text') { var L = layoutText(mctx, it, W); var wid = Math.max.apply(null, L.lines.map(function (l) { return mctx.measureText(l).width; }).concat([10])); var x0 = it.a === 'c' ? it.x - wid / 2 : it.x; return [x0, it.y, x0 + wid, it.y + L.lines.length * L.lh]; }
    if (it.t === 'rect' || it.t === 'box') return [it.x, it.y, it.x + it.w, it.y + it.h];
    if (it.t === 'circle') return [it.x - it.r, it.y - it.r, it.x + it.r, it.y + it.r];
    if (it.t === 'line' || it.t === 'arrow') return [Math.min(it.x1, it.x2), Math.min(it.y1, it.y2), Math.max(it.x1, it.x2), Math.max(it.y1, it.y2)];
    if (it.t === 'pen') { var a = 1e9, b = 1e9, c = -1e9, d = -1e9; (it.pts || []).forEach(function (p) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }); return [a, b, c, d]; }
    return [0, 0, 0, 0];
  }

  /* make one item safe: only known shapes, numbers kept inside the board, short text */
  function cleanItem(r, W, H) {
    if (!r || typeof r !== 'object' || !TYPES[r.t]) return null;
    var t = r.t, o = { t: t, c: COLORS[r.c] ? r.c : 'black', lw: num(r.lw, 1, 16, 4), at: Math.round(num(r.at, 0, 1200000, 0)), d: Math.round(num(r.d, 0, 60000, 0)) };
    if (t === 'pen') {
      if (!Array.isArray(r.pts)) return null;
      o.pts = r.pts.slice(0, 2000).map(function (p) { return Array.isArray(p) ? [num(p[0], 0, W, 0), num(p[1], 0, H, 0)] : null; }).filter(Boolean);
      if (!o.pts.length) return null;
    } else if (t === 'text') {
      if (typeof r.s !== 'string' || !r.s.trim()) return null;
      o.x = num(r.x, 0, W, 30); o.y = num(r.y, 0, H, 30); o.s = r.s.trim().slice(0, 140); o.size = num(r.size, 12, 60, 26); o.a = r.a === 'c' ? 'c' : 'l'; o.w = num(r.w, 40, W, W - o.x - 20);
    } else if (t === 'line' || t === 'arrow') {
      o.x1 = num(r.x1, 0, W, 0); o.y1 = num(r.y1, 0, H, 0); o.x2 = num(r.x2, 0, W, 0); o.y2 = num(r.y2, 0, H, 0);
    } else if (t === 'rect' || t === 'box') {
      o.x = num(r.x, 0, W, 0); o.y = num(r.y, 0, H, 0); o.w = num(r.w, 4, W, 100); o.h = num(r.h, 4, H, 60); o.f = !!r.f;
      if (t === 'box') { o.s = typeof r.s === 'string' ? r.s.trim().slice(0, 80) : ''; o.size = num(r.size, 11, 40, 26); }
    } else if (t === 'circle') {
      o.x = num(r.x, 0, W, W / 2); o.y = num(r.y, 0, H, H / 2); o.r = num(r.r, 2, Math.max(W, H), 40); o.f = !!r.f;
    }
    return o;
  }
  function cleanScenes(list, W, H) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 12).map(function (s) {
      s = s && typeof s === 'object' ? s : {};
      return {
        title: typeof s.title === 'string' ? s.title.slice(0, 60) : '',
        say: typeof s.say === 'string' ? s.say.slice(0, 300) : '',
        ms: Math.round(num(s.ms, 0, 1200000, 0)),
        audio: typeof s.audio === 'string' ? s.audio : null,
        clear: !!s.clear,
        items: (Array.isArray(s.items) ? s.items : []).slice(0, 800).map(function (i) { return cleanItem(i, W, H); }).filter(Boolean)
      };
    });
  }

  /* ================= player =================
     LNEBoard.player({ canvas, w, h, scenes, loadAudio(i) -> Promise<url|null>, onTime(ms, sceneIndex), onState(playing), onEnd() })  */
  function player(o) {
    var cv = o.canvas, ctx = cv.getContext('2d'), W = o.w, H = o.h, scenes = o.scenes || [];
    var starts = [], total = 0;
    scenes.forEach(function (s) { starts.push(total); total += s.ms; });
    var scale = 1, dpr = 1, idx = 0, sceneT = 0, playing = false, rate = 1, last = 0, raf = 0, destroyed = false;
    var audio = null, audioIdx = -1, audioUrls = {}, loadSeq = 0, key = '';
    try { audio = new Audio(); audio.preload = 'auto'; } catch (e) { audio = null; }

    function itemsAt(i, t) {
      var out = [];
      for (var j = 0; j <= i && j < scenes.length; j++) {
        if (scenes[j].clear) out = [];
        var its = scenes[j].items;
        for (var q = 0; q < its.length; q++) { if (j < i) out.push({ it: its[q], cur: false }); else if (its[q].at <= t) out.push({ it: its[q], cur: true }); }
      }
      return out;
    }
    function draw(force) {
      var list = itemsAt(idx, sceneT), live = false;
      var k = list.length + ':' + idx;
      list.forEach(function (e) { if (e.cur && e.it.d && sceneT - e.it.at < e.it.d) live = true; });
      if (!force && !live && k === key) return;
      key = k;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      list.forEach(function (e) {
        var p = 1;
        if (e.cur && e.it.d) p = Math.max(0.02, Math.min(1, (sceneT - e.it.at) / e.it.d));
        drawItem(ctx, e.it, p, W);
      });
    }
    function size(maxW, maxH) {
      scale = Math.min(maxW / W, maxH / H); dpr = Math.min(2, window.devicePixelRatio || 1);
      var cw = Math.floor(W * scale), ch = Math.floor(H * scale);
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.width = Math.floor(cw * dpr); cv.height = Math.floor(ch * dpr);
      draw(true);
    }
    function emit() { if (o.onTime) o.onTime(starts[idx] + sceneT, idx); }

    function loadSceneAudio(i, thenPlay) {
      if (!audio) return;
      var seq = ++loadSeq;
      audio.pause();
      var s = scenes[i];
      if (!s || !s.audio || !o.loadAudio) { audioIdx = -1; try { audio.removeAttribute('src'); } catch (e) {} return; }
      var apply = function (url) {
        if (destroyed || seq !== loadSeq || !url) return;
        audioUrls[i] = url;
        if (audioIdx !== i) { audio.src = url; audioIdx = i; audio.onloadedmetadata = function () { if (seq !== loadSeq) return; try { audio.currentTime = sceneT / 1000; } catch (e) {} audio.playbackRate = rate; if (playing) audio.play().catch(function () {}); }; }
        else { try { audio.currentTime = sceneT / 1000; } catch (e) {} audio.playbackRate = rate; if (playing) audio.play().catch(function () {}); }
      };
      if (audioUrls[i]) apply(audioUrls[i]);
      else o.loadAudio(i).then(apply, function () { if (o.onAudioError) o.onAudioError(i); });
    }
    function goScene(i, t, keepPlaying) {
      idx = Math.max(0, Math.min(scenes.length - 1, i)); sceneT = Math.max(0, Math.min(scenes[idx] ? scenes[idx].ms : 0, t || 0));
      audioIdx = -1;
      loadSceneAudio(idx);
      if (o.onScene) o.onScene(idx);
      draw(true); emit();
    }
    function loop(now) {
      if (!playing || destroyed) return;
      var dt = Math.min(250, now - last); last = now;
      sceneT += dt * rate;
      if (audio && audioIdx === idx && !audio.paused && !audio.ended && isFinite(audio.currentTime)) {
        var at = audio.currentTime * 1000;
        if (Math.abs(at - sceneT) > 350) sceneT = at;   // follow the voice
      }
      var s = scenes[idx];
      if (sceneT >= s.ms) {
        if (idx < scenes.length - 1) { goScene(idx + 1, 0); if (playing && audio) audio.play().catch(function () {}); }
        else { sceneT = s.ms; pause(); draw(true); emit(); if (o.onEnd) o.onEnd(); return; }
      }
      draw(false); emit();
      raf = requestAnimationFrame(loop);
    }
    function play() {
      if (!scenes.length || playing) return;
      if (idx === scenes.length - 1 && sceneT >= scenes[idx].ms - 50) goScene(0, 0);
      playing = true; last = performance.now();
      if (audio && audioIdx === idx) { audio.playbackRate = rate; audio.play().catch(function () {}); }
      if (o.onState) o.onState(true);
      raf = requestAnimationFrame(loop);
    }
    function pause() {
      playing = false; cancelAnimationFrame(raf);
      if (audio) audio.pause();
      if (o.onState) o.onState(false);
    }
    function seek(ms) {
      ms = Math.max(0, Math.min(total, ms));
      var i = 0; while (i < scenes.length - 1 && ms >= starts[i + 1]) i++;
      goScene(i, ms - starts[i]);
      if (playing) { last = performance.now(); }
    }
    function setRate(r) { rate = r; if (audio) audio.playbackRate = r; }
    function destroy() { destroyed = true; pause(); try { if (audio) { audio.removeAttribute('src'); audio.load(); } } catch (e) {} }
    scenes.forEach(function (s, i) { /* keep the array reference for outside code */ });

    if (scenes.length) goScene(0, 0); else draw(true);
    return {
      play: play, pause: pause, seek: seek, size: size, setRate: setRate, destroy: destroy,
      toggle: function () { if (playing) pause(); else play(); },
      goScene: function (i) { var was = playing; goScene(i, 0); if (was && audio) audio.play().catch(function () {}); },
      isPlaying: function () { return playing; },
      position: function () { return starts[idx] + sceneT; },
      scene: function () { return idx; },
      starts: function () { return starts.slice(); },
      total: function () { return total; },
      redraw: function () { draw(true); }
    };
  }

  window.LNEBoard = { COLORS: COLORS, drawItem: drawItem, bbox: bbox, cleanItem: cleanItem, cleanScenes: cleanScenes, wrapLines: wrapLines, layoutText: layoutText, player: player, num: num };
})();
