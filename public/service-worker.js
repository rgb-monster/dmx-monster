const OFFLINE_URL = "offline.html";

self.addEventListener("install", event => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();

    event.waitUntil(
        (async () => {
            const cache = await caches.open("offline");
            // Setting {cache: 'reload'} in the new request will ensure that the response
            // isn't fulfilled from the HTTP cache; i.e., it will be from the network.
            await cache.add(new Request(OFFLINE_URL, {cache: "reload"}));
        })()
    );
});

self.addEventListener("activate", event => {
    // chrome currently kicks the tires on the app by forcing offline and then checking if it returns a response
    // that then explodes in the navigationPreload with an exception, which, even though captured, still logs an error
    // disabled preload until chrome sorts it out.
    /*
    event.waitUntil(
        (async () => {
            // Enable navigation preload if it's supported.
            // See https://developers.google.com/web/updates/2017/02/navigation-preload
            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }
        })()
    );

    */

    // Tell the active service worker to take control of the page immediately.
    event.waitUntil(self.clients.claim());
});

function* extractURLs(obj) {
    if (!obj) {
        return;
    } else if (typeof obj == "string") {
        if (obj.startsWith("https://") && (obj.includes("storage.googleapis.com") || obj.includes(location.origin))) {
            yield obj;
        }
    } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            yield* extractURLs(obj[i]);
        }
    } else if (typeof obj == "object") {
        yield* extractURLs(Object.values(obj));
    }
}

// If no fetch handlers call event.respondWith(), the request will be handled by the browser as if there
// were no service worker involvement.
self.addEventListener("fetch", event => {
    if (event.request.method != "GET") {
        // only look at get requests
        return;
    }

    let requestURL = event.request.url;
    let path = new URL(requestURL).pathname;

    if (requestURL.startsWith("https://fonts.gstatic.com/")) {
        (async () => {
            let cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                // console.log("found in cache:", requestURL);
                return cachedResponse;
            }

            let res = await fetch(event.request);
            if ((res.status + "").startsWith("2")) {
                let cache = await caches.open("fonts");
                cache.put(event.request.url, res.clone());
            }
            return res;
        })();
    } else if (event.request.mode == "navigate") {
        // We only want to call event.respondWith() if this is a navigation request
        // for an HTML page.
        event.respondWith(
            (async () => {
                try {
                    // try preload
                    let preloadResponse = await event.preloadResponse;
                    if (preloadResponse) {
                        return preloadResponse;
                    }

                    // then network
                    return await fetch(event.request);
                } catch (error) {
                    // fallback to offline
                    console.info(error);

                    // catch is only triggered if an exception is thrown, which is likely
                    // due to a network error.
                    // If fetch() returns a valid HTTP response with a response code in
                    // the 4xx or 5xx range, the catch() will NOT be called.
                    let cache = await caches.open("offline");
                    return await cache.match(OFFLINE_URL);
                }
            })()
        );
    }
});
