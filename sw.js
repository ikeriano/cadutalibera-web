// Service worker: juego disponible sin conexión (PWA). Red primero, caché de respaldo.
const CACHE = 'cadutalibera-v1-0-4';
const BASE = ['./', 'index.html', 'js/app.js', 'js/app_it.js', 'assets/app.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'voz/index.json', 'voz/q/index.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && (u.pathname.includes('/voz/') || BASE.some(b => u.pathname.endsWith(b.replace('./', ''))))) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
});
