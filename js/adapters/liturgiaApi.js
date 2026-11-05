// Adapter: Liturgia Diária API (https://liturgia.up.railway.app) → modelo interno.
// Aceita a v2 (leituras agrupadas em arrays) e a v1 (leituras na raiz, objetos/strings).

import { normalizarCor } from '../utils/cor.js';

const TIPOS = [
  ['primeiraLeitura', 'primeira'],
  ['salmo', 'salmo'],
  ['segundaLeitura', 'segunda'],
  ['evangelho', 'evangelho'],
];

export function adaptarLiturgiaApi(json) {
  if (!json || typeof json !== 'object' || !json.liturgia) {
    throw new Error('Resposta da Liturgia API em formato inesperado');
  }

  const origemLeituras = json.leituras ?? json; // v2 : v1
  const leituras = [];
  for (const [campo, tipo] of TIPOS) {
    for (const item of comoLista(origemLeituras[campo])) {
      leituras.push(tipo === 'salmo' ? adaptarSalmo(item) : adaptarLeitura(item, tipo));
    }
  }
  if (!leituras.some((l) => l.tipo === 'evangelho')) {
    throw new Error('Liturgia API sem Evangelho');
  }

  const oracoes = json.oracoes ?? { coleta: json.dia, oferendas: json.oferendas, comunhao: json.comunhao };

  return {
    titulo: limparTexto(json.liturgia),
    cor: normalizarCor(json.cor),
    corInferida: false,
    leituras,
    oracoes: {
      coleta: limparTexto(oracoes.coleta),
      oferendas: limparTexto(oracoes.oferendas),
      comunhao: limparTexto(oracoes.comunhao),
    },
    antifonas: {
      entrada: limparTexto(json.antifonas?.entrada),
      comunhao: limparTexto(json.antifonas?.comunhao),
    },
  };
}

/** v2 usa arrays; v1 usa objeto, ou string ("Não há segunda leitura hoje!") quando não existe. */
function comoLista(valor) {
  if (Array.isArray(valor)) return valor.filter(ehLeitura);
  return ehLeitura(valor) ? [valor] : [];
}

function ehLeitura(v) {
  return v && typeof v === 'object' && typeof v.texto === 'string' && v.texto.trim();
}

function adaptarLeitura(item, tipo) {
  let texto = limparTexto(item.texto);
  let titulo = limparTexto(item.titulo);
  let nota = null;

  // Nota inicial entre colchetes, ex.: "[A forma breve está entre colchetes.]"
  // (Não confundir com a forma breve entre colchetes: "[Naquele tempo, 1ao passar...]".)
  const mNota = texto.match(/^\[([^\]]{3,120})\]\s*/);
  if (mNota && !/\d\p{L}/u.test(mNota[1])) {
    nota = mNota[1].trim();
    texto = texto.slice(mNota[0].length);
  }

  // Sem título: a API às vezes coloca "Leitura da ... – " no início do texto.
  if (!titulo) {
    const mTitulo = texto.match(/^((?:Leitura|Proclamação)[^–\d]{5,150}?)\s+–\s+/);
    if (mTitulo) {
      titulo = mTitulo[1].trim();
      texto = texto.slice(mTitulo[0].length);
    }
  }

  const { referencia, forma } = limparReferencia(item.referencia);
  return {
    tipo,
    titulo,
    referencia,
    forma,
    refrao: null,
    nota,
    versiculos: separarVersiculos(texto, referencia),
  };
}

