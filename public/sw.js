// COMPRIMEME Service Worker v2
// v2: no cachear el HTML (solo assets estáticos con hash) para evitar errores tras actualizar.
const CACHE_NAME = "comprimeme-v2";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

// Install: cache solo assets estáticos (NUNCA el HTML "/", que cambia en cada deploy)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: borrar TODAS las cachés viejas y tomar control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch:
// - Navegación (HTML): SIEMPRE red, nunca caché (para no servir versiones viejas).
// - Assets estáticos (_next/static, con hash): red primero, caché como fallback.
// - Otros: red normal.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Solo GET y mismo origen
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Navegación (petición del HTML): red directa, sin tocar caché
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
    return;
  }

  // Assets estáticos con hash: red primero, caché de respaldo (offline)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Resto: red normal
  return;
});
