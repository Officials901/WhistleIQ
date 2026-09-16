// Whistle IQ -- offline service worker.
// Bump CACHE_NAME whenever the app is updated so old caches get cleared out.
var CACHE_NAME = 'whistle-iq-v105';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './logo-header.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){ return cache.addAll(APP_SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// Stale-while-revalidate: serve instantly from cache when available (this is
// what makes the app open offline), while quietly re-fetching in the
// background so the cache stays fresh for next time. Falls back to the
// cached app shell for a navigation request when there's no network at all.
self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(function(cached){
      var networkFetch = fetch(req).then(function(response){
        if(response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return response;
      }).catch(function(){
        if(cached) return cached;
        if(req.mode === 'navigate') return caches.match('./index.html');
        return undefined;
      });
      return cached || networkFetch;
    })
  );
});
