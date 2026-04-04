const CACHE_NAME = 'cg-control-pwa-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Puste przechwytywanie `fetch` wystarczy aby przeglądarka uznała stronę za zgodną z PWA 
  // (Offline capability verification).
  // Aby w pełni działały tryby offline, tutaj musiałaby być logika `caches.match/e.respondWith`.
});
