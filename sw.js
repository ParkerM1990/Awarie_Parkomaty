const CACHE='cpg-inkasacja-brandbook-20260915-v3-logo-inline';
const CORE=['./','./index.html','./styles.css','./terminals-data.js','./ms365-config.js','./m365.js','./google-config.js','./google-cloud.js','./app.js','./route50.js','./hide-fill.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
