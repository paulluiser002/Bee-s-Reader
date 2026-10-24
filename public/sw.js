/* Only static offline/help assets are cached. Personal data stays in browser storage. */
const OFFLINE_CACHE = 'bees-reader-offline-v1';
const OFFLINE_ASSETS = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith('bees-reader-offline-') && key !== OFFLINE_CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    OFFLINE_ASSETS.includes(url.pathname) &&
    !url.search
  ) {
    event.respondWith(caches.match(url.pathname).then((cached) => cached || fetch(request)));
    return;
  }
  // Never intercept provider APIs, page images, cross-origin requests, or RSC fetches.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    request.mode !== 'navigate'
  )
    return;
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match('/offline.html');
      return (
        cached ||
        new Response('You are offline. Reconnect to read chapters.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        })
      );
    }),
  );
});
