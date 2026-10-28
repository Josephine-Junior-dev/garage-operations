/* Garage Operations Pro service worker v5.
   Supabase API requests are never cached. Use a resilient install so one missing
   optional asset cannot prevent the worker update from activating. */
const CACHE = 'garage-ops-pro-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async asset => {
      try {
        const response = await fetch(asset, { cache: 'reload' });
        if (response && response.ok) {
          await cache.put(asset, response.clone());
        }
      } catch (error) {
        // Do not fail installation because an optional/offline asset is missing.
        console.warn('Could not pre-cache app asset:', asset, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('garage-ops-pro-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never intercept cross-origin calls, including Supabase REST/API requests.
  if (url.origin !== self.location.origin) return;

  const isKnownAsset = ASSETS.some(asset => {
    const assetUrl = new URL(asset, self.location.origin);
    return url.pathname === assetUrl.pathname;
  }) || request.mode === 'navigate';

  if (!isKnownAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      throw error;
    }
  })());
});
