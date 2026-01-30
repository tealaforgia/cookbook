const CACHE_NAME = 'SERVICE_WORKER_CACHE_NAME';
const BASE_URL = self.location.origin;
const DYNAMIC_CACHE_EXTENSIONS = /\.(jpg|png|svg|avif|css|js|woff2)$/i;

const BASE_ASSETS = [
    '/offline/',
    '/assets/stylesheets/fonts.css',
    '/manifest.json',
    '/sitemap.xml'
];

const isSameOrigin = (url) => {
    try {
        const urlObj = new URL(url, BASE_URL);
        return urlObj.origin === BASE_URL;
    } catch (e) {
        return false;
    }
};

const safeCache = async (cache, req) => {
    const targetUrl = req instanceof Request ? req.url : req;
    if (!isSameOrigin(targetUrl)) {
        return;
    }
    try {
        const response = await fetch(req);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        await cache.put(req, response);
    } catch (error) {
        console.warn(`[SW] Failed to cache: ${req} - ${error.message}`);
        return error; 
    }
};

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    self.skipWaiting();
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(BASE_ASSETS.map(url => safeCache(cache, url)));
        try {
            const sitemapReq = new Request(`${BASE_URL}/sitemap.xml`);
            const sitemapRes = await fetch(sitemapReq);
            const sitemapText = await sitemapRes.text();
            const pageUrls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)]
                .map(m => m[1])
                .filter(url => isSameOrigin(url));
            await Promise.allSettled(pageUrls.map(url => safeCache(cache, url)));
        } catch (e) {
            console.error('[SW] Error processing sitemap:', e);
        }
        try {
            const fontCssUrl = `${BASE_URL}/assets/stylesheets/fonts.css`;
            const cssRes = await fetch(fontCssUrl);
            if (cssRes.ok) {
                const cssText = await cssRes.text();
                const urlRegex = /url\s*\((?:['"]?)(.*?)(?:['"]?)\)/g;
                const fontUrls = [];
                let match;
                while ((match = urlRegex.exec(cssText)) !== null) {
                    let relativePath = match[1];
                    if (relativePath.startsWith('data:')) continue;
                    const absoluteFontUrl = new URL(relativePath, fontCssUrl).href;
                    if (isSameOrigin(absoluteFontUrl)) {
                        fontUrls.push(absoluteFontUrl);
                    }
                }
                await Promise.allSettled(fontUrls.map(url => safeCache(cache, url)));
            }
        } catch (e) {
            console.error('[SW] Error processing fonts.css:', e);
        }
        console.log('[SW] Installation complete.');
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_ALREADY_LOADED') {
        const resources = event.data.payload;
        event.waitUntil((async () => {
            const cache = await caches.open(CACHE_NAME);
            const promises = resources.map(url => {
                const urlObj = new URL(url, BASE_URL);
                if (!DYNAMIC_CACHE_EXTENSIONS.test(urlObj.pathname)) {
                    return Promise.resolve();
                }
                return safeCache(cache, url);
            });
            await Promise.allSettled(promises);
        })());
    }
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== BASE_URL) {
        return; 
    }
    event.respondWith((async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }
        try {
            const networkResponse = await fetch(event.request);
            if (
                url.origin === BASE_URL && 
                DYNAMIC_CACHE_EXTENSIONS.test(url.pathname) && 
                networkResponse.status === 200
            ) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
        } catch (error) {
            if (event.request.mode === 'navigate') {
                const offlinePage = await caches.match('/offline/');
                if (offlinePage) return offlinePage;
            }
            throw error;
        }
    })());
});