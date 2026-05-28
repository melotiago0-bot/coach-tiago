const CACHE = 'ct-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // API Railway: network-first, cache fallback para mostrar dados offline
  if (e.request.url.includes('railway.app')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          return cached || Response.error();
        })
    );
    return;
  }

  // App shell: passa directamente ao browser (igual ao comportamento original)
});
