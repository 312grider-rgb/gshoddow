/* Whiteboard lessons: record the board together with the teacher's voice, and replay both in sync.
   Loaded by skillstream-whiteboard.html AFTER its own script (it uses that page's items, W, H, redraw, fit, sb).
   ?class=<id>  -> teacher recorder      ?lesson=<id> -> student replay (read-only) */
(function(){
  'use strict';
  var qs = new URLSearchParams(location.search);
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var classId = qs.get('class'), lessonId = qs.get('lesson');
  if(classId && !UUID.test(classId)) classId = null;
  if(lessonId && !UUID.test(lessonId)) lessonId = null;
  if(!classId && !lessonId) return;
  var BUCKET = 'class-audio', MAX_SEC = 3600, MAX_PTS_TOTAL = 80000, MAX_SNAPS = 4000, MAX_TABLE = 3000;
  function tr(s){ return (typeof T === 'function') ? T(s) : s; }
  function box(){
    var p = document.createElement('div'); p.className = 'panel'; p.style.marginTop = '0';
    var st = document.getElementById('stage'); st.parentNode.insertBefore(p, st.nextSibling); return p;
  }
  function mk(tag, cls, text){ var n = document.createElement(tag); if(cls) n.className = cls; if(text) n.textContent = text; return n; }
  function r1(v){ return Math.round(v * 10) / 10; }
  function ser(it, tt){
    var o = {};
    Object.keys(it).forEach(function(k){
      var v = it[k];
      if(k === 'pts') o.pts = v.map(function(p){ return [r1(p[0]), r1(p[1])]; });
      else if(typeof v === 'number') o[k] = r1(v);
      else if(typeof v === 'string' || typeof v === 'boolean') o[k] = v;
    });
    if(tt) o.tt = tt;
    return o;
  }

  /* ================= RECORDER (teacher) ================= */
  function recorder(){
    var panel = box(); panel.classList.add('hidden');
    (async function(){
      try {
        var se = await sb.auth.getSession(); var uid = se.data && se.data.session && se.data.session.user.id; if(!uid) return;
        var c = await sb.from('classrooms').select('id').eq('id', classId).eq('teacher_id', uid).maybeSingle();
        if(c.data) panel.classList.remove('hidden');
      } catch(e){}
    })();
    panel.appendChild(mk('h3', '', 'Record this lesson')).style.cssText = 'margin:0 0 6px;font-size:16px';
    var hint = mk('p', 'hint', 'Draw on the board and speak. Students will hear your voice and watch the board in sync.'); hint.style.margin = '0 0 8px'; panel.appendChild(hint);
    var row = mk('div', 'row'); var btn = mk('button', 'act main', 'Start recording'); btn.type = 'button'; row.appendChild(btn); panel.appendChild(row);
    var live = mk('div', 'msg'); live.setAttribute('role', 'status'); panel.appendChild(live);
    function msg(t, ok){ live.className = 'msg ' + (ok ? 'ok' : 'err'); live.textContent = t; }
    var S = null;

    function mime(){
      var c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      for(var i = 0; i < c.length; i++){ try { if(window.MediaRecorder && MediaRecorder.isTypeSupported(c[i])) return c[i]; } catch(e){} }
      return '';
    }
    function snap(now){
      if(S.over) return;
      if(S.snaps.length >= MAX_SNAPS){ S.over = true; return; }
      var ids = items.map(function(it){
        var id = S.ids.get(it);
        if(id === undefined){
          if(S.table.length >= MAX_TABLE){ S.over = true; return -1; }
          var pr = S.pens.get(it), tt = null;
          if(pr){ while(pr.length < it.pts.length) pr.push(now); tt = pr; }
          S.pts += it.pts ? it.pts.length : 0;
          if(S.pts > MAX_PTS_TOTAL){ S.over = true; return -1; }
          id = S.table.length; S.table.push(ser(it, tt)); S.ids.set(it, id);
        }
        return id;
      });
      if(S.over) return;
      S.snaps.push([now, ids, W, H]); S.lastItems = items; S.lastW = W; S.lastH = H;
    }
    function poll(){
      if(!S) return;
      var now = Math.round(performance.now() - S.t0);
      if(preview && preview.t === 'pen'){
        var pr = S.pens.get(preview); if(!pr){ pr = []; S.pens.set(preview, pr); }
        while(pr.length < preview.pts.length) pr.push(now);
      }
      if(items !== S.lastItems || W !== S.lastW || H !== S.lastH) snap(now);
      var sec = Math.floor(now / 1000);
      msg('● ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' / 60:00' + (S.over ? ' — ' + tr('The board part is full; only the voice is still recorded.') : ''), true);
      if(sec >= MAX_SEC) stop();
    }
    async function start(){
      if(S) return;
      if(!navigator.mediaDevices || !window.MediaRecorder){ msg(tr('This browser cannot record audio'), false); return; }
      var m = mime(), stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
      catch(e){ msg(tr('Microphone is not allowed. Allow it in the browser settings.'), false); return; }
      var mr = new MediaRecorder(stream, m ? { mimeType:m } : undefined);
      S = { mr:mr, stream:stream, chunks:[], mime:mr.mimeType || m || 'audio/webm', ids:new WeakMap(), pens:new WeakMap(), table:[], snaps:[], pts:0, over:false, lastItems:null, lastW:0, lastH:0, t0:0, timer:0 };
      mr.ondataavailable = function(e){ if(e.data && e.data.size) S.chunks.push(e.data); };
      mr.onstop = finish;
      mr.start(5000); S.t0 = performance.now();
      snap(0); S.timer = setInterval(poll, 60);
      btn.textContent = tr('Stop and save'); poll();
    }
    function stop(){
      if(!S) return; clearInterval(S.timer); poll();
      try { if(S.mr.state !== 'inactive') S.mr.stop(); } catch(e){}
      try { S.stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e){}
    }
    async function finish(){
      var s = S; S = null; btn.textContent = tr('Start recording');
      var dur = Math.max(1, Math.min(MAX_SEC, Math.round((performance.now() - s.t0) / 1000)));
      var base = (s.mime.split(';')[0] || 'audio/webm');
      var ext = base.indexOf('mp4') >= 0 ? 'm4a' : base.indexOf('ogg') >= 0 ? 'ogg' : 'webm';
      var blob = new Blob(s.chunks, { type:base });
      if(blob.size < 1000){ msg(tr('Nothing was recorded'), false); return; }
      if(blob.size > 60 * 1024 * 1024){ msg(tr('Recording is too large (max 60 MB)'), false); return; }
      var title = (prompt(tr('Name this recording:'), 'Lesson ' + new Date().toLocaleDateString()) || '').trim().slice(0, 120) || ('Lesson ' + new Date().toLocaleDateString());
      msg(tr('Saving… please wait'), true); btn.disabled = true;
      var stamp = Date.now(), apath = classId + '/' + stamp + '.' + ext, bpath = classId + '/' + stamp + '.json';
      var up = await sb.storage.from(BUCKET).upload(apath, blob, { contentType:base, upsert:false });
      if(up.error){ btn.disabled = false; msg(tr('Could not save the audio'), false); return; }
      var boardOk = false;
      try {
        var json = JSON.stringify({ v:1, d:dur * 1000, tab:s.table, s:s.snaps });
        var jb = new Blob([json], { type:'application/json' });
        if(jb.size <= 8 * 1024 * 1024){
          var u2 = await sb.storage.from(BUCKET).upload(bpath, jb, { contentType:'application/json', upsert:false });
          boardOk = !u2.error;
        }
      } catch(e){}
      var row = { classroom_id:classId, kind:'audio', title:title, audio_path:apath, duration_sec:dur };
      if(boardOk) row.board_path = bpath;
      var ins = await sb.from('class_recordings').insert(row);
      btn.disabled = false;
      if(ins.error){
        await sb.storage.from(BUCKET).remove(boardOk ? [apath, bpath] : [apath]);
        msg(ins.error.message && ins.error.message.indexOf('20 audio') >= 0 ? tr('This class already has 20 audio recordings. Delete an old one first.') : tr('Could not save'), false); return;
      }
      msg(boardOk ? tr('Lesson saved with the whiteboard. Students can watch it in the class Recordings tab.') : tr('Saved with voice only: the board could not be saved.'), boardOk);
    }
    btn.onclick = function(){ S ? stop() : start(); };
    addEventListener('beforeunload', function(e){ if(S){ e.preventDefault(); e.returnValue = ''; } });
  }

  /* ================= REPLAY (student) ================= */
  function replay(){
    ['tabDraw', 'tabAi'].forEach(function(id){ var n = document.getElementById(id); if(n) n.parentNode.classList.add('hidden'); });
    ['pDraw', 'pAi', 'player'].forEach(function(id){ var n = document.getElementById(id); if(n) n.classList.add('hidden'); });
    var cvEl = document.getElementById('cv'); cvEl.style.pointerEvents = 'none';
    var h1 = document.querySelector('header.top h1'); if(h1) h1.textContent = 'Lesson';
    var hp = document.querySelector('header.top p'); if(hp) hp.textContent = 'Press play: you hear the teacher and watch the board as it was drawn.';
    var panel = box(), info = mk('div', 'msg', tr('Loading the lesson…')); info.className = 'msg ok'; panel.appendChild(info);
    function fail(t){ info.className = 'msg err'; info.textContent = t; }
    (async function(){
      var s = await sb.auth.getSession();
      if(!(s.data && s.data.session)) return;   // the page's own check sends the visitor to login
      var q = await sb.from('class_recordings').select('id,title,audio_path,board_path,expires_at').eq('id', lessonId).maybeSingle();
      if(q.error || !q.data){ fail(tr('This lesson is not available.')); return; }
      var row = q.data;
      var u1 = await sb.storage.from(BUCKET).createSignedUrl(row.audio_path, 3600);
      var u2 = row.board_path ? await sb.storage.from(BUCKET).createSignedUrl(row.board_path, 3600) : null;
      if(u1.error || !u1.data){ fail(tr('Could not load the audio')); return; }
      var D = null;
      if(u2 && u2.data){ try { var rr = await fetch(u2.data.signedUrl); if(rr.ok) D = await rr.json(); } catch(e){} }
      var title = mk('h3', '', row.title); title.style.cssText = 'margin:0 0 8px;font-size:16px'; title.setAttribute('data-no-i18n', '');
      var au = document.createElement('audio'); au.controls = true; au.preload = 'auto'; au.src = u1.data.signedUrl; au.style.cssText = 'width:100%';
      panel.textContent = ''; panel.appendChild(title); panel.appendChild(au);
      if(!D || !Array.isArray(D.s) || !D.s.length){ panel.appendChild(mk('p', 'hint', tr('This lesson has voice only.'))); return; }

      // ---- build the timeline ----
      var table = D.tab, snaps = D.s, cache = [];
      function arr(i){ if(!cache[i]) cache[i] = snaps[i][1].map(function(id){ return table[id]; }).filter(Boolean); return cache[i]; }
      var firstSeen = {};
      snaps.forEach(function(sn){ sn[1].forEach(function(id){ if(firstSeen[id] === undefined) firstSeen[id] = sn[0]; }); });
      var pens = [];
      table.forEach(function(it, id){ if(it && it.tt && it.tt.length && it.pts && firstSeen[id] !== undefined) pens.push({ it:it, t0:it.tt[0], te:firstSeen[id] }); });
      pens.sort(function(a, b){ return a.t0 - b.t0; });
      function snapAt(t){ var lo = 0, hi = snaps.length - 1; while(lo < hi){ var mid = (lo + hi + 1) >> 1; if(snaps[mid][0] <= t) lo = mid; else hi = mid - 1; } return lo; }
      var lastKey = '';
      function render(t){
        var i = snapAt(t), sn = snaps[i], pv = null, k = 0;
        for(var j = pens.length - 1; j >= 0; j--){
          var p = pens[j];
          if(p.t0 <= t && t < p.te){
            var n = 0; while(n < p.it.tt.length && p.it.tt[n] <= t) n++;
            if(n > 0){ pv = { t:'pen', c:p.it.c, lw:p.it.lw, pts:p.it.pts.slice(0, n) }; k = n; }
            break;
          }
        }
        var key = i + '|' + k; if(key === lastKey) return; lastKey = key;
        var resize = (sn[2] && sn[3] && (sn[2] !== W || sn[3] !== H));
        items = arr(i); preview = pv;
        if(resize){ W = sn[2]; H = sn[3]; fit(); } else redraw();
      }
      W = snaps[0][2] || W; H = snaps[0][3] || H; fit(); render(0);
      var raf = 0;
      function loop(){ render(au.currentTime * 1000); raf = au.paused || au.ended ? 0 : requestAnimationFrame(loop); }
      au.addEventListener('play', function(){ if(!raf) raf = requestAnimationFrame(loop); });
      ['seeked', 'timeupdate', 'pause', 'ended'].forEach(function(ev){ au.addEventListener(ev, function(){ render(au.currentTime * 1000); }); });
      addEventListener('resize', function(){ lastKey = ''; render(au.currentTime * 1000); });
    })().catch(function(){ fail(tr('Could not load the lesson')); });
  }

  if(lessonId) replay(); else recorder();
})();
