// api/class-students.js
// A teacher adds a student WITHOUT an email address, or resets that student's code.
//   POST { action:'create', classroom_id, name }   -> { student_id, username, code }
//   POST { action:'reset',  classroom_id, student_id } -> { username, code }
// Rules:
//   1. The caller must be logged in (Authorization: Bearer <Supabase access token>).
//   2. The caller must be the teacher of that classroom (checked in the database).
//   3. Only accounts this teacher created (marked in app_metadata.created_by) can have their code reset.
//   4. A class holds at most 200 students; a teacher can create at most 40 accounts per hour.
//   5. The code is shown ONCE to the teacher and never stored anywhere readable. No email is ever sent.
// Environment (Vercel, already set): SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY).

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vauudtedojtcveiqajlr.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const DOMAIN = 'students.gshoddow.vercel.app';
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike characters (0/o, 1/l/i)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const recent = new Map();
function rateAllowed(id) {
  const now = Date.now();
  const list = (recent.get(id) || []).filter((t) => now - t < 3600000);
  if (list.length >= 40) { recent.set(id, list); return false; }
  list.push(now); recent.set(id, list);
  if (recent.size > 5000) recent.clear();
  return true;
}
function pick(n) {
  let s = '';
  const b = crypto.randomBytes(n);
  for (let i = 0; i < n; i++) s += ALPHA[b[i] % ALPHA.length];
  return s;
}
function sh() {
  const h = { 'Content-Type': 'application/json', apikey: SERVICE_KEY };
  if (SERVICE_KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + SERVICE_KEY;
  return h;
}
async function getUser(token) {
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u.id : null;
  } catch (e) { return null; }
}
async function rest(path, opts) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, Object.assign({ headers: sh() }, opts || {}));
  return r;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Not allowed' }); return; }
  if (!SERVICE_KEY) { res.status(500).json({ error: 'Not configured' }); return; }

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const uid = token ? await getUser(token) : null;
  if (!uid) { res.status(401).json({ error: 'Please log in again' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') { res.status(400).json({ error: 'Bad request' }); return; }
  const action = body.action, classId = String(body.classroom_id || '');
  if (!UUID.test(classId) || (action !== 'create' && action !== 'reset')) { res.status(400).json({ error: 'Bad request' }); return; }

  try {
    // the caller must be the teacher of this class
    const cr = await rest('classrooms?select=id&id=eq.' + classId + '&teacher_id=eq.' + uid);
    const crRows = cr.ok ? await cr.json() : [];
    if (!crRows.length) { res.status(403).json({ error: 'Only the teacher of this class can do this' }); return; }

    if (action === 'create') {
      const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (name.length < 2) { res.status(400).json({ error: 'Please type the student\'s name' }); return; }
      if (!rateAllowed(uid)) { res.status(429).json({ error: 'Too many new students this hour. Try again later.' }); return; }
      const cnt = await rest('classroom_members?select=student_id&limit=201&classroom_id=eq.' + classId);
      const members = cnt.ok ? await cnt.json() : [];
      if (members.length >= 200) { res.status(400).json({ error: 'This class is full (200 students)' }); return; }

      const code = pick(8);
      let created = null, username = '';
      for (let i = 0; i < 4 && !created; i++) {
        username = 'st' + pick(5);
        const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
          method: 'POST', headers: sh(),
          body: JSON.stringify({
            email: username + '@' + DOMAIN, password: code, email_confirm: true,
            user_metadata: { full_name: name, name: name, role: 'student', username: username },
            app_metadata: { created_by: uid }
          })
        });
        if (r.ok) created = await r.json();
        else if (r.status !== 422 && r.status !== 409) { res.status(502).json({ error: 'Could not create the account' }); return; }
      }
      if (!created || !created.id) { res.status(502).json({ error: 'Could not create the account. Try again.' }); return; }
      const ins = await rest('classroom_members', { method: 'POST', headers: Object.assign(sh(), { Prefer: 'return=minimal' }), body: JSON.stringify({ classroom_id: classId, student_id: created.id }) });
      if (!ins.ok) {
        await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + created.id, { method: 'DELETE', headers: sh() });
        res.status(502).json({ error: 'Could not add the student to the class' }); return;
      }
      res.status(200).json({ student_id: created.id, username: username, code: code, name: name });
      return;
    }

    // reset
    const sid = String(body.student_id || '');
    if (!UUID.test(sid)) { res.status(400).json({ error: 'Bad request' }); return; }
    const m = await rest('classroom_members?select=student_id&classroom_id=eq.' + classId + '&student_id=eq.' + sid);
    const mRows = m.ok ? await m.json() : [];
    if (!mRows.length) { res.status(404).json({ error: 'This student is not in your class' }); return; }
    const g = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + sid, { headers: sh() });
    const gu = g.ok ? await g.json() : null;
    if (!gu || !gu.app_metadata || gu.app_metadata.created_by !== uid) { res.status(403).json({ error: 'This student has their own account. They can reset it with their email.' }); return; }
    if (!rateAllowed(uid)) { res.status(429).json({ error: 'Too many changes this hour. Try again later.' }); return; }
    const code = pick(8);
    const u = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + sid, { method: 'PUT', headers: sh(), body: JSON.stringify({ password: code }) });
    if (!u.ok) { res.status(502).json({ error: 'Could not change the code' }); return; }
    const un = String((gu.email || '').split('@')[0]);
    res.status(200).json({ student_id: sid, username: un, code: code });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
};
