const CACHE_NAME = 'tickets-mv-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/cinema-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // CRITICAL: NEVER intercept cross-origin API calls (Supabase, CDNs, external services).
  // Let the browser handle cross-origin network requests directly.
  try {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
      return;
    }
  } catch {
    return;
  }

  // Only handle GET requests for local static assets
  if (event.request.method !== 'GET') {
    return;
  }

  // Navigation requests - network first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html');
        return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  // Same-origin static assets - cache-first with network revalidation
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Asynchronously revalidate in background
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const cacheCopy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
            }
          })
          .catch(() => {});
        return cached;
      }

      // Fetch from network if not in cache
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
          return response;
        })
        .catch(() => {
          return new Response('Not found in cache', { status: 404, headers: { 'Content-Type': 'text/plain' } });
        });
    })
  );
});
