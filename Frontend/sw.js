const CACHE_NAME = "eventopia-static-v13";
const APP_SHELL = [
    "/",
    "/login.html",
    "/login.css",
    "/login.js",
    "/clg_dashboard.html",
    "/clg_dashboard.css",
    "/clg_dashboard.js",
    "/club_dashboard.html",
    "/club_dashboard.css",
    "/club_dashboard.js",
    "/student_dashboard.html",
    "/student_dashboard.css",
    "/student_dashboard.js",
    "/pwa.js",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== "GET") return;

    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
                        return networkResponse;
                    }

                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    return networkResponse;
                })
                .catch(() => caches.match("/login.html"));
        })
    );
});
