const CACHE_NAME = 'lumina-v2';
const STATIC_ASSETS = [
  '/',
  '/calendar',
  '/chat',
  '/customize',
  '/gratitude',
  '/habits',
  '/mood',
  '/new',
  '/photos',
  '/prompts',
  '/rewind',
  '/breathe',
  '/search',
  '/settings',
  '/timeline',
  '/manifest.json',
  '/logo.png',
];

// Install: cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP requests (like chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Skip API calls to OpenRouter
  if (url.hostname === 'openrouter.ai') return;

  // For navigation requests (pages): network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }).then((r) => r || caches.match('/')))
    );
    return;
  }

  // For static assets: cache-first with network fallback
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // For everything else: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then(r => r || new Response('', { status: 404 })))
  );
});

// ── Native IndexedDB Helpers for Service Worker ───────────────────

function openLuminaDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lumina');
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
    request.onupgradeneeded = (e) => {
      resolve(e.target.result);
    };
  });
}

function getSetting(db, key) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains('settings')) {
      resolve(null);
      return;
    }
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const index = store.index('key');
    const getReq = index.get(key);
    getReq.onsuccess = () => resolve(getReq.result ? getReq.result.value : null);
    getReq.onerror = () => resolve(null);
  });
}

function setSetting(db, key, value) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains('settings')) {
      resolve();
      return;
    }
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const index = store.index('key');
    const getReq = index.get(key);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing) {
        existing.value = value;
        store.put(existing).onsuccess = () => resolve();
      } else {
        store.add({ key, value }).onsuccess = () => resolve();
      }
    };
    getReq.onerror = () => resolve();
  });
}

function getLastJournalEntry(db) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains('entries')) {
      resolve(null);
      return;
    }
    const tx = db.transaction('entries', 'readonly');
    const store = tx.objectStore('entries');
    const cursorReq = store.openCursor(null, 'prev');
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      resolve(cursor ? cursor.value : null);
    };
    cursorReq.onerror = () => resolve(null);
  });
}

function getRecentHabitCount(db) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains('habits')) {
      resolve(0);
      return;
    }
    const tx = db.transaction('habits', 'readonly');
    const store = tx.objectStore('habits');
    const todayStr = new Date().toISOString().split('T')[0];
    let count = 0;
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const habit = cursor.value;
        const habitDate = new Date(habit.timestamp).toISOString().split('T')[0];
        if (habitDate === todayStr) {
          count++;
        }
        cursor.continue();
      } else {
        resolve(count);
      }
    };
    cursorReq.onerror = () => resolve(0);
  });
}

// ── Handle Push Notifications ─────────────────────────────────────

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      try {
        let isTest = false;
        if (event.data) {
          try {
            const payload = event.data.json();
            isTest = !!payload.test;
          } catch (e) {
            console.log('Push data is not JSON or empty:', e);
          }
        }

        const db = await openLuminaDB();

        // 1. If it's not a test, enforce settings checks
        if (!isTest) {
          const notifEnabled = await getSetting(db, 'push_notifications_enabled');
          if (notifEnabled === 'false') {
            console.log('Push notifications are disabled in settings. Suppressing.');
            return;
          }

          // DND Start & End time checks
          const startTime = await getSetting(db, 'push_start_time') || '09:00';
          const endTime = await getSetting(db, 'push_end_time') || '21:00';

          const now = new Date();
          const currentHours = now.getHours();
          const currentMinutes = now.getMinutes();
          const currentTimeMinutes = currentHours * 60 + currentMinutes;

          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);
          const startTimeMinutes = startH * 60 + startM;
          const endTimeMinutes = endH * 60 + endM;

          let isWithinAllowedHours = false;
          if (startTimeMinutes <= endTimeMinutes) {
            isWithinAllowedHours = (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes);
          } else {
            // Crosses midnight
            isWithinAllowedHours = (currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes);
          }

          if (!isWithinAllowedHours) {
            console.log(`Current time (${currentHours}:${currentMinutes}) falls within DND hours (${startTime}-${endTime}). Suppressing notification.`);
            return;
          }

          // Frequency checks
          const frequencyHours = parseInt(await getSetting(db, 'push_frequency') || '4', 10);
          const lastSentStr = await getSetting(db, 'push_last_sent_timestamp');
          if (lastSentStr) {
            const lastSentTime = parseInt(lastSentStr, 10);
            const hoursSinceLast = (now.getTime() - lastSentTime) / (1000 * 60 * 60);
            const bufferHours = 5 / 60; // 5 minute cron buffer
            if (hoursSinceLast < (frequencyHours - bufferHours)) {
              console.log(`Only ${hoursSinceLast.toFixed(2)} hours since last notification (frequency: ${frequencyHours}h). Suppressing.`);
              return;
            }
          }
        }

        // 2. Generate title & body
        let title = '🌸 LUMINA Check-in';
        let body = 'Take a soft moment to check in with yourself. Your garden is waiting.';

        if (isTest) {
          title = '✨ LUMINA Test Notification';
          body = 'Your push reminders are configured correctly! Tap here to open Lumina. 🌸';
        } else {
          const lastEntry = await getLastJournalEntry(db);
          const habitCount = await getRecentHabitCount(db);
          const now = new Date();

          if (lastEntry && lastEntry.mood <= 2) {
            title = '🌸 How are you feeling now?';
            body = 'In your last entry, you mentioned feeling down. How are you holding up right now?';
          } else if (lastEntry && lastEntry.anxiety >= 4) {
            title = '🌿 Time for a deep breath?';
            body = 'You felt quite anxious in your last entry. Take a quiet minute to pause and check in.';
          } else if (habitCount === 0) {
            title = '🌿 Habit Check-in';
            body = 'Take a moment to log your habits today. Every small step counts!';
          } else {
            const prompts = [
              'How has your day been unfolding since you last wrote? 💭',
              'Your future self will thank you for writing down a memory today. ✨',
              'Would you like to write a quick reflection or track a habit? 🌿',
              'The world gets quieter when we write. Open your journal when you\'re ready. 🌙'
            ];
            const randomIndex = Math.floor((now.getTime() / 1000 / 60 / 60) % prompts.length);
            body = prompts[randomIndex];
          }
        }

        // 3. Show notification
        await self.registration.showNotification(title, {
          body,
          icon: '/logo.png',
          badge: '/icon-192.png',
          tag: 'lumina-reminder',
          data: { url: '/new' }
        });

        // 4. Update last sent timestamp (if not a test)
        if (!isTest) {
          await setSetting(db, 'push_last_sent_timestamp', Date.now().toString());
        }

      } catch (err) {
        console.error('Error executing service worker push listener:', err);
      }
    })()
  );
});

// ── Handle Notification Click ─────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = (event.notification.data && event.notification.data.url) || '/new';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

