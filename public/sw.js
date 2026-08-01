// COMPRIMEME Service Worker v3 — MODO DESACTIVACIÓN
// Esta versión se desregistra a sí misma y borra TODAS las cachés.
// Usado para eliminar de raíz los errores causados por SW viejos en dispositivos.
// Después de esto, la app funciona sin service worker (sin PWA offline) hasta reactivarlo.

self.addEventListener("install", (event) => {
  // Borrar todas las cachés inmediatamente
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Borrar todas las cachés
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      // Desregistrar este service worker
      await self.registration.unregister();
      // Tomar control de todos los clientes para que recarguen
      const clients = await self.clients.matchAll();
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
  self.clients.claim();
});

// No interceptar nada (dejar pasar todo a la red)
self.addEventListener("fetch", (event) => {
  return;
});
