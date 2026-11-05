// Catena Aurea: lê a referência do Evangelho e busca os trechos que se sobrepõem a ela.
//  1. Português: projeto catenaaurea.com.br, lido do repositório do autor no GitHub (uso pessoal).
//  2. Reserva: inglês (Newman, 1841), arquivos locais data/catena/{Livro}/{capitulo}.json.

import { EVANGELHOS } from './utils/books.js';
import { adaptarCatenaPt, LIVROS_PT } from './adapters/catenaPt.js';

const URL_CATENA_PT = 'https://raw.githubusercontent.com/guilherme-evangelista/catena-aurea/HEAD/data/';
const SITE_CATENA_PT = 'https://catenaaurea.com.br/';
const TIMEOUT_PT = 15000;

/**
 * Converte uma referência em faixas por capítulo.
 *   "Lc 14,25-33"                → [{ cap: 14, vIni: 25, vFim: 33 }]
 *   "Mt 7,21.24-27"              → [{ 7, 21, 21 }, { 7, 24, 27 }]
 *   "Mt 5,43-6,4"                → [{ 5, 43, 999 }, { 6, 1, 4 }]
 *   "Jo 9,1-41 ou 1.6-9.13-17"   → usa a forma longa (antes do "ou")
 * Retorna { livro, faixas } ou null se não for um Evangelho.
 */
export function lerReferencia(referencia) {
  const ref = String(referencia ?? '')
    .split(/\s+ou\s+/)[0]
    .replace(/[–—]/g, '-')
    .replace(/\s*,\s*/g, ',')
    .trim();
  const m = ref.match(/^(\S+)\s+(.+)$/);
  if (!m || !EVANGELHOS.includes(m[1])) return null;

  const faixas = [];
  let cap = null;
  for (const trecho of m[2].split(/[.;]/)) {
    const t = trecho.trim().replace(/[a-z]/g, ''); // "4a" → "4"
    const r = t.match(/^(?:(\d+),)?(\d+)(?:-(?:(\d+),)?(\d+))?$/);
    if (!r) continue;
    if (r[1]) cap = Number(r[1]);
    if (cap == null) continue;
    const vIni = Number(r[2]);
    if (r[3]) {
      // Atravessa capítulos: "43-6,4"
      faixas.push({ cap, vIni, vFim: 999 });
      cap = Number(r[3]);
      faixas.push({ cap, vIni: 1, vFim: Number(r[4]) });
    } else {
      faixas.push({ cap, vIni, vFim: r[4] ? Number(r[4]) : vIni });
    }
  }
  return faixas.length ? { livro: m[1], faixas } : null;
}

const arquivos = new Map(); // cache em memória: "Lc/14" → Promise<json|null>

function carregarCapitulo(livro, cap) {
  const chave = `${livro}/${cap}`;
  if (!arquivos.has(chave)) {
    arquivos.set(chave, fetch(`data/catena/${chave}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => { arquivos.delete(chave); throw new Error('Falha ao carregar a Catena Aurea'); }));
  }
  return arquivos.get(chave);
}

/**
 * Trechos da Catena para uma referência do Evangelho.
 * Retorna { referencia, livro, idioma, grupos: [{ cap, vIni, vFim, trechos }], fonte, link } ou null.
 */
export async function getCatena(referencia) {
  const lida = lerReferencia(referencia);
  if (!lida) return null;
  try {
    const pt = await catenaPortugues(referencia, lida);
    if (pt.grupos.length) return pt;
  } catch (e) {
    console.warn('Catena em português indisponível; usando o inglês', e);
  }
  return catenaIngles(referencia, lida);
}

// ---------------------------------------------------------------------------
// Português (catenaaurea.com.br)
// ---------------------------------------------------------------------------

const evangelhosPt = new Map(); // "lucas" → Promise<Map<cap, blocos>>

function carregarEvangelhoPt(nome) {
  if (!evangelhosPt.has(nome)) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), TIMEOUT_PT);
    evangelhosPt.set(nome, fetch(`${URL_CATENA_PT}${nome}.json`, { signal: controle.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(adaptarCatenaPt)
      .catch((e) => { evangelhosPt.delete(nome); throw e; })
      .finally(() => clearTimeout(timer)));
  }
  return evangelhosPt.get(nome);
}

async function catenaPortugues(referencia, lida) {
  const nome = LIVROS_PT[lida.livro];
  const porCap = await carregarEvangelhoPt(nome);
  const grupos = new Set();
  for (const f of lida.faixas) {
    for (const b of porCap.get(f.cap) ?? []) {
      if (b.vIni <= f.vFim && b.vFim >= f.vIni) grupos.add(b);
    }
  }
  const capitulo = lida.faixas[0].cap;
  return {
    referencia,
    livro: lida.livro,
    idioma: 'pt',
    grupos: [...grupos].sort((a, b) => a.cap - b.cap || a.vIni - b.vIni),
    fonte: 'Tradução portuguesa do projeto Catena Áurea (catenaaurea.com.br, de Guilherme Evangelista), baseada na edição inglesa de Oxford (1841).',
    link: `${SITE_CATENA_PT}?evangelho=${nome}&capitulo=${capitulo}`,
  };
}

// ---------------------------------------------------------------------------
// Inglês (arquivos locais)
// ---------------------------------------------------------------------------

async function catenaIngles(referencia, lida) {
  const caps = [...new Set(lida.faixas.map((f) => f.cap))];
  const dados = await Promise.all(caps.map((c) => carregarCapitulo(lida.livro, c)));
  const porCap = new Map(caps.map((c, i) => [c, dados[i]]));

  const vistos = new Set();
  const grupos = new Map(); // "cap:vIni-vFim" → grupo
  let fonte = '';
  for (const f of lida.faixas) {
    const arq = porCap.get(f.cap);
    if (!arq) continue;
    fonte = arq.fonte;
    arq.trechos.forEach((t, i) => {
      const id = `${f.cap}:${i}`;
      if (vistos.has(id) || t.vIni > f.vFim || t.vFim < f.vIni) return;
      vistos.add(id);
      const chave = `${f.cap}:${t.vIni}-${t.vFim}`;
      if (!grupos.has(chave)) grupos.set(chave, { cap: f.cap, vIni: t.vIni, vFim: t.vFim, trechos: [] });
      grupos.get(chave).trechos.push(t);
    });
  }

  const ordenados = [...grupos.values()].sort((a, b) => a.cap - b.cap || a.vIni - b.vIni || a.vFim - b.vFim);
  return { referencia, livro: lida.livro, idioma: 'en', grupos: ordenados, fonte, link: null };
}
