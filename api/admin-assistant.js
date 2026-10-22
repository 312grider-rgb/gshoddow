// api/admin-assistant.js
// Admin-only AI Assistant (read-only adviser). Stage 1.
//
// - Requires a logged-in user whose profile role is 'admin' (checked here, server-side).
// - Reads a counts-only summary of the app from the database (admin_overview, migration 034).
// - Asks the AI to analyse it and answer the admin's question.
// - It can only READ and SUGGEST. It never changes data or code.
//
// Uses the same environment variables as api/ask-ai.js.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vauudtedojtcveiqajlr.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const ENFORCE = String(process.env.AI_ENFORCE_LIMITS || '').toLowerCase() === 'true';
const ADMIN_DAILY_CAP = 100;
const MODEL = 'openai/gpt-oss-120b';
const MAX_QUESTION_CHARS = 1500;

const SYSTEM_PROMPT = [
  'You are the built-in adviser for the admins of "Learning Never Ends" (Paradise Of The Eternal Learners), a learning app.',
  'You act as observer/supervisor, adviser/architect, engineer/designer and administrator, but you are READ-ONLY:',
  'you cannot change data or code. When a change is useful, describe it or draft SQL/code for a human admin to review and run.',
  'Rules: base every statement on the DATA below. If the data does not show something, say so instead of guessing.',
  'Never invent numbers. Mark clearly what is a fact from the data and what is your recommendation.',
  'Be short and practical: lead with the answer, then at most 5 bullet points, ordered by priority.',
  'Warn before anything risky or irreversible. Answer in the same language as the question (French or English).',
  'Context: AI limits are in "monitor" mode when enforcement is off (usage recorded, nobody blocked).',
  'Payments are not connected yet; plan prices are placeholders until a payment provider is chosen.',
  'REAL DATABASE SCHEMA (use ONLY these names in any SQL; never invent tables or columns):',
  '- profiles(id, email, name, full_name, role[student|teacher|both|admin], created_at, ...)',
  '- plans(id, code, name, price_monthly_cents, price_yearly_cents, currency, is_active, sort_order)',
  '- plan_features(plan_id, feature_key, value jsonb)  e.g. feature_key=\'ai_requests_per_day\' (-1 = unlimited)',
  '- subscriptions(id, user_id, plan_id, status[active|trialing|past_due|canceled|expired], started_at, expires_at, source)',
  '- ai_usage_events(id, user_id, feature, status[reserved|ok|failed], source[plan|monitor|credit], tokens_in, tokens_out, created_at)',
  '- credit_accounts(user_id, balance); credit_ledger(user_id, delta, reason, note) is append-only. Credits are granted ONLY via the function credit_grant(user, amount, reason, note, order).',
  'Prices are stored in cents in plans.price_monthly_cents (NULL = not set). "price_set" in the DATA is only a summary flag, NOT a column.',
  'The DATA keys are summaries, not table names. If you are not sure a SQL statement is correct, do not write SQL: describe the change in words instead.',
  'When you do write SQL, put it in a fenced block and say it must be reviewed before running. Keep answers under 250 words.'
].join('\n');

function serviceHeaders() {
  const h = { 'Content-Type': 'application/json', apikey: SERVICE_KEY };
  if (SERVICE_KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + SERVICE_KEY;
  return h;
}

async function rpc(name, args) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'POST', headers: serviceHeaders(), body: JSON.stringify(args || {})
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* empty */ }
  return { ok: r.ok, status: r.status, data };
}

async function verifyUser(token) {
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u.id : null;
  } catch (e) { return null; }
}

async function isAdmin(userId) {
  const r = await fetch(
    SUPABASE_URL + '/rest/v1/profiles?select=role&id=eq.' + encodeURIComponent(userId),
    { headers: serviceHeaders() }
  );
  if (!r.ok) return false;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] && rows[0].role === 'admin';
}

function send(res, status, payload) { res.status(status).json(payload); }

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { send(res, 405, { error: 'Method not allowed' }); return; }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !SERVICE_KEY) {
    send(res, 500, { error: 'The assistant is not configured yet.', code: 'not_configured' });
    return;
  }

  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) { send(res, 401, { error: 'Please log in.', code: 'auth_required' }); return; }
  const userId = await verifyUser(token);
  if (!userId) { send(res, 401, { error: 'Your session has expired. Please log in again.', code: 'auth_required' }); return; }

  // Admin check happens here, on the server. The browser cannot influence it.
  if (!(await isAdmin(userId))) {
    send(res, 403, { error: 'Admins only.', code: 'forbidden' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) { send(res, 400, { error: 'Please type a question.', code: 'bad_request' }); return; }
  if (question.length > MAX_QUESTION_CHARS) { send(res, 413, { error: 'That question is too long.', code: 'too_long' }); return; }

  // Counts-only snapshot of the app
  const ov = await rpc('admin_overview');
  if (!ov.ok || !ov.data) {
    console.error('admin_overview failed', ov.status, ov.data);
    send(res, 503, {
      error: 'Could not read the app summary. Run migrations/034_admin_overview.sql in Supabase.',
      code: 'overview_unavailable'
    });
    return;
  }
  const snapshot = Object.assign({}, ov.data, { ai_limit_enforcement: ENFORCE ? 'on' : 'off (monitor mode)' });

  // Meter the admin's own usage (hard daily cap protects the budget)
  let eventId = null;
  const m = await rpc('ai_consume', {
    p_user: userId, p_feature: 'admin_assistant', p_prompt_chars: question.length,
    p_max_tokens: 2500, p_enforce: false, p_hard_cap: ADMIN_DAILY_CAP
  });
  if (m.ok && m.data && typeof m.data === 'object') {
    if (!m.data.allowed) {
      send(res, 429, { error: 'Daily assistant limit reached. Try again tomorrow.', code: 'hard_cap' });
      return;
    }
    eventId = m.data.event_id;
  } else {
    console.error('ai_consume failed (admin assistant)', m.status, m.data);
  }

  const finish = async (status, usage) => {
    if (!eventId) return;
    try {
      await rpc('ai_finish', {
        p_event: eventId, p_status: status,
        p_tokens_in: (usage && usage.prompt_tokens) || null,
        p_tokens_out: (usage && usage.completion_tokens) || null,
        p_model: MODEL
      });
    } catch (e) { console.error('ai_finish failed', e); }
  };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: 'DATA (JSON, counts only):\n' + JSON.stringify(snapshot) + '\n\nQUESTION:\n' + question }
        ],
        max_completion_tokens: 2500,
        include_reasoning: false
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('Groq error (admin assistant):', response.status, data.error || data);
      await finish('failed', null);
      send(res, 502, { error: 'The AI service could not answer right now.', code: 'upstream_error' });
      return;
    }
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    const text = typeof (msg && msg.content) === 'string' ? msg.content.trim() : '';
    if (!text) {
      await finish('failed', data.usage);
      send(res, 502, { error: 'The AI returned an empty answer. Please try again.', code: 'empty_response' });
      return;
    }
    await finish('ok', data.usage);
    send(res, 200, { text, snapshot });
  } catch (err) {
    console.error('Unexpected admin assistant error:', err);
    await finish('failed', null);
    send(res, 500, { error: 'Unexpected server error. Please try again.', code: 'server_error' });
  }
};
