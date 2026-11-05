// Camada de dados: fetch com timeout, cadeia de fallback por bloco e cache em localStorage.
// A interface só conhece o modelo interno (spec §5.3); cada fonte passa por um adapter.

import { adaptarLiturgiaApi } from './adapters/liturgiaApi.js';
import {
  adaptarLeiturasEvangelizo,
  adaptarSantosEvangelizo,
  adaptarComentarioEvangelizo,
} from './adapters/evangelizo.js';
import { nomeParaBusca, adaptarResumoWikipedia, escolherResultadoBusca } from './adapters/wikipedia.js';
import { hojeISO, partes } from './utils/date.js';

export const URLS = {
  liturgia: 'https://liturgia.up.railway.app/v2/',
  evangelizo: 'https://publication.evangelizo.ws/PT/days/',
  wikiResumo: 'https://pt.wikipedia.org/api/rest_v1/page/summary/',
  wikiBusca: 'https://pt.wikipedia.org/w/api.php',
};

const TIMEOUT_LITURGIA = 8000;
const TIMEOUT_PADRAO = 5000;

// ---------------------------------------------------------------------------
// Erros e fetch
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  /** @param {'timeout'|'rede'|'http'|'formato'} tipo */
  constructor(tipo, mensagem, { status, url } = {}) {
    super(mensagem);
    this.name = 'ApiError';
    this.tipo = tipo;
    this.status = status;
    this.url = url;
  }
}

export async function fetchJSON(url, { timeout = TIMEOUT_PADRAO } = {}) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeout);
  try {
    const resp = await fetch(url, { signal: controle.signal, headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new ApiError('http', `HTTP ${resp.status}`, { status: resp.status, url });
    try {
      return await resp.json();
    } catch {
      throw new ApiError('formato', 'Resposta não é JSON válido', { url });
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') throw new ApiError('timeout', `Tempo esgotado (${timeout / 1000}s)`, { url });
    throw new ApiError('rede', 'Falha de rede', { url });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Cache (localStorage)
// ---------------------------------------------------------------------------

const PREFIXO_CACHE = 'cache:v1:';
const TTL_HOJE_MS = 6 * 60 * 60 * 1000;
const TTL_RESERVA_MS = 30 * 60 * 1000;
const MAX_DATAS = 60;

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // acesso bloqueado (modo privado, políticas do navegador)
  }
}

function chave(data, bloco) {
  return `${PREFIXO_CACHE}${data}:${bloco}`;
}

export function lerCache(data, bloco) {
  const ls = storage();
  if (!ls) return null;
  try {
    const bruto = ls.getItem(chave(data, bloco));
    if (!bruto) return null;
    const entrada = JSON.parse(bruto);
    const idade = Date.now() - entrada.ts;
    // Resultado de fonte reserva: expira logo, para a fonte primária ser tentada de novo.
    if (entrada.reserva && idade > TTL_RESERVA_MS) return null;
    // Datas passadas nunca mudam; hoje e o futuro expiram em 6h.
    if (data >= hojeISO() && idade > TTL_HOJE_MS) return null;
    return entrada;
  } catch {
    return null;
  }
}

export function gravarCache(data, bloco, valor) {
  const ls = storage();
  if (!ls) return;
  const entrada = JSON.stringify({ ts: Date.now(), ...valor });
  try {
    ls.setItem(chave(data, bloco), entrada);
  } catch {
    // Cota estourada: remove metade das datas mais antigas e tenta de novo.
    podarCache(Math.floor(MAX_DATAS / 2));
    try { ls.setItem(chave(data, bloco), entrada); } catch { /* desiste do cache */ }
    return;
  }
  podarCache(MAX_DATAS);
}

/** Mantém no máximo `limite` datas, removendo as acessadas há mais tempo. */
export function podarCache(limite) {
  const ls = storage();
  if (!ls) return;
  const porData = new Map();
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k?.startsWith(PREFIXO_CACHE)) continue;
    const data = k.slice(PREFIXO_CACHE.length).split(':')[0];
    let ts = 0;
    try { ts = JSON.parse(ls.getItem(k)).ts ?? 0; } catch { /* entrada corrompida */ }
    const atual = porData.get(data);
    if (!atual) porData.set(data, { ts, chaves: [k] });
    else { atual.chaves.push(k); atual.ts = Math.max(atual.ts, ts); }
  }
  if (porData.size <= limite) return;
  const antigas = [...porData.values()].sort((a, b) => a.ts - b.ts).slice(0, porData.size - limite);
  for (const { chaves } of antigas) chaves.forEach((k) => ls.removeItem(k));
}

