/* Learning Never Ends — private AI history helper.
   Saves each AI question and answer to the person's own private history (best effort: if saving fails, nothing breaks).
   Usage:  LNE_HIST.log(sb, 'teacher', questionText, answerText)             // part of an ongoing chat
           LNE_HIST.log(sb, 'ask', questionText, answerText, { oneShot:true }) // a stand-alone answer
           LNE_HIST.setConversation('teacher', id) / LNE_HIST.reset('teacher')  // continue an old chat / start a new one
   Tools: teacher, ask, homework, summary, quiz, translate, plan, career, tutor, live. */
(function () {
  var conv = {};
  var api = window.LNE_HIST = {
    get: function (tool) { return conv[tool] || null; },
    setConversation: function (tool, id) { conv[tool] = id || null; },
    reset: function (tool) { delete conv[tool]; },
    // Load a saved conversation (own only): returns { tool, title, messages:[{role,text}] } or null
    load: async function (sb, id) {
      try {
        var c = await sb.from('ai_conversations').select('id,tool,title').eq('id', id).maybeSingle();
        if (!c || !c.data) return null;
        var m = await sb.from('ai_messages').select('role,content,created_at').eq('conversation_id', id).order('created_at', { ascending: true });
        return { id: c.data.id, tool: c.data.tool, title: c.data.title,
                 messages: ((m && m.data) || []).map(function (x) { return { role: x.role, text: x.content }; }) };
      } catch (e) { return null; }
    },
    log: async function (sb, tool, userText, aiText, opts) {
      try {
        if (!sb || !userText || !aiText) return null;
        var oneShot = !!(opts && opts.oneShot);
        var r = await sb.rpc('ai_log_exchange', {
          p_conv: oneShot ? null : (conv[tool] || null),
          p_tool: tool,
          p_user: String(userText).slice(0, 8000),
          p_ai: String(aiText).slice(0, 8000)
        });
        if (r && r.error) {
          if (/full|not found/i.test(r.error.message || '')) delete conv[tool];
          return null;
        }
        if (!oneShot && r && r.data) conv[tool] = r.data;
        return r && r.data || null;
      } catch (e) { return null; }
    }
  };
})();
