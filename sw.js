/**
 * Service Worker for Lua Quest PWA
 * 离线缓存、后台同步、推送通知
 */

const CACHE_NAME = 'luaquest-v1.0.1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/state.js',
    '/fengari-wrapper.js',
    '/ui.js',
    '/storage.js',
    '/modals.js',
    '/gamejam.js',
    '/skills.js',
    '/chapters/index.js',
    '/manifest.json',
    '/favicon.svg',
    '/vendor/fengari-bundle.js',
];

// 需要网络优先的资源
const NETWORK_FIRST = [
    '/api/', // 如果有后端 API
];

// 缓存策略：Stale While Revalidate
const STALE_WHILE_REVALIDATE = [
    'https://cdn.jsdelivr.net/',
];

// ============================================================================
// Install: 预缓存静态资源
// ============================================================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })));
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[SW] Cache install failed:', error);
            })
    );
});

// ============================================================================
// Activate: 清理旧缓存
// ============================================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ============================================================================
// Fetch: 缓存策略
// ============================================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 只处理 GET 请求
    if (request.method !== 'GET') return;
    
    // 跳过非 http(s) 请求
    if (!url.protocol.startsWith('http')) return;
    
    // 策略选择
    if (isStaticAsset(url)) {
        // 静态资源：Cache First
        event.respondWith(cacheFirst(request));
    } else if (isNetworkFirst(url)) {
        // API 请求：Network First
        event.respondWith(networkFirst(request));
    } else if (isStaleWhileRevalidate(url)) {
        // CDN 资源：Stale While Revalidate
        event.respondWith(staleWhileRevalidate(request));
    } else {
        // 其他：Network First 降级到 Cache
        event.respondWith(networkFirst(request));
    }
});

function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => {
        if (asset.startsWith('http')) return url.href === asset;
        return url.pathname === asset || url.pathname.endsWith(asset);
    });
}

function isNetworkFirst(url) {
    return NETWORK_FIRST.some(pattern => url.pathname.startsWith(pattern));
}

function isStaleWhileRevalidate(url) {
    return STALE_WHILE_REVALIDATE.some(pattern => url.href.startsWith(pattern));
}

// Cache First 策略
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Network First 策略
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Stale While Revalidate 策略
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => cached);
    
    return cached || fetchPromise;
}

// ============================================================================
// Background Sync: 离线数据同步
// ============================================================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'save-game') {
        event.waitUntil(syncGameSave());
    } else if (event.tag === 'submit-jam') {
        event.waitUntil(syncJamSubmission());
    }
});

async function syncGameSave() {
    // 从 IndexedDB 读取待同步的存档
    // 发送到服务器（如果有后端）
    console.log('[SW] Background sync: save game');
}

async function syncJamSubmission() {
    console.log('[SW] Background sync: submit jam');
}

// ============================================================================
// Push Notifications: 推送通知
// ============================================================================
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'Lua Quest 有新消息',
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            { action: 'open', title: '打开游戏' },
            { action: 'dismiss', title: '稍后' },
        ],
        requireInteraction: true,
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Lua Quest', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // 如果已有窗口打开，聚焦它
                    for (const client of clientList) {
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // 否则打开新窗口
                    return clients.openWindow('/');
                })
        );
    }
});

// ============================================================================
// Message: 与主线程通信
// ============================================================================
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    } else if (event.data === 'getVersion') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    } else if (event.data === 'clearCache') {
        caches.keys().then(names => 
            Promise.all(names.map(name => caches.delete(name)))
        ).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// ============================================================================
// Periodic Background Sync (如果支持)
// ============================================================================
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-jam') {
        event.waitUntil(checkJamSchedule());
    }
});

async function checkJamSchedule() {
    // 定期检查 Game Jam 状态
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'jam-schedule-check' });
    });
}

console.log('[SW] Service Worker loaded:', CACHE_NAME);