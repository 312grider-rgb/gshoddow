// api/create-room.js
// Vercel serverless function -- creates a real Daily.co video room.
// Keeps the Daily API key server-side (set as DAILY_API_KEY in
// Vercel -> Project Settings -> Environment Variables).

module.exports = async (req, res) => {
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

  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing DAILY_API_KEY. Add it in Vercel -> Project Settings -> Environment Variables.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // Room name must be url-safe; Daily auto-generates one if we don't pass a name.
  const roomName = 'class-' + Math.random().toString(36).slice(2, 10);

  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          // Room auto-expires 4 hours after creation as a safety net,
          // in case a teacher forgets to end the session.
          exp: Math.round(Date.now() / 1000) + 4 * 60 * 60,
          enable_chat: true,
          enable_screenshare: true,
          eject_at_room_exp: true
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      res.status(500).json({ error: data.info || data.error });
      return;
    }

    res.status(200).json({ url: data.url, name: data.name });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
