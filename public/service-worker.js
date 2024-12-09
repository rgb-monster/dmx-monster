self.addEventListener("install", event => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
    event.waitUntil(
        (async () => {
            const cache = await caches.open("offline");
            // Setting {cache: 'reload'} in the new request will ensure that the response
            // isn't fulfilled from the HTTP cache; i.e., it will be from the network.
            await cache.add(new Request("monster-192.png", {cache: "reload"}));
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

    event.respondWith(
        (async () => {
            if (requestURL.startsWith("https://fonts.gstatic.com/")) {
                // for fonts we go cache -> network
                let cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    // console.log("found in cache:", requestURL);
                    return cachedResponse;
                }

                let response = await fetch(event.request);
                if (response.ok) {
                    let cache = await caches.open("fonts");
                    cache.put(event.request.url, response.clone());
                }
                return res;
            } else {
                // for everything else we go network -> cache
                let cache = await caches.open("offline");
                try {
                    let response = await fetch(event.request);
                    cache.put(event.request.url, response.clone());
                    return response;
                } catch (error) {
                    let cachedResponse = await caches.match(event.request);
                    if (cachedResponse) {
                        //console.log("found in cache:", requestURL);
                        return cachedResponse;
                    } else {
                        return new Response("", {status: 404});
                    }
                }
            }
        })()
    );
});
