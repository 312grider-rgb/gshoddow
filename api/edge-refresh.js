// api/edge-refresh.js
// Daily job that adds new "The Edge" cards from free public news feeds.
//   - Vercel Cron calls it once a day (GET, with "Authorization: Bearer <CRON_SECRET>").
//   - An admin can also run it from the admin page (POST with the admin's login token).
// Uses ONE AI call per run. Every card keeps its source link. New cards are never "Proven".
//
// Environment variables (Vercel): GROQ_API_KEY, SUPABASE_SERVICE_KEY (already set), CRON_SECRET (new).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vauudtedojtcveiqajlr.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_mKrbrP7s7BLQgb6u0IQ8xg_wn--izVE';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const MODEL = 'openai/gpt-oss-120b';
const MAX_NEW_PER_RUN = 8;
const PER_FEED = 4;

const FEEDS = [
  { i: 'ai', n: 'MIT Technology Review', u: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { i: 'health', n: 'ScienceDaily', u: 'https://www.sciencedaily.com/rss/health_medicine.xml' },
  { i: 'energy', n: 'ScienceDaily', u: 'https://www.sciencedaily.com/rss/matter_energy/energy_technology.xml' },
  { i: 'space', n: 'NASA', u: 'https://www.nasa.gov/feed/' },
  { i: 'computing', n: 'ScienceDaily', u: 'https://www.sciencedaily.com/rss/computers_math/quantum_computers.xml' },
  { i: 'finance', n: 'BBC News', u: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { i: 'transport', n: 'Electrek', u: 'https://electrek.co/feed/' }
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
function parseFeed(xml) {
  const out = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let link = tag(b, 'link');
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
    const title = tag(b, 'title');
    const desc = (tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 500);
    const date = tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published');
    if (/^https:\/\//i.test(link) && title) out.push({ title, desc, link, date });
    if (out.length >= PER_FEED) break;
  }
  return out;
}

async function getFeed(f) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch(f.u, { signal: ctl.signal, headers: { 'User-Agent': 'LearningNeverEnds-Edge/1.0' } });
    clearTimeout(t);
    if (!r.ok) return { f, ok: false, items: [], err: 'http ' + r.status };
    const items = parseFeed(await r.text());
    return { f, ok: items.length > 0, items, err: items.length ? '' : 'no items' };
  } catch (e) {
    return { f, ok: false, items: [], err: 'failed' };
  }
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

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET || '';
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  let allowed = false;
  if (secret && bearer && bearer === secret) allowed = true;
  else if (bearer && req.method === 'POST') allowed = await isAdmin(bearer);
  if (!allowed) { res.status(401).json({ error: 'Not allowed' }); return; }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !SERVICE_KEY) { res.status(500).json({ error: 'Not configured' }); return; }

  // 1) read feeds
  const results = await Promise.all(FEEDS.map(getFeed));
  const report = results.map((r) => ({ industry: r.f.i, source: r.f.n, ok: r.ok, items: r.items.length, err: r.err }));

  // 2) drop links we already have
  let known = new Set();
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/edge_items?select=source_url&limit=1000', { headers: sh() });
    const rows = await r.json();
    if (Array.isArray(rows)) known = new Set(rows.map((x) => x.source_url));
  } catch (e) { /* continue */ }

  const cand = [];
  for (const r of results) {
    for (const it of r.items) {
      if (known.has(it.link)) continue;
      cand.push({ i: r.f.i, n: r.f.n, title: clip(it.title, 200), desc: clip(it.desc, 400), link: it.link, date: clip(it.date, 40) });
    }
  }
  if (!cand.length) { res.status(200).json({ added: 0, note: 'Nothing new', report }); return; }

  // 3) one AI call
  const list = cand.map((c, k) => (k + 1) + '. [' + c.i + '] ' + c.title + ' — ' + c.desc + ' (source: ' + c.n + ')').join('\n');
  const prompt =
    'You help a learning app for students. Below are news items, numbered, each with an industry tag. ' +
    'Choose at most 8 items that report a CONCRETE new development (a discovery, product, trial, policy, milestone). ' +
    'Skip opinions, adverts, politics without a development, and anything unclear. ' +
    'For each chosen item write a card using ONLY the information given for that item. Never add facts, numbers or names that are not in the item. ' +
    'Reply with ONLY a JSON array, no other text. Each element: ' +
    '{"n":<item number>,"title":"max 90 characters","what":"1-2 plain sentences saying what happened","why":"1-2 careful sentences on why it may matter, without hype","status":"early" or "spec"}. ' +
    'Use "spec" if the item is a claim, plan or forecast; otherwise "early". Write in English.\n\n' + list;

  let cards = [];
  try {
    const ar = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 3500,
        include_reasoning: false
      })
    });
    const ad = await ar.json();
    let txt = ad && ad.choices && ad.choices[0] && ad.choices[0].message && ad.choices[0].message.content;
    txt = String(txt || '');
    const a = txt.indexOf('['), b = txt.lastIndexOf(']');
    cards = JSON.parse(txt.slice(a, b + 1));
  } catch (e) {
    res.status(502).json({ error: 'AI step failed', report }); return;
  }
  if (!Array.isArray(cards)) { res.status(502).json({ error: 'AI step failed', report }); return; }

  // 4) validate and save (links must come from the feeds, never from the AI)
  const rows = [];
  const seen = new Set();
  for (const c of cards) {
    const src = cand[(parseInt(c && c.n, 10) || 0) - 1];
    if (!src || seen.has(src.link)) continue;
    const title = clip(c.title, 120), what = clip(c.what, 400), why = clip(c.why, 400);
    if (!title || !what || !why) continue;
    seen.add(src.link);
    rows.push({
      industry: src.i, title, what_text: what, why_text: why,
      status: c.status === 'spec' ? 'spec' : 'early',
      source_name: src.n, source_url: src.link,
      as_of: src.date ? src.date.slice(0, 16) : new Date().toISOString().slice(0, 10)
    });
    if (rows.length >= MAX_NEW_PER_RUN) break;
  }
  if (!rows.length) { res.status(200).json({ added: 0, note: 'No suitable items', report }); return; }

  const ins = await fetch(SUPABASE_URL + '/rest/v1/edge_items?on_conflict=source_url', {
    method: 'POST',
    headers: Object.assign(sh(), { Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify(rows)
  });
  if (!ins.ok) { res.status(502).json({ error: 'Save failed', report }); return; }
  res.status(200).json({ added: rows.length, report });
};