export function limparCache() {
  const ls = storage();
  if (!ls) return;
  const chaves = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k?.startsWith(PREFIXO_CACHE)) chaves.push(k);
  }
  chaves.forEach((k) => ls.removeItem(k));
}

// ---------------------------------------------------------------------------
// Cadeia de fallback
// ---------------------------------------------------------------------------

/**
 * Tenta o cache e depois cada fonte, em ordem. Retorna { dados, fonte, doCache }.
 * Se todas falharem, lança um erro com a lista de tentativas em `tentativas`.
 * @param {Array<{ nome: string, buscar: () => Promise<any> }>} fontes
 */
async function comFallback(data, bloco, fontes) {
  const emCache = lerCache(data, bloco);
  if (emCache) return { dados: emCache.dados, fonte: emCache.fonte, doCache: true };

  const tentativas = [];
  for (const [i, { nome, buscar }] of fontes.entries()) {
    try {
      const dados = await buscar();
      if (dados == null) throw new Error('sem conteúdo');
      gravarCache(data, bloco, { dados, fonte: nome, reserva: i > 0 });
      return { dados, fonte: nome, doCache: false };
    } catch (e) {
      tentativas.push({ fonte: nome, erro: e.message });
    }
  }
  const erro = new Error(`Não foi possível carregar "${bloco}"`);
  erro.bloco = bloco;
  erro.tentativas = tentativas;
  throw erro;
}

// ---------------------------------------------------------------------------
// Fontes individuais
// ---------------------------------------------------------------------------

export async function buscarLiturgiaApi(data) {
  const { dia, mes, ano } = partes(data);
  const json = await fetchJSON(`${URLS.liturgia}?dia=${dia}&mes=${mes}&ano=${ano}`, { timeout: TIMEOUT_LITURGIA });
  return adaptarLiturgiaApi(json);
}

export async function buscarLeiturasEvangelizo(data) {
  const [dia, leituras] = await Promise.all([
    fetchJSON(`${URLS.evangelizo}${data}`),
    fetchJSON(`${URLS.evangelizo}${data}/readings`),
  ]);
  return adaptarLeiturasEvangelizo(dia, leituras);
}

export async function buscarSantoEvangelizo(data) {
  return adaptarSantosEvangelizo(await fetchJSON(`${URLS.evangelizo}${data}/saints`));
}

export async function buscarComentarioEvangelizo(data) {
  return adaptarComentarioEvangelizo(await fetchJSON(`${URLS.evangelizo}${data}/commentary`));
}

/** Resumo da Wikipedia; se o título direto falhar, usa a busca. Retorna null se nada for achado. */
export async function buscarWikipedia(nome) {
  const termo = nomeParaBusca(nome);
  if (!termo) return null;
  try {
    const direto = adaptarResumoWikipedia(
      await fetchJSON(URLS.wikiResumo + encodeURIComponent(termo.replaceAll(' ', '_'))),
    );
    if (direto) return direto;
  } catch (e) {
    if (!(e instanceof ApiError && e.tipo === 'http' && e.status === 404)) throw e;
  }
  const params = new URLSearchParams({
    action: 'query', list: 'search', srsearch: `${termo} santo`, srlimit: '5', format: 'json', origin: '*',
  });
  const titulo = escolherResultadoBusca(await fetchJSON(`${URLS.wikiBusca}?${params}`), termo);
  if (!titulo) return null;
  return adaptarResumoWikipedia(await fetchJSON(URLS.wikiResumo + encodeURIComponent(titulo.replaceAll(' ', '_'))));
}

