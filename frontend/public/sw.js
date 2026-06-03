self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  const requestUrl = new URL(e.request.url);

  // External map tiles and media must bypass the service worker. Proxying them
  // through fetch here can turn normal third-party tile requests into CORS
  // failures in production.
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(async () => {
      if (e.request.mode === 'navigate') {
        const cachedIndex = await caches.match('/index.html');
        return cachedIndex || new Response('', { status: 503, statusText: 'Offline' });
      }
      return Response.error();
    }),
  );
});
