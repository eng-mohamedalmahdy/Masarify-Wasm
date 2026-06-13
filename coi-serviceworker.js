// Cross-Origin Isolation service worker.
// Intercepts every same-origin GET response and adds the headers required for
// SharedArrayBuffer / OPFS on hosts (e.g. GitHub Pages) that don't serve them.
// On first install the page reloads automatically so isolation takes effect.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    event.respondWith(
        fetch(request)
            .then((response) => {
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
            })
            .catch(() => fetch(request))
    );
});
