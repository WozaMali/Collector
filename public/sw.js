const CACHE_NAME = 'collector-pwa-v3';
const urlsToCache = [
  '/',
  '/dashboard',
  '/collector',
  '/pickups',
  '/analytics',
  '/settings',
  '/manifest.json',
  '/Collector Icon.png',
  '/favicon.png'
];

// Notification permission and registration
const NOTIFICATION_PERMISSION_GRANTED = 'granted';
const NOTIFICATION_PERMISSION_DENIED = 'denied';

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Do not auto-activate here; wait until user confirms update
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept Next static/runtime assets
  if (url.pathname.startsWith('/_next/')) return;

  // Navigation requests: network-first to avoid limbo after unlock
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
          return res;
        })
        .catch(async () => (await caches.match(event.request)) || Response.redirect('/', 302))
    );
    return;
  }

  // Other requests: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkRes) => {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
          return networkRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Activate event - clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from WozaMali Collector',
      icon: '/Collector Icon.png',
      badge: '/favicon.png',
      tag: data.tag || 'wozamali-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/Collector Icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'WozaMali Collector', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      handleBackgroundSync()
    );
  }
});

// Handle background sync tasks
async function handleBackgroundSync() {
  try {
    // Get pending actions from IndexedDB or cache
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      await processPendingAction(action);
    }
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Get pending actions (placeholder - implement based on your needs)
async function getPendingActions() {
  // This would typically read from IndexedDB
  return [];
}

// Process pending action (placeholder - implement based on your needs)
async function processPendingAction(action) {
  // This would typically send data to your API
  console.log('Processing pending action:', action);
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // When app explicitly requests, activate immediately and take control
    self.skipWaiting();
    self.clients.claim();
  }
});
