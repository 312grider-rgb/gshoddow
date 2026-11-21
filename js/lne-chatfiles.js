/* LNE_CHAT: voice messages, photos and files for the class chat and private messages.
   Files go to the private storage bucket "chat-files". The path decides who may read:
     class chat:    c/<class id>/<my id>/<name>
     private chat:  d/<my id>/<other id>/<name>
   Nothing here talks to the database tables: the pages do that after the upload works.
   Texts are plain English strings: js/i18n.js translates them like everywhere else. */
(function () {
  'use strict';
  var BUCKET = 'chat-files', MAX_FILE = 5 * 1024 * 1024, MAX_VOICE_SEC = 60;
  var T = function (s) { try { return (window.LNE_I18N && LNE_I18N.t) ? LNE_I18N.t(s) : s; } catch (e) { return s; } };
  function say(m) { try { if (typeof window.showToast === 'function') window.showToast(m, true); else alert(m); } catch (e) { alert(m); } }
  function rid() { return Date.now() + '-' + Math.random().toString(36).slice(2, 8); }
  function css() {
    if (document.getElementById('lneChatCss')) return;
    var s = document.createElement('style'); s.id = 'lneChatCss';
    s.textContent = '.lca-bar{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.lca-bar button{min-height:42px;padding:0 14px;border-radius:12px;border:1px solid #d9c9a8;background:#fff8ea;color:#5A3214;font-size:15px;font-weight:700;cursor:pointer}' +
      '.lca-bar button.rec{background:#c0392b;color:#fff;border-color:#c0392b}.lca-bar button:disabled{opacity:.5}' +
      '.lca-img{max-width:100%;max-height:260px;border-radius:10px;display:block;margin-top:6px;cursor:zoom-in;background:#eee;min-height:60px}' +
      '.lca-aud{width:100%;max-width:260px;margin-top:6px;display:block}.lca-file{display:inline-block;margin-top:6px;padding:8px 12px;border-radius:10px;border:1px solid currentColor;color:inherit;text-decoration:none;font-weight:600;font-size:13px;word-break:break-word}';
    document.head.appendChild(s);
  }
  function ext(name, type) {
    var m = /\.([A-Za-z0-9]{1,5})$/.exec(name || ''); if (m) return m[1].toLowerCase();
    if (/jpeg/.test(type)) return 'jpg'; if (/png/.test(type)) return 'png'; if (/webp/.test(type)) return 'webp';
    if (/mp4|aac/.test(type)) return 'm4a'; if (/ogg/.test(type)) return 'ogg'; if (/mpeg/.test(type)) return 'mp3'; if (/webm/.test(type)) return 'webm';
    return 'bin';
  }
  function pickFile(accept, capture) {
    return new Promise(function (resolve) {
      var i = document.createElement('input'); i.type = 'file'; i.accept = accept; if (capture) i.setAttribute('capture', capture);
      i.style.display = 'none'; document.body.appendChild(i);
      i.onchange = function () { var f = i.files && i.files[0]; document.body.removeChild(i); resolve(f || null); };
      i.addEventListener('cancel', function () { try { document.body.removeChild(i); } catch (e) {} resolve(null); });
      i.click();
    });
  }
  // photo: shrink to at most 1280 px, JPEG, so it is small on mobile data
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, 1280 / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('shrink')); }, 'image/jpeg', 0.72);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }
  async function upload(sb, path, blob, type) {
    var r = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false });
    if (r.error) throw new Error(r.error.message);
    return path;
  }
  async function remove(sb, path) { try { await sb.storage.from(BUCKET).remove([path]); } catch (e) {} }

  /* ctx = { sb, folder:'c/<class>/<me>' or 'd/<me>/<other>', send(att) -> Promise  (att = {path, kind, name, label}) } */
  async function sendImage(ctx) {
    var f = await pickFile('image/*'); if (!f) return;
    var blob; try { blob = await shrink(f); } catch (e) { say(T('Could not read this photo.')); return; }
    var path = ctx.folder + '/' + rid() + '.jpg';
    try { await upload(ctx.sb, path, blob, 'image/jpeg'); } catch (e) { say(e.message); return; }
    try { await ctx.send({ path: path, kind: 'image', name: (f.name || 'photo.jpg').slice(0, 120), label: '📷 ' + T('Photo') }); } catch (e) { await remove(ctx.sb, path); say(e.message || T('Could not send.')); }
  }
  async function sendDoc(ctx) {
    var f = await pickFile('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,text/plain'); if (!f) return;
    if (f.size > MAX_FILE) { say(T('This file is too big. The limit is 5 MB.')); return; }
    var type = f.type || 'application/octet-stream', path = ctx.folder + '/' + rid() + '.' + ext(f.name, type);
    try { await upload(ctx.sb, path, f, type); } catch (e) { say(e.message); return; }
    try { await ctx.send({ path: path, kind: 'file', name: (f.name || 'file').slice(0, 120), label: '📎 ' + (f.name || T('File')).slice(0, 80) }); } catch (e) { await remove(ctx.sb, path); say(e.message || T('Could not send.')); }
  }
  var rec = null, recTimer = null;
  async function toggleVoice(ctx, btn) {
    if (rec) { clearTimeout(recTimer); try { rec.stop(); } catch (e) {} return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { say(T('Voice messages are not supported on this browser.')); return; }
    var stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { say(T('Please allow the microphone to send a voice message.')); return; }
    var chunks = [], r = new MediaRecorder(stream); rec = r;
    r.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = async function () {
      stream.getTracks().forEach(function (t) { t.stop(); }); rec = null; btn.classList.remove('rec'); btn.textContent = '🎤';
      var type = (r.mimeType || 'audio/webm').split(';')[0], blob = new Blob(chunks, { type: type });
      if (blob.size < 1500) return;
      if (blob.size > 2000000) { say(T('That voice message is too long. Keep it under one minute.')); return; }
      var path = ctx.folder + '/' + rid() + '.' + ext('', type); btn.disabled = true;
      try { await upload(ctx.sb, path, blob, type); } catch (e) { btn.disabled = false; say(e.message); return; }
      try { await ctx.send({ path: path, kind: 'voice', name: 'voice', label: '🎤 ' + T('Voice message') }); } catch (e) { await remove(ctx.sb, path); say(e.message || T('Could not send.')); }
      btn.disabled = false;
    };
    r.start(); btn.classList.add('rec'); btn.textContent = '⏹';
    recTimer = setTimeout(function () { try { r.stop(); } catch (e) {} }, MAX_VOICE_SEC * 1000);
  }
  /* A row of three buttons under the message box. getCtx() returns the ctx above (or null if no chat is open). */
  function bar(host, getCtx, opts) {
    opts = opts || {};
    css();
    var d = document.createElement('div'); d.className = 'lca-bar';
    function mk(txt, label, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', T(label)); b.onclick = function () { var c = getCtx(); if (c) fn(c, b); }; d.appendChild(b); return b; }
    if (!opts.noVoice) mk('🎤', 'Voice message', toggleVoice);
    mk('📷', 'Photo', sendImage); mk('📎', 'File', sendDoc);
    host.appendChild(d); return d;
  }
  /* After the messages are on the page: fill every  <div data-att-path data-att-kind data-att-name>  with the photo, player or file link. */
  async function hydrate(sb, root) {
    css();
    var els = (root || document).querySelectorAll('[data-att-path]:not([data-done])');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        el.setAttribute('data-done', '1');
        sb.storage.from(BUCKET).createSignedUrl(el.getAttribute('data-att-path'), 3600).then(function (r) {
          if (!r || r.error || !r.data) { el.textContent = T('This file is no longer available.'); return; }
          var u = r.data.signedUrl, k = el.getAttribute('data-att-kind'), n = el.getAttribute('data-att-name') || 'file';
          el.textContent = '';
          if (k === 'image') { var im = document.createElement('img'); im.className = 'lca-img'; im.loading = 'lazy'; im.alt = ''; im.src = u; im.onclick = function () { window.open(u, '_blank', 'noopener'); }; el.appendChild(im); }
          else if (k === 'voice') { var a = document.createElement('audio'); a.className = 'lca-aud'; a.controls = true; a.preload = 'none'; a.src = u; el.appendChild(a); }
          else { var l = document.createElement('a'); l.className = 'lca-file'; l.href = u; l.target = '_blank'; l.rel = 'noopener noreferrer'; l.textContent = '📎 ' + n; l.setAttribute('data-no-i18n', ''); el.appendChild(l); }
        }).catch(function () { el.textContent = ''; });
      })(els[i]);
    }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slot(path, kind, name) { return path ? '<div data-att-path="' + esc(path) + '" data-att-kind="' + esc(kind) + '" data-att-name="' + esc(name) + '"></div>' : ''; }
  window.LNE_CHAT = { bar: bar, hydrate: hydrate, slot: slot };
})();
