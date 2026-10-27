// api/create-room.js
// Vercel serverless function -- creates a real Daily.co video room.
// Keeps the Daily API key server-side (set as DAILY_API_KEY in
// Vercel -> Project Settings -> Environment Variables).
//
// Security rules (added in the security pass):
//   1. The caller must be logged in (Authorization: Bearer <Supabase access token>).
//   2. Only teachers and admins can create rooms.
//   3. No wildcard CORS: only same-origin calls work, unless ALLOWED_ORIGIN is set.
//   4. At most 10 rooms per user per hour (per warm server instance) and rooms expire after 4 hours.
//   5. Room names are random and unguessable; provider error details are never sent to the browser.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vauudtedojtcveiqajlr.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE';

const recent = new Map();
function rateAllowed(userId) {
  const now = Date.now();
  const list = (recent.get(userId) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (list.length >= 10) { recent.set(userId, list); return false; }
  list.push(now);
  recent.set(userId, list);
  if (recent.size > 5000) recent.clear();
  return true;
}

async function getUser(token) {
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

// Reads the caller's own role using the caller's own token (database rules apply).
async function getRole(userId, token) {
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/profiles?select=role&id=eq.' + encodeURIComponent(userId),
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows && rows[0] ? rows[0].role : null;
  } catch (e) {
    return null;
  }
}

module.exports = async (req, res) => {
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Please log in.' });
    return;
  }
  const userId = await getUser(token);
  if (!userId) {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    return;
  }
  const role = await getRole(userId, token);
  if (role !== 'teacher' && role !== 'admin') {
    res.status(403).json({ error: 'Only approved teachers can create live rooms.' });
    return;
  }
  if (!rateAllowed(userId)) {
    res.status(429).json({ error: 'Too many rooms created. Please try again later.' });
    return;
  }

  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Live rooms are not configured yet.' });
    return;
  }

  // Unguessable, url-safe room name.
  const roomName = 'class-' + crypto.randomBytes(8).toString('hex');

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
      console.error('Daily API error:', response.status, data.error);
      res.status(502).json({ error: 'Could not create the room right now.' });
      return;
    }

    res.status(200).json({ url: data.url, name: data.name });

  } catch (err) {
    console.error('create-room failed:', err);
    res.status(500).json({ error: 'Unexpected server error' });
  }
};
