/* sw.js — makes the app open fast from the home-screen link.
   Pages, styles, scripts and pictures are served from the phone first and refreshed in the background
   ("stale while revalidate"), so a repeat open does not wait for the network.
   Never touched: /api/, Supabase (data, login, storage), uploads, and any non-GET request.
   To reset everyone: change CACHE below (old caches are deleted), or replace this file with the "kill" version. */
const CACHE = 'lne-v2';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
function cacheable(url, req) {
  if (req.method !== 'GET') return false;
  const u = new URL(url);
  if (u.origin === location.origin) {
    if (u.pathname.startsWith('/api/')) return false;
    if (req.headers.get('range')) return false;
    return true;
  }
  // Same libraries and fonts every time: Supabase script (jsdelivr) and Google Fonts files.
  return u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'fonts.googleapis.com';
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (!cacheable(req.url, req)) return;
  const cross = new URL(req.url).origin !== location.origin;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    // Cross-site files are fetched in CORS mode so we can SEE the status and never save an error page.
    const net = fetch(cross ? new Request(req.url, { mode: 'cors', credentials: 'omit' }) : req).then(res => {
      if (res && res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  })());
});
