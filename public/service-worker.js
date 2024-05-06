const CACHE_NAME = 'static-cache-v17';
const STATIC_ASSETS = [
    '/placeholder2.html',
    '/iconLarge_1.png',
    '/iconLarge_2.png',
    '/iconLarge_3.png',
    
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    // ... other static assets
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated!');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Define a list of paths that should always be network-first
    const networkFirstPaths = ['/detail', '/base', '/edit', '/new', 'login'];

    // Check if the request URL matches any of the network-first paths
    const isNetworkFirstPath = networkFirstPaths.some(path => event.request.url.includes(path));

    if (event.request.method === 'GET') {
        if (isNetworkFirstPath) {
            // For dynamic content, use Network First strategy
            event.respondWith(
                fetch(event.request).catch(() => {
                    return caches.match(event.request);
                })
            );
        } else {
            // For static assets, use Cache First strategy
            event.respondWith(
                caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(event.request).then(fetchResponse => {
                        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                            return fetchResponse;
                        }

                        const responseToCache = fetchResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                        return fetchResponse;
                    });
                })
            );
        }
    } else {
        // For non-GET requests, don't use the cache
        event.respondWith(fetch(event.request));
    }
});
