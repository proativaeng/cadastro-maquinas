// Service worker: guarda o app (e as bibliotecas da CDN) para abrir sem internet.
// As chamadas ao Microsoft Graph e ao login nunca passam pelo cache.
const CACHE = 'maquinas-v1';
const CORE = ['./', 'index.html', 'styles.css', 'config.js', 'data.js', 'pdf.js', 'app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo-h.png', 'icons/logo-v.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('maquinas-v') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (/graph\.microsoft\.com|login\.microsoftonline\.com|sharepoint\.com/.test(url.host)) return;
  // App: rede primeiro (pega atualizações), cache se offline. CDN/fontes: cache primeiro.
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin) {
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r;
    })));
  }
});