function adaptarSalmo(item) {
  const estrofes = limparTexto(item.texto)
    .split(/\s*–\s+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const { referencia, forma } = limparReferencia(item.referencia);
  return {
    tipo: 'salmo',
    titulo: limparTexto(item.titulo) || 'Salmo Responsorial',
    referencia,
    forma,
    refrao: limparTexto(item.refrao) || null,
    nota: null,
    versiculos: estrofes.map((texto) => ({ n: null, texto })),
  };
}

const ABRE = '“"\'‘«(\\[″′';

/**
 * Separa "Naquele tempo, 25grandes multidões... 26“Se alguém..." em versículos.
 *
 * Particularidades do texto da Liturgia API:
 *  - números colados à palavra seguinte, inclusive após pontuação ("contigo!”29Maria");
 *  - mudança de capítulo como "28,1Quem";
 *  - o primeiro versículo frequentemente vem sem número ("Naquele dia, ..." = v. 1).
 *
 * Para evitar falsos positivos, só aceita números crescentes (ou reinício quando o
 * capítulo muda). `referencia` (ex.: "Is 26,1-6") permite numerar o primeiro versículo.
 */
export function separarVersiculos(texto, referencia = '') {
  // Prefixo: início, pontuação/espaço/letra, ou vírgula que não segue um dígito ("procede?,3Pois").
  const re = new RegExp(`(^|[^\\p{N},]|(?<!\\d),)(?:(\\d{1,3}),)?(\\d{1,3})(?=[\\p{L}${ABRE}])`, 'gu');
  const saltos = iniciosDeTrecho(referencia); // "Ez 16,1-15.60.63" → {1, 60, 63}
  const cortes = [];
  let ultimo = 0;
  let m;
  while ((m = re.exec(texto))) {
    const capitulo = m[2];
    const n = Number(m[3]);
    // Número colado a uma letra ("escolhestes25para") só vale se for exatamente o próximo.
    const colado = /\p{L}/u.test(m[1]);
    const aceito = colado
      ? cortes.length > 0 && !capitulo && n === ultimo + 1
      : cortes.length === 0
        ? n > 0
        : capitulo
          ? n <= 3 // "28,1Quem": novo capítulo começa em 1 (ou perto disso)
          : (n > ultimo && (n <= ultimo + 40 || saltos.has(n))) || (n === 1 && ultimo > 1);
    if (!aceito) continue;
    // Abre-aspas/colchete imediatamente antes do número pertence ao versículo ("[13Irmãos").
    const abre = m[1] && ABRE.includes(m[1]) ? m[1] : '';
    const inicioNumero = m.index + m[1].length - abre.length;
    cortes.push({ n, inicioNumero, inicioTexto: m.index + m[0].length, abre });
    ultimo = n;
  }

  const v0 = inicioDaReferencia(referencia);
  if (cortes.length === 0) return [{ n: v0, texto: texto.trim() }];

  // Erro de digitação na fonte ("3Naquele" em Lc 24,13-35): o segundo número confirma o primeiro.
  if (v0 && cortes.length > 1 && cortes[0].n !== v0 && cortes[1].n === v0 + 1) cortes[0].n = v0;

  const versiculos = [];
  const intro = texto.slice(0, cortes[0].inicioNumero).trim();
  if (intro) {
    // Se o texto começa antes do primeiro número e a referência começa num versículo
    // anterior, esse trecho é o primeiro versículo (sem número no original).
    const n = v0 && v0 < cortes[0].n ? v0 : null;
    versiculos.push({ n, texto: intro });
  }
  cortes.forEach((c, i) => {
    const fim = i + 1 < cortes.length ? cortes[i + 1].inicioNumero : texto.length;
    versiculos.push({ n: c.n, texto: (c.abre + texto.slice(c.inicioTexto, fim)).trim() });
  });
  return versiculos;
}

/** Versículos onde começa cada trecho: "Ez 16,1-15.60.63" → Set{1, 60, 63}. */
function iniciosDeTrecho(referencia) {
  const corpo = String(referencia).split(/\s+ou\s+/)[0].replace(/^\S+\s+/, '');
  const inicios = new Set();
  for (const trecho of corpo.split(/[.;]/)) {
    const m = trecho.trim().match(/^(?:\d+,)?(\d+)/);
    if (m) inicios.add(Number(m[1]));
  }
  return inicios;
}

/** "Is 26,1-6" → 1; "Mt 7,21.24-27" → 21; "Eclo 27,33-28,9" → 33. */
function inicioDaReferencia(referencia) {
  const m = String(referencia).match(/\d+\s*,\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Limpa a referência e separa a indicação de forma:
 *   "Fl 2, 5-11"                   → { referencia: "Fl 2,5-11", forma: null }
 *   "Lc 2, 22-40 (mais longo)"     → { referencia: "Lc 2,22-40", forma: "mais longo" }
 *   "Lc 14,1.7-11¬¬"               → { referencia: "Lc 14,1.7-11", forma: null }
 */
export function limparReferencia(bruta) {
  let ref = limparTexto(bruta).replace(/[¬]/g, '');
  let forma = null;
  const m = ref.match(/\(([^)]+)\)\s*$/);
  if (m && /longa|longo|breve/i.test(m[1])) {
    forma = m[1].trim();
    ref = ref.slice(0, m.index);
  }
  ref = ref
    .replace(/^(\d?\s?[A-Za-zÀ-ÿ]+)\s*,\s*(?=\d)/, '$1 ') // "Ecl, 3,1-11" → "Ecl 3,1-11"
    .replace(/\s*,\s*/g, ',').replace(/\s*\.\s*(?=\d)/g, '.').replace(/\s*-\s*/g, '-').trim();
  return { referencia: ref, forma };
}

function limparTexto(t) {
  return typeof t === 'string' ? t.replace(/\s+/g, ' ').trim() : '';
}
