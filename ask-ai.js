// api/ask-ai.js
// Vercel serverless function — deploys automatically because it's in /api.
// Keeps the Anthropic API key server-side (set as ANTHROPIC_API_KEY in
// Vercel → Project Settings → Environment Variables). The browser only
// ever talks to this endpoint, never to Anthropic directly.

export default async function handler(req, res) {
  // Basic CORS so this can be called from your Vercel-hosted pages
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel → Project Settings → Environment Variables.' });
  }

  const { prompt, maxTokens } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing "prompt" in request body.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: Math.min(maxTokens || 500, 1500),
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Anthropic API error' });
    }

    const text = (data.content || []).map(block => block.text || '').join('\n').trim();
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
}
