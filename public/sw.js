/* M/S M.S. Traders POS — Service Worker for PWA (Offline & Fast Caching) */
const CACHE_NAME = 'mst-pos-v20261011_v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css?v=20261011_final_v7',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/js/core.js?v=20261011_final_v7',
  '/js/i18n.js?v=20261011_final_v7',
  '/js/auth.js?v=20261011_final_v7',
  '/js/router.js?v=20261011_final_v7',
  '/js/boot.js?v=20261011_final_v7',
  '/js/print.js?v=20261011_final_v7',
  '/js/views/dashboard.js?v=20261011_final_v7',
  '/js/views/products.js?v=20261011_final_v7',
  '/js/views/stock.js?v=20261011_final_v7',
  '/js/views/pos.js?v=20261011_final_v7',
  '/js/views/invoices.js?v=20261011_final_v7',
  '/js/views/customers.js?v=20261011_final_v7',
  '/js/views/expenses.js?v=20261011_final_v7',
  '/js/views/settings.js?v=20261011_final_v7'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // API calls: Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(JSON.stringify({
          ok: false,
          offline: true,
          error: 'আপনি বর্তমানে অফলাইনে আছেন। ইন্টারনেট কানেকশন পেলে পুনরায় চেষ্টা করুন।'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      })
    );
    return;
  }

  // Static assets & navigation: Stale-While-Revalidate / Cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      }).catch(() => {
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
      return cached || fetchPromise;
    })
  );
});
