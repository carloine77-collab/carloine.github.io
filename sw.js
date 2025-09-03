const CACHE_NAME = 'siyu-cache-v1';
// 需要缓存的核心文件列表
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/icon-192x192.png',
  '/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap',
  'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://image.lexica.art/full_jpg/a6a1858c-3081-4a16-a144-f2a83e606117',
  'https://images.pexels.com/photos/931018/pexels-photo-931018.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'https://image.lexica.art/full_jpg/cf5b8015-844c-4a69-aaac-501b8782d475'
];

// 监听 install 事件，在安装时缓存文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// 监听 fetch 事件，拦截网络请求
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有匹配的响应，则直接返回
        if (response) {
          return response;
        }
        // 否则，发起网络请求
        return fetch(event.request);
      })
  );
});
