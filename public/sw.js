self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Language Scoop',
      body: event.data ? event.data.text() : '',
    };
  }

  const title = data.title || 'Language Scoop';
  const options = {
    body: data.body || 'Class reminder',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: data.vibrate || [900, 250, 900, 250, 1200, 300, 1200],
    data: { url: data.url || '/' },
    tag: data.tag || 'ls-notification',
    actions: data.actions || [{ action: 'open', title: 'Open' }],
    requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
    renotify: data.renotify !== undefined ? data.renotify : true,
    silent: data.silent === true,
    timestamp: Date.now(),
  };

  event.waitUntil(Promise.all([
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (data.type !== 'class_alarm') return;
      clients.forEach((client) => client.postMessage({
        type: 'class_alarm',
        payload: data,
      }));
    }),
    self.registration.showNotification(title, options).catch((err) => {
      console.error('showNotification options error, falling back to simple options:', err);
      return self.registration.showNotification(title, {
        body: data.body || 'Class reminder',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
    }),
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    if (url.startsWith('http')) {
      if (clients.openWindow) return clients.openWindow(url);
      return;
    }

    for (const c of list) {
      if (c.url.includes(url) && 'focus' in c) return c.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
