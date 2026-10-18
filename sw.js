const CACHE_NAME = 'pengeluaran-cache-v1';
const urlsToCache = [
  './index.html',
  './app.js',
  './manifest.json',
  './asset/logo.png' // <-- Tambahkan baris ini
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});