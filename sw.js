// Service worker: permite abrir o app sem internet.
// - Arquivos do app: rede primeiro (atualizações aparecem logo), cache se offline.
// - Catena Aurea (data/catena): cache primeiro (dados estáticos).
// - Tailwind e Google Fonts: cache e atualização em segundo plano.
// - Imagens (santos): cache primeiro, até 80 imagens.
// - APIs (liturgia, Evangelizo, Wikipedia): não interceptadas; o app já guarda as respostas no localStorage.

const VERSAO = 'v2';
const CACHE_APP = `app-${VERSAO}`;
const CACHE_DADOS = `dados-${VERSAO}`;
const CACHE_IMAGENS = `imagens-${VERSAO}`;
const MAX_IMAGENS = 80;

const ARQUIVOS_APP = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/apiService.js',
  'js/catenaService.js',
  'js/salvosService.js',
  'js/uiService.js',
  'js/adapters/liturgiaApi.js',
  'js/adapters/evangelizo.js',
  'js/adapters/wikipedia.js',
  'js/adapters/catenaPt.js',
  'js/utils/books.js',
  'js/utils/cor.js',
  'js/utils/date.js',
  'js/utils/sanitize.js',
  'js/views/liturgia.js',
  'js/views/santo.js',
  'js/views/reflexao.js',
  'js/views/catena.js',
  'js/views/salvos.js',
  'assets/default-saint.jpg',
];

const CDNS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_APP).then((c) => c.addAll(ARQUIVOS_APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  const atuais = [CACHE_APP, CACHE_DADOS, CACHE_IMAGENS];
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => !atuais.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (url.pathname.includes('/data/catena/')) e.respondWith(cachePrimeiro(req, CACHE_DADOS));
    else e.respondWith(redePrimeiro(req));
  } else if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/catena-aurea/')) {
    // Catena em português (~1–2 MB por Evangelho): cache, atualizando em segundo plano
    e.respondWith(atualizarEmSegundoPlano(req, CACHE_DADOS));
  } else if (CDNS.includes(url.hostname)) {
    e.respondWith(atualizarEmSegundoPlano(req));
  } else if (req.destination === 'image') {
    e.respondWith(cachePrimeiro(req, CACHE_IMAGENS, MAX_IMAGENS));
  }
  // Demais requisições (APIs) seguem direto para a rede.
});

async function redePrimeiro(req) {
  const cache = await caches.open(CACHE_APP);
  try {
    const resp = await fetch(req);
    if (resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch {
    const salvo = await cache.match(req, { ignoreSearch: true });
    if (salvo) return salvo;
    if (req.mode === 'navigate') return cache.match('index.html');
    throw new Error('Offline e sem cópia em cache');
  }
}

async function cachePrimeiro(req, nomeCache, limite) {
  const cache = await caches.open(nomeCache);
  const salvo = await cache.match(req);
  if (salvo) return salvo;
  const resp = await fetch(req);
  // Imagens de outros domínios vêm "opacas" (status 0); também podem ser guardadas.
  if (resp.ok || resp.type === 'opaque') {
    await cache.put(req, resp.clone());
    if (limite) aparar(cache, limite);
  }
  return resp;
}

async function atualizarEmSegundoPlano(req, nomeCache = CACHE_APP) {
  const cache = await caches.open(nomeCache);
  const salvo = await cache.match(req);
  const rede = fetch(req)
    .then((resp) => { if (resp.ok || resp.type === 'opaque') cache.put(req, resp.clone()); return resp; })
    .catch(() => salvo);
  return salvo ?? rede;
}

async function aparar(cache, limite) {
  const chaves = await cache.keys();
  for (const k of chaves.slice(0, Math.max(0, chaves.length - limite))) await cache.delete(k);
}
