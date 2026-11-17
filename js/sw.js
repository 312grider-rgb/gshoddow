/* sw.js — OFF SWITCH. Removes the saved-copy helper from every phone and deletes everything it saved.
   After this loads once, the app behaves exactly as it did before the helper existed. */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
    try { const cs = await self.clients.matchAll({ type: 'window' }); cs.forEach(c => { try { c.navigate(c.url); } catch (err) {} }); } catch (err) {}
  })());
});
// No fetch handler: every request goes straight to the network.
