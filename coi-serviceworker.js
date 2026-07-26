// Cross-Origin Isolation + PWA offline service worker.
// Injects COEP/COOP/CORP headers required for SharedArrayBuffer/OPFS (SQLDelight WASM)
// on hosts like GitHub Pages that don't serve them natively.
// Also caches the app shell for offline use (network-first strategy).

const CACHE_NAME = "masarify-v1";
const PRECACHE_ASSETS = [
    "./",
    "./composeApp.js",
    "./styles.css",
    "./manifest.json",
    "./favicon.svg",
    "./sqlite3.wasm",
    "./sqlite3.js",
];

function withCoiHeaders(response) {
    if (response.status === 0) return response;
    const headers = new Headers(response.headers);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
});

self.addEventListener("activate", (event) =>
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            // Remove old cache versions
            caches.keys().then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
            ),
        ])
    )
);

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                const responseWithHeaders = withCoiHeaders(networkResponse.clone());
                // Cache successful responses (skip opaque cross-origin)
                if (networkResponse.status > 0) {
                    caches.open(CACHE_NAME).then((cache) =>
                        cache.put(request, withCoiHeaders(networkResponse))
                    );
                }
                return responseWithHeaders;
            })
            .catch(() =>
                caches.match(request).then((cached) => cached || fetch(request))
            )
    );
});
