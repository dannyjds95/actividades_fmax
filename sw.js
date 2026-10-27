const CACHE_NAME = 'actividades-v3.1';
const urlsToCache = [
  '/actividades_fmax/',
  '/actividades_fmax/index.html',
  '/actividades_fmax/manifest.json',
  '/actividades_fmax/image/logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});