/* ═══════════════════════════════════════════════════════════════
   Service Worker — غلاف تطبيق «سجل الموظفين»
   • يخزّن «هيكل» التطبيق (الصفحة، الأيقونات، manifest) ليفتح فوراً
     ويعرض شاشة «لا يوجد اتصال» بدل صفحة خطأ المتصفح.
   • لا يخزّن بيانات الموظفين أبداً: البيانات تأتي مباشرة من Google
     داخل الإطار (iframe) وهي خارج نطاق هذا الـ Service Worker.
   عند تعديل أي ملف في الغلاف: غيّر رقم الإصدار VERSION ليتحدّث عند المستخدمين.
   ═══════════════════════════════════════════════════════════════ */
const VERSION = 'v5';
const CACHE = 'karmendan-shell-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

// التثبيت: تخزين ملفات الهيكل
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// التفعيل: حذف نسخ الذاكرة القديمة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('karmendan-shell-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Google وغيره: بلا تدخل

  // فتح الصفحة: من الشبكة أولاً (لأحدث نسخة)، ومن الذاكرة عند انقطاع الإنترنت
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // الأيقونات وmanifest: من الذاكرة فوراً، مع تحديثها في الخلفية
  event.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
