// api/world.js
// Vercel serverless function: public World Bank indicators for ONE country, cached.
//   GET /api/world?c=SD      (c = 2-letter country code)
// Why a server helper: one small request from the phone instead of six, no browser (CORS)
// problems, and a shared 24-hour cache so the World Bank is not asked again and again.
// No secret key is used and nothing is stored. Data: World Bank, World Development Indicators.

const INDICATORS = [
  { id: 'NY.GDP.PCAP.CD',    key: 'income',    unit: 'usd' },
  { id: 'SP.DYN.LE00.IN',    key: 'life',      unit: 'years' },
  { id: 'IT.NET.USER.ZS',    key: 'internet',  unit: 'pct' },
  { id: 'SE.SEC.ENRR',       key: 'school',    unit: 'pct' },
  { id: 'EG.FEC.RNEW.ZS',    key: 'renewable', unit: 'pct' },
  { id: 'GB.XPD.RSDV.GD.ZS', key: 'research',  unit: 'pct' }
];

async function getIndicator(country, ind) {
  const url = 'https://api.worldbank.org/v2/country/' + country + '/indicator/' + ind.id +
    '?format=json&per_page=70';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('World Bank answered ' + r.status);
    const j = await r.json();
    const rows = Array.isArray(j) && Array.isArray(j[1]) ? j[1] : [];
    const pts = rows
      .filter(x => x && x.value !== null && x.value !== undefined && /^\d{4}$/.test(String(x.date)))
      .map(x => [parseInt(x.date, 10), Math.round(Number(x.value) * 100) / 100])
      .filter(p => isFinite(p[1]))
      .sort((a, b) => a[0] - b[0]);
    const name = rows[0] && rows[0].country && rows[0].country.value;
    const last = pts[pts.length - 1] || null;
    return {
      key: ind.key, code: ind.id, unit: ind.unit,
      value: last ? last[1] : null, year: last ? last[0] : null,
      series: pts.slice(-25),
      _country: name || null
    };
  } finally { clearTimeout(t); }
}

module.exports = async function handler(req, res) {
  const c = String((req.query && req.query.c) || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) { res.status(400).json({ error: 'Bad country code' }); return; }
  try {
    const out = await Promise.all(INDICATORS.map(i => getIndicator(c, i).catch(e => ({ key: i.key, code: i.id, unit: i.unit, value: null, year: null, series: [], error: String(e.message || e) }))));
    const ok = out.filter(x => !x.error).length;
    if (!ok) { res.status(502).json({ error: 'The data source is not answering right now.' }); return; }
    const name = (out.find(x => x._country) || {})._country || c;
    out.forEach(x => { delete x._country; });
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      country: { code: c, name },
      source: 'World Bank, World Development Indicators',
      note: 'Annual figures. The latest year is often one to three years behind, and some countries have gaps.',
      indicators: out
    });
  } catch (e) {
    res.status(502).json({ error: 'The data source is not answering right now.' });
  }
};
