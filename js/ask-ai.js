// api/ask-ai.js
// Vercel serverless function
// Calls Groq's API server-side. The Groq key never reaches the browser.
// GROQ_API_KEY must be configured in:
// Vercel -> Project Settings -> Environment Variables
//
// SECURITY CHANGE: this endpoint now requires a signed-in user.
// The browser sends the user's Supabase access token ("Authorization: Bearer ...",
// added automatically by js/i18n.js) and we verify it with Supabase before any AI
// budget is spent. Before this change, anyone on the internet could call this URL.
//
// SUPABASE_URL / SUPABASE_ANON_KEY below are the same PUBLIC values the front-end already
// uses (js/config.js). They can be overridden with Vercel environment variables.

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://vauudtedojtcveiqajlr.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE';

// Input limits (adjust if your longest legitimate prompt is bigger)
const MAX_PROMPT_CHARS = 40000;
const DEFAULT_MAX_TOKENS = 4000;
const HARD_MAX_TOKENS = 8000;

// Ask Supabase who owns this token. Returns the user object, or null.
async function getSignedInUser(req) {
  const header = (req.headers && req.headers['authorization']) || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${match[1]}`
      }
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user && user.id ? user : null;
  } catch (e) {
    return null;
  }
}

module.exports = async (req, res) => {
  // The app calls this from its own pages (same origin), so no cross-origin
  // access is granted. (The old wildcard CORS header was removed on purpose.)
  res.setHeader('Cache-Control', 'no-store');

  // Handle browser preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Only POST is allowed
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed'
    });
    return;
  }

  // Must be a signed-in user
  const user = await getSignedInUser(req);
  if (!user) {
    res.status(401).json({
      error: 'Please sign in to use AI features.'
    });
    return;
  }

  // Get Groq API key
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error:
        'Server is missing GROQ_API_KEY. Add it in Vercel -> Project Settings -> Environment Variables.'
    });
    return;
  }

  // Parse request body
  let body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  body = body || {};

  const prompt = body.prompt;

  // Validate prompt
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({
      error: 'Missing "prompt" in request body.'
    });
    return;
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    res.status(413).json({
      error: 'Prompt is too long.'
    });
    return;
  }

  // Validate maxTokens (always a number between 1 and the hard cap)
  const requestedTokens = Number(body.maxTokens);
  const maxTokens =
    Number.isFinite(requestedTokens) && requestedTokens > 0
      ? Math.min(Math.floor(requestedTokens), HARD_MAX_TOKENS)
      : DEFAULT_MAX_TOKENS;

  // Basic usage trail in the Vercel logs (no prompt text, no personal data).
  // Proper per-user limits and credits come with the AI usage tables.
  console.log('ask-ai', {
    user: user.id,
    promptChars: prompt.length,
    maxTokens: maxTokens
  });

  // Current Groq model
  const MODEL = 'openai/gpt-oss-120b';

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: MODEL,

          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],

          // GPT-OSS reasoning models work better with
          // max_completion_tokens.
          max_completion_tokens: maxTokens,

          // We want the final answer, not the reasoning trace.
          include_reasoning: false
        })
      }
    );

    const data = await response.json();

    // Handle Groq API errors
    if (!response.ok || data.error) {
      console.error('Groq API error:', data);

      res.status(response.status || 500).json({
        error:
          data.error?.message ||
          'Groq API error',
        details: data.error || null
      });

      return;
    }

    // Extract assistant response
    const message = data.choices?.[0]?.message;

    const text =
      typeof message?.content === 'string'
        ? message.content.trim()
        : '';

    // No content returned
    if (!text) {
      console.error(
        'Groq returned no content:',
        JSON.stringify(data, null, 2)
      );

      res.status(500).json({
        error: 'No content returned from Groq.',
        finish_reason:
          data.choices?.[0]?.finish_reason || null
      });

      return;
    }

    // Successful response
    res.status(200).json({
      text: text
    });

  } catch (err) {
    console.error('Unexpected Groq error:', err);

    res.status(500).json({
      error:
        err.message ||
        'Unexpected server error'
    });
  }
};
