// ── Yuki Cards — Service Worker ─────────────────────────────────────────────
// Stratégie :
//   - index.html       → réseau en priorité (toujours la dernière version)
//   - autres assets    → cache en priorité (chargement rapide)
// Firebase gère lui-même la file d'attente des modifications offline.

const CACHE_NAME = 'yuki-cards-v8';

const STATIC_ASSETS = [
  './manifest.json',
  './favicon.png',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

// Installation : mise en cache des assets statiques uniquement
// (index.html intentionnellement exclus — servi depuis le réseau)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ne pas intercepter Firebase
  if (url.includes('firebaseio.com') || url.includes('firebasedatabase.app')) return;

  // index.html et racine → réseau en priorité, cache en fallback (offline)
  const isNavigation = event.request.mode === 'navigate' ||
    url.endsWith('index.html') || url.endsWith('/');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Mettre à jour le cache avec la nouvelle version
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)) // Offline : servir le cache
    );
    return;
  }

  // Autres assets → cache en priorité, réseau en fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
