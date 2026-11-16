// Naikkan angka versi ini setiap kali index.html diubah agar HP memuat versi terbaru
const VERSI = 'kasir-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST ke GAS selalu langsung ke jaringan
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return; // data jangan di-cache

  // Halaman utama: jaringan dulu, cache jika offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSI).then(c => c.put('/index.html', copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // File lain (ikon, Tailwind, library scanner): cache dulu, perbarui di latar belakang
  e.respondWith(
    caches.match(req).then(cached => {
      const jaringan = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSI).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || jaringan;
    })
  );
});
