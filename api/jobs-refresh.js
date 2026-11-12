// api/jobs-refresh.js
// Daily job: reads public job feeds and saves new listings as links (no AI, nothing invented).
//   - Vercel Cron calls it (GET with "Authorization: Bearer <CRON_SECRET>").
//   - An admin can run it from the admin page (POST with the admin's login token).
// Old feed listings (older than 45 days) are removed so students never see stale jobs.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vauudtedojtcveiqajlr.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const PER_FEED = 15;
const KEEP_DAYS = 45;

const FEEDS = [
  { n: 'ReliefWeb', kind: 'job', u: 'https://reliefweb.int/jobs/rss.xml' },
  { n: 'We Work Remotely', kind: 'remote', u: 'https://weworkremotely.com/remote-jobs.rss' }
];

function sh() {
  const h = { 'Content-Type': 'application/json', apikey: SERVICE_KEY };
  if (SERVICE_KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + SERVICE_KEY;
  return h;
}
function strip(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function tag(block, name) {
  const m = block.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? strip(m[1]) : '';
}
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function parseFeed(xml, feed) {
  const out = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let link = tag(b, 'link');
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
    let title = tag(b, 'title');
    if (!/^https:\/\//i.test(link) || link.length > 600 || title.length < 3) continue;
    let employer = '';
    // "Company: Job title" is the usual pattern on remote job feeds.
    const m = title.match(/^([^:]{2,60}):\s+(.{3,})$/);
    if (m && feed.kind === 'remote') { employer = m[1]; title = m[2]; }
    const region = tag(b, 'region') || '';
    out.push({
      source: 'feed', kind: feed.kind, title: clip(title, 140), employer: clip(employer, 120) || null,
      country: clip(region, 80) || null, apply_url: link, origin: feed.n, status: 'approved', posted_by: null
    });
    if (out.length >= PER_FEED) break;
  }
  return out;
}

async function getFeed(f) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(f.u, { signal: ctl.signal, headers: { 'User-Agent': 'LearningNeverEnds-Jobs/1.0' } });
    clearTimeout(t);
    if (!r.ok) return { f, ok: false, items: [], err: 'http ' + r.status };
    const items = parseFeed(await r.text(), f);
    return { f, ok: items.length > 0, items, err: items.length ? '' : 'no items' };
  } catch (e) { return { f, ok: false, items: [], err: 'failed' }; }
}

async function isAdmin(token) {
  try {
    const u = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!u.ok) return false;
    const id = (await u.json()).id;
    if (!id) return false;
    const p = await fetch(SUPABASE_URL + '/rest/v1/profiles?select=role&id=eq.' + encodeURIComponent(id), { headers: sh() });
    const rows = await p.json();
    return Array.isArray(rows) && rows[0] && rows[0].role === 'admin';
  } catch (e) { return false; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET || '';
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  let allowed = false;
  if (secret && bearer && bearer === secret) allowed = true;
  else if (bearer && req.method === 'POST') allowed = await isAdmin(bearer);
  if (!allowed) { res.status(401).json({ error: 'Not allowed' }); return; }
  if (!SERVICE_KEY) { res.status(500).json({ error: 'Not configured' }); return; }

  const results = await Promise.all(FEEDS.map(getFeed));
  const report = results.map((r) => ({ source: r.f.n, ok: r.ok, items: r.items.length, err: r.err }));
  const rows = [];
  const seen = new Set();
  for (const r of results) for (const it of r.items) if (!seen.has(it.apply_url)) { seen.add(it.apply_url); rows.push(it); }

  let added = 0;
  if (rows.length) {
    const ins = await fetch(SUPABASE_URL + '/rest/v1/job_items?on_conflict=apply_url', {
      method: 'POST',
      headers: Object.assign(sh(), { Prefer: 'resolution=ignore-duplicates,return=representation' }),
      body: JSON.stringify(rows)
    });
    if (!ins.ok) { res.status(502).json({ error: 'Save failed', report }); return; }
    try { const j = await ins.json(); added = Array.isArray(j) ? j.length : 0; } catch (e) { /* ignore */ }
  }

  // remove old feed listings (never touches posted jobs)
  let removed = 0;
  try {
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString();
    const d = await fetch(SUPABASE_URL + '/rest/v1/job_items?source=eq.feed&created_at=lt.' + encodeURIComponent(cutoff),
      { method: 'DELETE', headers: Object.assign(sh(), { Prefer: 'return=representation' }) });
    if (d.ok) { const j = await d.json(); removed = Array.isArray(j) ? j.length : 0; }
  } catch (e) { /* ignore */ }

  res.status(200).json({ added, removed, report });
};