// ---------------------------------------------------------------------------
// Blocos (o que a interface consome)
// ---------------------------------------------------------------------------

/** Leituras, título, cor, orações e antífonas. */
export function getLiturgia(data) {
  return comFallback(data, 'liturgia', [
    { nome: 'liturgia-api', buscar: () => buscarLiturgiaApi(data) },
    { nome: 'evangelizo', buscar: () => buscarLeiturasEvangelizo(data) },
  ]);
}

const TEM_SANTO = /\b(São|Santo|Santa|Santos|Santas|Beato|Beata|Nossa Senhora)\b/;

/**
 * Santo do dia: Evangelizo + complemento da Wikipedia.
 * Reserva: nome extraído do título litúrgico + Wikipedia; por fim, imagem padrão.
 * @param {Promise} liturgiaPromise resultado de getLiturgia(data), usado na reserva
 */
export function getSanto(data, liturgiaPromise) {
  const tituloLiturgico = async () => {
    try { return (await liturgiaPromise)?.dados?.titulo ?? ''; } catch { return ''; }
  };

  return comFallback(data, 'santo', [
    {
      nome: 'evangelizo',
      buscar: async () => {
        const santo = await buscarSantoEvangelizo(data);
        const wiki = await buscarWikipedia(santo.nome).catch(() => null);
        return { ...santo, wiki };
      },
    },
    {
      nome: 'wikipedia',
      buscar: async () => {
        const titulo = await tituloLiturgico();
        if (!TEM_SANTO.test(titulo)) return null;
        const nome = titulo.split(',')[0].trim();
        const wiki = await buscarWikipedia(nome);
        if (!wiki) return null;
        return { nome, descricao: titulo.split(',').slice(1).join(',').trim(), imagem: wiki.imagem, bioHtml: '', bioFonte: '', oracao: '', outros: [], wiki };
      },
    },
    {
      nome: 'liturgia-api',
      buscar: async () => {
        const titulo = await tituloLiturgico();
        if (!TEM_SANTO.test(titulo)) return null;
        const [nome, ...resto] = titulo.split(',');
        return { nome: nome.trim(), descricao: resto.join(',').trim(), imagem: null, bioHtml: '', bioFonte: '', oracao: '', outros: [], wiki: null };
      },
    },
  ]);
}

/** Reflexão do dia: comentário da Evangelizo; reserva com antífonas e orações. */
export function getReflexao(data, liturgiaPromise) {
  return comFallback(data, 'reflexao', [
    { nome: 'evangelizo', buscar: () => buscarComentarioEvangelizo(data) },
    {
      nome: 'liturgia-api',
      buscar: async () => {
        const lit = (await liturgiaPromise)?.dados;
        const partesTexto = [
          lit?.antifonas?.entrada && `Antífona de entrada\n${lit.antifonas.entrada}`,
          lit?.oracoes?.coleta && `Oração do dia\n${lit.oracoes.coleta}`,
          lit?.antifonas?.comunhao && `Antífona da comunhão\n${lit.antifonas.comunhao}`,
        ].filter(Boolean);
        if (partesTexto.length === 0) return null;
        return { tipo: 'meditacao', titulo: 'Meditação com a liturgia do dia', texto: partesTexto.join('\n\n'), autor: '', autorDescricao: '', obra: '' };
      },
    },
  ]);
}

/**
 * Carrega todos os blocos em paralelo. Cada bloco falha de forma independente.
 * Retorna { data, liturgia, santo, reflexao, erros } — blocos com falha ficam null.
 */
export async function getDia(data) {
  const liturgiaP = getLiturgia(data);
  const [liturgia, santo, reflexao] = await Promise.allSettled([
    liturgiaP,
    getSanto(data, liturgiaP),
    getReflexao(data, liturgiaP),
  ]);
  const valor = (r) => (r.status === 'fulfilled' ? r.value : null);
  const erros = [liturgia, santo, reflexao].filter((r) => r.status === 'rejected').map((r) => r.reason);
  return { data, liturgia: valor(liturgia), santo: valor(santo), reflexao: valor(reflexao), erros };
}
