// api/ask-ai.js
// Vercel serverless function
// Calls Groq's API server-side.
// GROQ_API_KEY must be configured in:
// Vercel -> Project Settings -> Environment Variables

module.exports = async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle browser preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only POST is allowed
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed'
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
  const maxTokens = body.maxTokens;

  // Validate prompt
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({
      error: 'Missing "prompt" in request body.'
    });
    return;
  }

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
          max_completion_tokens: Math.min(
            maxTokens || 4000,
            8000
          ),

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
