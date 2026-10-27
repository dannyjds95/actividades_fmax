const CACHE_NAME = 'actividades-v3.2.1'; // 👈 Incrementa este número en cada despliegue (ej: v3.2.2)

const urlsToCache = [
  '/actividades_fmax/',
  '/actividades_fmax/index.html',
  '/actividades_fmax/manifest.json',
  '/actividades_fmax/image/logo.png'
];

// 1. Instalación e intercambio inmediato
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// 2. Activación: ELIMINA CACHÉS ANTIGUAS automáticamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Eliminando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia Network-First (No guarda en caché llamadas API)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones a la API para asegurar datos en tiempo real de la base de datos
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Actualizar la caché con la versión más reciente recibida del servidor
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});