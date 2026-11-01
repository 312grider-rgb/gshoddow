/* Learning Never Ends — basic voice (free, uses the phone's own voice; no AI cost).
   1) "Listen" button on AI answers: reads the answer aloud.
   2) Microphone button next to question boxes: speak instead of typing.
   Hidden automatically on phones/browsers that do not support it. Nothing is sent to our servers.
   Note: on many phones the microphone feature is handled by the phone's own speech service (for example Google on Android). */
(function () {
  var T = function (s) { return (window.LNE_I18N && LNE_I18N.t) ? LNE_I18N.t(s) : s; };
  var LANGS = { en: 'en-US', ar: 'ar-SA', fr: 'fr-FR', es: 'es-ES', zh: 'zh-CN' };
  function lang() { return LANGS[(window.LNE_I18N && LNE_I18N.lang) || 'en'] || 'en-US'; }
  var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var current = null;           // button currently speaking
  var STYLE = 'min-height:44px;min-width:44px;border:1.5px solid #141F38;background:#fff;color:#141F38;border-radius:10px;padding:0 12px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;';

  function haveVoice(l) {
    try {
      var vs = window.speechSynthesis.getVoices();
      if (!vs || !vs.length) return true;     // list not loaded yet: try anyway
      var p = l.slice(0, 2).toLowerCase();
      return vs.some(function (v) { return String(v.lang || '').toLowerCase().indexOf(p) === 0; });
    } catch (e) { return true; }
  }
  function cleanText(node) {
    var c = node.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('[data-lne-voice]'), function (x) { x.remove(); });
    return (c.textContent || '').replace(/[*_#`>]+/g, ' ').replace(/\s*\n+\s*/g, '. ').replace(/\s+/g, ' ').trim().slice(0, 3000);
  }
  function chunks(text) {
    var out = [], parts = text.split(/(?<=[.!?؟。！？])\s+/), cur = '';
    parts.forEach(function (p) {
      if ((cur + ' ' + p).length > 180 && cur) { out.push(cur); cur = p; } else { cur = cur ? cur + ' ' + p : p; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function setIdle(btn) { if (btn) { btn.textContent = '🔊 ' + T('Listen'); btn.setAttribute('aria-pressed', 'false'); } }
  function stopAll() { try { window.speechSynthesis.cancel(); } catch (e) {} if (current) { setIdle(current); current = null; } }

  function speak(btn, getNode, note) {
    if (current === btn) { stopAll(); return; }
    stopAll();
    var text = cleanText(getNode());
    if (!text) return;
    var l = lang();
    if (!haveVoice(l)) { note(T('No voice for your language is installed on this phone.')); return; }
    note('');
    var list = chunks(text), i = 0;
    current = btn; btn.textContent = '⏹ ' + T('Stop'); btn.setAttribute('aria-pressed', 'true');
    function next() {
      if (current !== btn || i >= list.length) { if (current === btn) { setIdle(btn); current = null; } return; }
      var u = new SpeechSynthesisUtterance(list[i++]);
      u.lang = l; u.rate = 0.95;
      u.onend = next; u.onerror = function () { if (current === btn) { setIdle(btn); current = null; } };
      window.speechSynthesis.speak(u);
    }
    next();
  }

  function makeListen(getNode) {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-lne-voice', '1'); wrap.style.cssText = 'margin-top:10px;display:none;';
    var b = document.createElement('button'); b.type = 'button'; b.style.cssText = STYLE; setIdle(b);
    var n = document.createElement('div'); n.style.cssText = 'font-size:13px;color:#A33A2B;margin-top:6px;'; n.setAttribute('role', 'status');
    b.onclick = function () { speak(b, getNode, function (t) { n.textContent = t; }); };
    wrap.appendChild(b); wrap.appendChild(n);
    return wrap;
  }

  // Listen buttons on answer boxes
  function attachOutputs() {
    if (!canSpeak) return;
    Array.prototype.forEach.call(document.querySelectorAll('.ai-output'), function (o) {
      if (/^classroom/.test(o.id)) return;                      // the AI Classroom already has its own voice
      var w = o.previousElementSibling && o.previousElementSibling.getAttribute && o.previousElementSibling.getAttribute('data-lne-voice') ? o.previousElementSibling : null;
      if (!w) { w = makeListen(function () { return o; }); o.parentNode.insertBefore(w, o); }
      var has = (o.textContent || '').trim().length > 0 && !o.classList.contains('loading-text') && o.style.display !== 'none';
      var want = has ? 'block' : 'none';
      if (w.style.display !== want) { w.style.display = want; if (!has) stopAll(); }
    });
    // chat bubbles of the AI Teacher
    Array.prototype.forEach.call(document.querySelectorAll('#teacherChatLog .chat-bubble.ai'), function (bub) {
      if (bub.querySelector('[data-lne-voice]')) return;
      var w = makeListen(function () { return bub; }); w.style.display = 'block'; bub.appendChild(w);
    });
  }

  // Microphone buttons on question boxes
  var MIC_FIELDS = ['teacherInput', 'askQuestion', 'hwQuestion', 'careerGoal', 'quizTopic', 'planGoal'];
  var rec = null, recBtn = null;
  function stopRec() { try { if (rec) rec.stop(); } catch (e) {} }
  function attachMics() {
    if (!SR) return;
    MIC_FIELDS.forEach(function (id) {
      var f = document.getElementById(id);
      if (!f || f.getAttribute('data-lne-mic')) return;
      f.setAttribute('data-lne-mic', '1');
      var wrap = document.createElement('span'); wrap.setAttribute('data-lne-voice', '1'); wrap.style.cssText = 'display:inline-flex;flex-direction:column;align-items:flex-start;margin-top:6px;margin-inline-end:8px;';
      var b = document.createElement('button'); b.type = 'button'; b.style.cssText = STYLE + 'margin-top:0;';
      b.textContent = '🎤'; b.setAttribute('aria-label', T('Speak your question'));
      b.title = T('Speak your question');
      var n = document.createElement('span'); n.style.cssText = 'font-size:12px;color:#6B6558;margin-top:4px;'; n.setAttribute('role', 'status');
      b.onclick = function () {
        if (rec && recBtn === b) { stopRec(); return; }
        stopRec(); stopAll();
        var r = new SR(); r.lang = lang(); r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
        rec = r; recBtn = b; b.textContent = '⏹'; n.textContent = T('Listening…');
        r.onresult = function (e) {
          var t = ''; for (var k = 0; k < e.results.length; k++) t += e.results[k][0].transcript;
          t = t.trim(); if (!t) return;
          f.value = (f.value ? f.value.replace(/\s+$/, '') + ' ' : '') + t;
          f.dispatchEvent(new Event('input', { bubbles: true })); f.focus();
        };
        r.onerror = function (e) { n.textContent = (e && e.error === 'not-allowed') ? T('Microphone is blocked. Allow it in your browser settings.') : T('Could not hear you. Please try again.'); };
        r.onend = function () { b.textContent = '🎤'; if (n.textContent === T('Listening…')) n.textContent = ''; if (rec === r) { rec = null; recBtn = null; } };
        try { r.start(); } catch (err) { b.textContent = '🎤'; n.textContent = ''; rec = null; recBtn = null; }
      };
      wrap.appendChild(b); wrap.appendChild(n);
      f.insertAdjacentElement('afterend', wrap);
    });
  }

  var pending = false;
  function run() { pending = false; attachOutputs(); attachMics(); }
  function schedule() { if (!pending) { pending = true; (window.requestAnimationFrame || setTimeout)(run); } }
  if (!canSpeak && !SR) return;
  document.addEventListener('DOMContentLoaded', function () {
    run();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'] });
  });
  window.addEventListener('pagehide', stopAll);
})();
