/* Garage Operations Pro service worker.
   Never cache Supabase/API responses: stale API caching caused deleted vehicles
   to reappear and newly added vehicles not to show. */
const CACHE = 'garage-ops-pro-v4';
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Leave Supabase and every other cross-origin request untouched.
  if (url.origin !== self.location.origin) return;

  // Only cache the app's static shell, never arbitrary same-origin data.
  const isAppAsset = ASSETS.some(asset => {
    const assetUrl = new URL(asset, self.location.origin);
    return url.pathname === assetUrl.pathname;
  }) || request.mode === 'navigate';

  if (!isAppAsset) return;

  // Network-first keeps HTML and JavaScript updates current; cache is fallback offline.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request) || await cache.match('./index.html');
      if (cached) return cached;
      throw error;
    }
  })());
});
