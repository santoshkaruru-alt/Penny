// Penny service worker: offline app shell, cached OCR engine, Android share target.
const VERSION = 'penny-v1';
const SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/store.js',
  'js/parser.js',
  'js/categories.js',
  'js/ocr.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];
const OCR_CACHE = 'penny-ocr-v1'; // large files, kept across app updates
const INBOX = 'penny-share-inbox';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([VERSION, OCR_CACHE, INBOX]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // Web Share Target: screenshots shared from the Android share sheet.
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith((async () => {
      const form = await event.request.formData();
      const cache = await caches.open(INBOX);
      let i = 0;
      for (const file of form.getAll('screenshots')) {
        if (!(file instanceof File)) continue;
        i += 1;
        await cache.put(new Request(`share/${Date.now()}-${i}-${encodeURIComponent(file.name || 'shot.png')}`), new Response(file, { headers: { 'content-type': file.type || 'image/png' } }));
      }
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }
  if (event.request.method !== 'GET') return;

  // OCR engine + language data: cache first (they never change for a given path).
  if (url.pathname.includes('/vendor/')) {
    event.respondWith((async () => {
      const cache = await caches.open(OCR_CACHE);
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const res = await fetch(event.request);
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    })());
    return;
  }

  // App shell: network first so updates land quickly, cache as fallback offline.
  event.respondWith((async () => {
    try {
      const res = await fetch(event.request);
      if (res.ok) (await caches.open(VERSION)).put(event.request, res.clone());
      return res;
    } catch {
      const cache = await caches.open(VERSION);
      return (await cache.match(event.request, { ignoreSearch: true })) || (await cache.match('index.html'));
    }
  })());
});
