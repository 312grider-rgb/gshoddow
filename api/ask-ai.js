// api/ask-ai.js
// Vercel serverless function: the ONLY place the AI provider key is used.
//
// What it does, in order:
//   1. Requires a logged-in Supabase user (Authorization: Bearer <access token>).
//   2. Meters the request and applies plan limits / credits through database
//      functions (migration 031_ai_usage_credits.sql). Browsers cannot call those.
//   3. Calls Groq server-side. GROQ_API_KEY never reaches the browser.
//
// Environment variables (Vercel -> Project Settings -> Environment Variables):
//   GROQ_API_KEY               required
//   SUPABASE_SERVICE_KEY       required for metering (server only, never in the browser)
//   SUPABASE_URL               optional (defaults to this project)
//   SUPABASE_ANON_KEY          optional (defaults to this project's public key)
//   AI_ENFORCE_LIMITS          'true' to enforce plan limits. Default: off (usage is
//                              recorded but nobody is blocked by their plan limit).
//   AI_HARD_DAILY_CAP          absolute per-user daily ceiling, always enforced (default 300)
//   ALLOWED_ORIGIN             optional. Only needed if another website calls this API.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vauudtedojtcveiqajlr.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const ENFORCE = String(process.env.AI_ENFORCE_LIMITS || '').toLowerCase() === 'true';
const HARD_CAP = Math.max(1, parseInt(process.env.AI_HARD_DAILY_CAP || '300', 10) || 300);

const MODEL = 'openai/gpt-oss-120b';
const MAX_PROMPT_CHARS = 40000;
const MAX_OUTPUT_TOKENS = 8000;

// ---------- small helpers ----------

function serviceHeaders() {
  const h = { 'Content-Type': 'application/json', apikey: SERVICE_KEY };
  // Legacy service keys are JWTs and go in Authorization too; new "sb_secret_" keys do not.
  if (SERVICE_KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + SERVICE_KEY;
  return h;
}

async function rpc(name, args) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: serviceHeaders(),
    body: JSON.stringify(args)
  });
  let data = null;
  try { data = await r.json(); } catch (e) { /* empty body */ }
  return { ok: r.ok, status: r.status, data };
}

// Returns the user id for a valid Supabase access token, otherwise null.
async function verifyUser(token) {
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u.id : null;
  } catch (e) {
    return null;
  }
}

// Log each setup warning once per server instance instead of on every request.
const warned = {};
function warnOnce(key, message) {
  if (!warned[key]) { warned[key] = true; console.warn(message); }
}

// Fallback limiter used ONLY while database metering is not set up yet.
// Per warm server instance, so it is a safety net, not real accounting.
const recent = new Map();
function fallbackAllowed(userId) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const max = 20;
  const list = (recent.get(userId) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { recent.set(userId, list); return false; }
  list.push(now);
  recent.set(userId, list);
  if (recent.size > 5000) recent.clear();
  return true;
}

function send(res, status, payload) {
  res.status(status).json(payload);
}

// ---------- handler ----------

