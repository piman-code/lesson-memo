// 오프라인용 서비스 워커. 앱 파일을 바꾸면 VERSION을 올린다.
const VERSION = 'v1';
const APP_CACHE = 'lesson-memo-app-' + VERSION;
const FONT_CACHE = 'lesson-memo-fonts';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('lesson-memo-app-') && k !== APP_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 웹폰트: 한 번 받으면 캐시에서 (실패해도 앱은 시스템 세리프로 동작)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) => cache.match(req).then((hit) => hit || fetch(req).then((res) => {
        cache.put(req, res.clone());
        return res;
      }).catch(() => new Response('', { status: 503 }))))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 앱 파일: 캐시를 먼저 보여 주고, 뒤에서 새 버전을 받아 둔다
  event.respondWith(
    caches.open(APP_CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => hit || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error()));
        return hit || fresh;
      })
    )
  );
});
