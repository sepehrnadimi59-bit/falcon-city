/* مهم: بعد از این نسخه، این فایل را دیگر تغییر نده (نه نسخه، نه نام کش).
   اگر بایت‌های این فایل عوض شود، مرورگر آن را دوباره نصب می‌کند و صفحه‌ی کش‌شده‌ی کاربرها خودکار عوض می‌شود.
   نسخه‌ی اپ فقط با APP_VER داخل index.html و version.json بالا می‌رود. */
const CACHE = 'falcon-city-shell-2';
const PAGE = './index.html';

/* پاسخ‌های ریدایرکت‌شده را نمی‌شود برای صفحه برگرداند (ERR_FAILED)، پس یک کپی تمیز می‌سازیم */
function clean(res) {
  if (!res.redirected) return Promise.resolve(res);
  return res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers }));
}

function isGoodPage(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  return res && res.ok && res.status === 200 && ct.indexOf('text/html') > -1;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => fetch(PAGE, { cache: 'reload' }).then((res) => (isGoodPage(res) ? clean(res).then((r) => c.put(PAGE, r)) : null)))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* فقط خود صفحه‌ی اصلی (آدرس پوشه یا index.html) را از کش می‌دهد؛ نسخه‌ی جدید تا وقتی کاربر
   دکمه‌ی «آپدیت» را نزند نمی‌آید. صفحه‌های دیگر (مثل reset.html) همیشه از اینترنت می‌آیند.
   هر مشکلی پیش بیاید، مستقیم از اینترنت می‌گیرد تا اپ هیچ‌وقت باز نشدنی نشود. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode !== 'navigate') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  if (!(u.pathname.endsWith('/') || u.pathname.endsWith('/index.html'))) return;
  event.respondWith(
    caches.open(CACHE)
      .then((c) =>
        c.match(PAGE, { ignoreSearch: true }).then((hit) => {
          if (hit && hit.ok && !hit.redirected) return hit;
          return fetch(req).then((res) => {
            if (isGoodPage(res) && res.type === 'basic' && !res.redirected) c.put(PAGE, res.clone());
            return res;
          });
        })
      )
      .catch(() => fetch(req))
  );
});