module.exports = async (req, res) => {
  // Same-origin calls (the website itself) need no CORS. Only allow another origin if configured.
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { send(res, 405, { error: 'Method not allowed' }); return; }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    send(res, 500, { error: 'The AI service is not configured yet.', code: 'not_configured' });
    return;
  }

  // 1) Who is calling?
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    send(res, 401, { error: 'Please log in to use AI features.', code: 'auth_required' });
    return;
  }
  const userId = await verifyUser(token);
  if (!userId) {
    send(res, 401, { error: 'Your session has expired. Please log in again.', code: 'auth_required' });
    return;
  }

  // 2) Validate input
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const prompt = body.prompt;
  if (!prompt || typeof prompt !== 'string') {
    send(res, 400, { error: 'Missing "prompt" in request body.', code: 'bad_request' });
    return;
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    send(res, 413, { error: 'That request is too long.', code: 'too_long' });
    return;
  }
  const maxTokens = Math.min(Math.max(parseInt(body.maxTokens, 10) || 4000, 1), MAX_OUTPUT_TOKENS);
  const feature = String(body.feature || 'general').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'general';

  // 3) Meter + apply limits (database decides; the browser cannot influence it)
  let eventId = null;
  let meta = { metered: false };

  if (SERVICE_KEY) {
    const m = await rpc('ai_consume', {
      p_user: userId,
      p_feature: feature,
      p_prompt_chars: prompt.length,
      p_max_tokens: maxTokens,
      p_enforce: ENFORCE,
      p_hard_cap: HARD_CAP
    });

    if (m.ok && m.data && typeof m.data === 'object') {
      if (!m.data.allowed) {
        const hard = m.data.reason === 'hard_cap';
        send(res, 429, {
          error: hard
            ? 'Too many AI requests today. Please try again tomorrow.'
            : 'You have reached your daily AI limit. Upgrade your plan or add credits to continue.',
          code: hard ? 'hard_cap' : 'limit_reached',
          used_today: m.data.used_today,
          limit: m.data.limit
        });
        return;
      }
      eventId = m.data.event_id;
      meta = {
        metered: true,
        used_today: m.data.used_today,
        limit: m.data.limit,
        source: m.data.source
      };
    } else if (m.status === 404 || (m.data && m.data.code === 'PGRST202')) {
      // Migration 031 has not been run yet: keep the app working with the safety net.
      warnOnce('no-fn', 'ai_consume not found: run migrations/031_ai_usage_credits.sql');
      if (!fallbackAllowed(userId)) {
        send(res, 429, { error: 'Too many AI requests. Please wait a few minutes.', code: 'rate_limited' });
        return;
      }
    } else {
      console.error('ai_consume failed', m.status, m.data);
      send(res, 503, { error: 'AI is temporarily unavailable. Please try again.', code: 'metering_error' });
      return;
    }
  } else {
    warnOnce('no-key', 'SUPABASE_SERVICE_KEY is not set: AI usage is not being recorded.');
    if (!fallbackAllowed(userId)) {
      send(res, 429, { error: 'Too many AI requests. Please wait a few minutes.', code: 'rate_limited' });
      return;
    }
  }

  const finish = async (status, usage) => {
    if (!eventId) return;
    try {
      await rpc('ai_finish', {
        p_event: eventId,
        p_status: status,
        p_tokens_in: (usage && usage.prompt_tokens) || null,
        p_tokens_out: (usage && usage.completion_tokens) || null,
        p_model: MODEL
      });
    } catch (e) {
      console.error('ai_finish failed', e);
    }
  };

  // 4) Call the AI provider
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        // GPT-OSS reasoning models work better with max_completion_tokens.
        max_completion_tokens: maxTokens,
        // We want the final answer, not the reasoning trace.
        include_reasoning: false
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Groq API error:', response.status, data.error || data);
      await finish('failed', null);
      // Do not forward provider details to the browser.
      send(res, response.status === 429 ? 429 : 502, {
        error: response.status === 429
          ? 'The AI service is busy. Please try again in a moment.'
          : 'The AI service could not answer right now.',
        code: 'upstream_error'
      });
      return;
    }

    const message = data.choices && data.choices[0] && data.choices[0].message;
    const text = typeof (message && message.content) === 'string' ? message.content.trim() : '';

    if (!text) {
      console.error('Groq returned no content, finish_reason:',
        data.choices && data.choices[0] && data.choices[0].finish_reason);
      await finish('failed', data.usage);
      send(res, 502, { error: 'The AI returned an empty answer. Please try again.', code: 'empty_response' });
      return;
    }

    await finish('ok', data.usage);
    send(res, 200, { text, meta });
  } catch (err) {
    console.error('Unexpected AI error:', err);
    await finish('failed', null);
    send(res, 500, { error: 'Unexpected server error. Please try again.', code: 'server_error' });
  }
};
