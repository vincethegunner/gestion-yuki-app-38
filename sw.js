// ── Yuki Cards — Service Worker ─────────────────────────────────────────────
// Met l'app en cache lors du premier chargement.
// Permet une utilisation complète hors ligne.
// Firebase gère lui-même la file d'attente des modifications offline.

const CACHE_NAME = 'yuki-cards-v5';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

// Installation : mise en cache de tous les fichiers nécessaires
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
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

// Interception des requêtes : cache en priorité, réseau en fallback
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes Firebase (gérées par le SDK)
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('firebasedatabase.app')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources GET réussies
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // Si réseau indisponible, servir le cache
    })
  );
});
