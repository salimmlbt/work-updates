// This is a basic service worker file.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // No caching logic for now, just lifecycle events.
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
});

self.addEventListener('fetch', (event) => {
  // This service worker doesn't intercept fetch requests for now.
  // It's here primarily to make the app installable.
  event.respondWith(fetch(event.request));
});
