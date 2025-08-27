// Advanced Service Worker with comprehensive caching and offline support
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { BackgroundSync } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache and route setup
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Skip waiting for faster updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline actions
const bgSync = new BackgroundSync('offline-actions', {
  maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
});

// Cache strategies for different resource types

// 1. Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
        purgeOnQuotaError: true
      })
    ]
  })
);

// 2. Cache images with cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true
      })
    ]
  })
);

// 3. Cache fonts with cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        purgeOnQuotaError: true
      })
    ]
  })
);

// 4. Cache CSS and JS with stale-while-revalidate
registerRoute(
  ({ request }) => 
    request.destination === 'style' || 
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// 5. Cache HTML pages with network-first
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
        purgeOnQuotaError: true
      })
    ]
  })
);

// 6. Cache external resources
registerRoute(
  ({ url }) => url.origin !== self.location.origin,
  new StaleWhileRevalidate({
    cacheName: 'external-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
        purgeOnQuotaError: true
      })
    ]
  })
);

// Custom fetch handler for offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Handle POST requests for background sync
  if (request.method === 'POST') {
    event.respondWith(
      fetch(request).catch(async () => {
        // Add to background sync queue
        await bgSync.replay();
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Request queued for retry when online' 
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }
  
  // Handle navigation requests with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open('pages');
        const offlinePage = await cache.match('/offline');
        return offlinePage || new Response('Offline', { status: 503 });
      })
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: 'Default notification body',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/icons/action-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/action-close.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.body || options.body;
      options.title = payload.title || 'PWA Notification';
      options.data = { ...options.data, ...payload.data };
    } catch (error) {
      console.error('Error parsing push notification payload:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title || 'PWA Notification', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  
  if (action === 'close') {
    return;
  }
  
  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (clients.openWindow) {
        const url = action === 'explore' ? '/explore' : '/';
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Perform background synchronization
  try {
    const cache = await caches.open('offline-actions');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.log('Background sync failed for request:', request.url);
      }
    }
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(doPeriodicSync());
  }
});

async function doPeriodicSync() {
  // Perform periodic content synchronization
  try {
    // Fetch latest content
    const response = await fetch('/api/sync');
    if (response.ok) {
      const data = await response.json();
      
      // Update cached content
      const cache = await caches.open('api-cache');
      await cache.put('/api/content', new Response(JSON.stringify(data)));
      
      // Notify clients about update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'CONTENT_UPDATED',
          data: data
        });
      });
    }
  } catch (error) {
    console.error('Periodic sync error:', error);
  }
}

// Share target handling
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/share/' && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  const formData = await request.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';
  const files = formData.getAll('files');
  
  // Process shared content
  const shareData = {
    title,
    text,
    url,
    files: files.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size
    }))
  };
  
  // Store shared data in cache for the app to retrieve
  const cache = await caches.open('shared-content');
  const shareId = Date.now().toString();
  await cache.put(
    `/shared/${shareId}`,
    new Response(JSON.stringify(shareData))
  );
  
  // Redirect to app with share ID
  return Response.redirect(`/?shared=${shareId}`, 302);
}

// File handling
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/open/' && event.request.method === 'POST') {
    event.respondWith(handleFileOpen(event.request));
  }
});

async function handleFileOpen(request) {
  const formData = await request.formData();
  const files = formData.getAll('files');
  
  // Process opened files
  const fileData = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      content: await file.text()
    }))
  );
  
  // Store file data for the app to retrieve
  const cache = await caches.open('opened-files');
  const fileId = Date.now().toString();
  await cache.put(
    `/files/${fileId}`,
    new Response(JSON.stringify(fileData))
  );
  
  // Redirect to app with file ID
  return Response.redirect(`/?file=${fileId}`, 302);
}

// Update check
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    const registration = await self.registration.update();
    if (registration.waiting) {
      // New version available
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE'
        });
      });
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Installation and activation
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  // Pre-cache critical resources
  event.waitUntil(
    caches.open('critical-v1').then(cache => {
      return cache.addAll([
        '/',
        '/offline',
        '/icons/icon-192x192.png',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.includes('old-') || cacheName.includes('temp-')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients
  self.clients.claim();
});