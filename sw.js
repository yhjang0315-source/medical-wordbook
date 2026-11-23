// 오프라인에서도 열리도록 한 번 받은 파일을 보관한다.
// 페이지는 새 것을 먼저 받고(안 되면 보관본), 모델·사진·글꼴 같은 나머지는 보관본을 먼저 쓰고 뒤에서 새로 받는다.
const CACHE = 'medwords-v3';
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  const keep = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(keep).catch(() => hit);
    return hit || net;
  }));
});
