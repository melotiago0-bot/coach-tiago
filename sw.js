// SW_VERSION: 2026-10-16b — bump para forçar atualização no cliente
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('railway.app') || e.request.url.includes('onrender.com')) return;
  e.respondWith(fetch(e.request));
});
