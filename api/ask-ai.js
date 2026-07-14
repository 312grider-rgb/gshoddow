// api/ask-ai.js
// Vercel serverless function -- deploys automatically because it's in /api.
// Calls Groq's API server-side (key set as GROQ_API_KEY in
// Vercel -> Project Settings -> Environment Variables). The browser only
// ever talks to this endpoint, never to Groq directly.
//
// Written in plain CommonJS (module.exports) since this repo has no
// package.json / build step, so there's no ambiguity about module type.

module.exports = async (req, res) => {
  // Basic CORS so this can be called from your Vercel-hosted pages
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing GROQ_API_KEY. Add it in Vercel -> Project Settings -> Environment Variables.' });
    return;
  }

  // req.body may already be parsed by Vercel, or may need parsing depending on runtime
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const prompt = body.prompt;
  const maxTokens = body.maxTokens;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing "prompt" in request body.' });
    return;
  }

  const MODEL = 'llama-3.3-70b-versatile';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.min(maxTokens || 500, 2000)
      })
    });

    const data = await response.json();

    if (data.error) {
      res.status(500).json({ error: data.error.message || 'Groq API error' });
      return;
    }

    const text = (data.choices && data.choices[0] && data.choices[0].message)
      ? data.choices[0].message.content.trim()
      : '';

    if (!text) {
      res.status(200).json({ text: '', error: 'No content returned from Groq.' });
      return;
    }

    res.status(200).json({ text: text });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
