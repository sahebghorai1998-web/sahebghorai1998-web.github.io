const CACHE_NAME = 'skb-billing-v20260814-3';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', event => {
  // Install the new worker immediately so an older worker cannot keep serving
  // the previous billing UI.
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

  // HTML/navigation must always come from the network first. This prevents
  // an older index.html from making a button execute an obsolete handler
  // such as addItem() instead of showSaved().
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, copy))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // For assets, use the network when available and keep a fresh copy for
  // offline use. Failed requests fall back to the current cache.
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
