const CACHE_NAME = 'static-cache-v4';
const STATIC_ASSETS = [
    '/placeholder2.html',
    
    '/iconLarge_1.png',
    '/iconLarge_2.png',
    '/iconLarge_3.png',
    '/token.gif',
    // '/MrF.gif',
    '/NXRX.gif',
    // '/penguin.gif',
    // '/cat.gif',
    '/beatles.gif',
    // '/eben.jpg',
    '/soccer.jpg',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
   
    // ... other static assets
];


self.addEventListener('install', (event) => {
    self.skipWaiting();  // Add this line
    event.waitUntil(

        caches.open(CACHE_NAME).then(cache => {
            STATIC_ASSETS.forEach(asset => {
                cache.add(asset).catch(error => {
                    console.error(`Failed to cache asset: ${asset}`, error);
                });
            });
        })
    );
});













self.addEventListener('fetch', (event) => {
    console.log('Service Worker activated!');
});

self.addEventListener('fetch', (event) => {
    
    const dynamicPaths = ['/base', '/detail', '/edit', '/move', '/new'];

    if (dynamicPaths.some(path => event.request.url.includes(path))) {
        // Use Network Only strategy for dynamic content
    //     event.respondWith(fetch(event.request));
    // } else {
        // Use Cache First strategy for static assets
        event.respondWith(

            fetch(event.request).catch(() => {
                // Return placeholder.html if the app is offline and the request is for the homepage
                if (event.request.url.includes('/')) {
                    return caches.match('/placeholder2.html');
                }

            // caches.match(event.request).then((response) => {
            //     return response || fetch(event.request).then((fetchResponse) => {
            //         return caches.open(CACHE_NAME).then((cache) => {
            //             cache.put(event.request, fetchResponse.clone());
            //             return fetchResponse;
                    })
                );
            } else {
                // Use Cache First strategy for static assets
                event.respondWith(
                    caches.match(event.request).then((response) => {
                        return response || fetch(event.request).then((fetchResponse) => {
                            return caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, fetchResponse.clone());
                                return fetchResponse;
                            });
                        });
                    })
                );
            }
        });
    
    
    