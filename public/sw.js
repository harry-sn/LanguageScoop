self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Language Scoop 🔔', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Language Scoop 🔔';
  const options = {
    body: data.body || 'Class reminder',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [500, 250, 500, 250, 500, 250, 1000],
    data: { url: data.url || '/' },
    tag: data.tag || 'ls-notification',
    actions: data.actions || [{ action: 'open', title: 'Open Meeting 🚀' }],
    requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.includes(url) && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
