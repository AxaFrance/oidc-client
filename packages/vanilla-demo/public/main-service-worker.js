console.log('my worker registered');

self.addEventListener('fetch', (e) => {
  console.log('fetch', e.request.url);
});

importScripts('OidcServiceWorker.js');
