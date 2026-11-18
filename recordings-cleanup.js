// api/recordings-cleanup.js
// Daily job: deletes class audio recordings whose 30 days are over (the audio file, its whiteboard file AND its database row).
// Only Vercel Cron can call it (GET with "Authorization: Bearer <CRON_SECRET>"). No AI, no external site.
// Environment variables (Vercel, already set): SUPABASE_SERVICE_KEY, CRON_SECRET.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vauudtedojtcveiqajlr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const BATCH = 100;

function sh() {
  const h = { 'Content-Type': 'application/json', apikey: SERVICE_KEY };
  if (SERVICE_KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + SERVICE_KEY;
  return h;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET || '';
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!secret || !bearer || bearer !== secret) { res.status(401).json({ error: 'Not allowed' }); return; }
  if (!SERVICE_KEY) { res.status(500).json({ error: 'Not configured' }); return; }

  try {
    const now = new Date().toISOString();
    const q = SUPABASE_URL + '/rest/v1/class_recordings?select=id,audio_path,board_path&kind=eq.audio&expires_at=lt.' +
      encodeURIComponent(now) + '&limit=' + BATCH;
    const r = await fetch(q, { headers: sh() });
    if (!r.ok) { res.status(502).json({ error: 'Could not list' }); return; }
    const rows = await r.json();
    if (!rows.length) { res.status(200).json({ deleted: 0 }); return; }

    // 1) delete the audio files
    const paths = rows.reduce((a, x) => a.concat([x.audio_path, x.board_path]), []).filter(Boolean);
    let filesOk = true;
    if (paths.length) {
      const d = await fetch(SUPABASE_URL + '/storage/v1/object/class-audio', {
        method: 'DELETE', headers: sh(), body: JSON.stringify({ prefixes: paths })
      });
      filesOk = d.ok;
    }
    // 2) delete the rows only if the files are gone (so nothing is left orphaned)
    if (!filesOk) { res.status(502).json({ error: 'File delete failed', deleted: 0 }); return; }
    const ids = rows.map(x => x.id).join(',');
    const dr = await fetch(SUPABASE_URL + '/rest/v1/class_recordings?id=in.(' + ids + ')', { method: 'DELETE', headers: sh() });
    if (!dr.ok) { res.status(502).json({ error: 'Row delete failed' }); return; }
    res.status(200).json({ deleted: rows.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
};
