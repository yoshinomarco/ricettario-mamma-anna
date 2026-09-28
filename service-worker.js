"use strict";

const CACHE_VERSION = "mamma-anna-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./font.ttf",
  "./logo.png",
  "./copertina-mamma-anna.jpg",
  "./ricettario_ricategorizzato.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  /*
   * Per pagine HTML e file JSON utilizza prima Internet.
   * Se la connessione non è disponibile, usa la copia salvata.
   */
  if (
    event.request.mode === "navigate" ||
    requestUrl.pathname.endsWith(".json")
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseCopy = response.clone();

          caches
            .open(CACHE_VERSION)
            .then(cache => cache.put(event.request, responseCopy));

          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cachedResponse => {
            return cachedResponse || caches.match("./index.html");
          })
        )
    );

    return;
  }

  /*
   * Per immagini, font e altri file statici utilizza prima
   * la cache e, se il file non è presente, lo scarica.
   */
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseCopy = response.clone();

        caches
          .open(CACHE_VERSION)
          .then(cache => cache.put(event.request, responseCopy));

        return response;
      });
    })
  );
});