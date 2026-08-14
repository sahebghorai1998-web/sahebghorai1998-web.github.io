const CACHE_NAME = 'skb-billing-v20260814-5';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './fix.js'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(async response => {
          const text = await response.text();
          const injected = text.replace(
            '</body>',
            '<script src="./fix.js"></script></body>'
          );
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'text/html; charset=utf-8');
          const fixedResponse = new Response(injected, {
            status: response.status,
            statusText: response.statusText,
            headers
          });
          const copy = fixedResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, copy))
            .catch(() => {});
          return fixedResponse;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(req))
  );
});
