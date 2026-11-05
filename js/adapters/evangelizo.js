// Adapter: Evangelizo (https://publication.evangelizo.ws/PT/days/AAAA-MM-DD/...) → modelo interno.
// Tradução portuguesa (de Portugal). Usada para santo, reflexão e como reserva das leituras.

import { referenciaEvangelizoParaPt } from '../utils/books.js';
import { inferirCor } from '../utils/cor.js';

const TITULOS = {
  primeira: 'Primeira Leitura',
  salmo: 'Salmo Responsorial',
  segunda: 'Segunda Leitura',
  evangelho: 'Evangelho',
};

/**
 * @param {object} dia      resposta de /PT/days/{data}
 * @param {object} leituras resposta de /PT/days/{data}/readings
 */
export function adaptarLeiturasEvangelizo(dia, leituras) {
  const itens = leituras?.data;
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('Evangelizo sem leituras');
  }

  let jaTevePrimeira = false;
  const resultado = itens.map((item) => {
    let tipo;
    if (item.type === 'gospel') tipo = 'evangelho';
    else if (item.type === 'psalm') tipo = 'salmo';
    else {
      tipo = jaTevePrimeira ? 'segunda' : 'primeira';
      jaTevePrimeira = true;
    }
    return {
      tipo,
      titulo: item.book?.full_title ? tituloLeitura(tipo, item.book.full_title) : TITULOS[tipo],
      referencia: referenciaEvangelizoParaPt(item.reading_code),
      forma: null,
      refrao: item.chorus ? limparRefrao(item.chorus) : null,
      nota: null,
      versiculos: separarMarcadores(item.text ?? ''),
    };
  });

  if (!resultado.some((l) => l.tipo === 'evangelho')) {
    throw new Error('Evangelizo sem Evangelho');
  }

  const titulo = dia?.data?.liturgic_title ?? '';
  return {
    titulo,
    cor: inferirCor(titulo),
    corInferida: true,
    leituras: resultado,
    oracoes: { coleta: '', oferendas: '', comunhao: '' },
    antifonas: { entrada: '', comunhao: '' },
  };
}

function tituloLeitura(tipo, livro) {
  if (tipo === 'salmo') return TITULOS.salmo;
  return livro;
}

function limparRefrao(refrao) {
  return refrao.replace(/^\s*R\/\s*/, '').replace(/\s+/g, ' ').trim();
}

/** "[[Mt 25,1]]Naquele tempo...\n[[Mt 25,2]]..." → [{ n: 1, texto }, ...] */
export function separarMarcadores(texto) {
  const partes = texto.split(/\[\[[^\]]*?(\d+),(\d+)\]\]/);
  const versiculos = [];
  const intro = partes[0].trim();
  if (intro) versiculos.push({ n: null, texto: normalizarQuebras(intro) });
  for (let i = 1; i < partes.length; i += 3) {
    const corpo = normalizarQuebras(partes[i + 2] ?? '');
    if (corpo) versiculos.push({ n: Number(partes[i + 1]), texto: corpo });
  }
  return versiculos;
}

function normalizarQuebras(t) {
  return t.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** /saints → santo principal + outros. A bio vem em HTML e é sanitizada na interface. */
export function adaptarSantosEvangelizo(json) {
  const santos = Array.isArray(json?.data) ? json.data : [];
  if (santos.length === 0) throw new Error('Evangelizo sem santo do dia');

  const ordenados = [...santos].sort((a, b) => (a.order1 ?? 99) - (b.order1 ?? 99));
  const [principal, ...outros] = ordenados;
  return {
    nome: expandirNome(principal.name),
    descricao: principal.short_description ?? '',
    imagem: principal.image_links?.large ?? null,
    bioHtml: principal.bio ?? '',
    bioFonte: principal.bio_source ?? '',
    oracao: principal.prayer ? String(principal.prayer).trim() : '',
    outros: outros.map((s) => ({ nome: expandirNome(s.name), descricao: s.short_description ?? '' })),
  };
}

/** "S. Carlos Borromeu" → "São Carlos Borromeu" */
function expandirNome(nome) {
  return String(nome ?? '')
    .replace(/^S\.\s+(?=[AEIOUÁÉÍÓÚ])/i, 'Santo ')
    .replace(/^S\.\s+/, 'São ')
    .replace(/^Sta\.\s+/, 'Santa ')
    .replace(/^Sto\.\s+/, 'Santo ')
    .replace(/^Bto\.\s+/, 'Beato ')
    .replace(/^Bta\.\s+/, 'Beata ')
    .trim();
}

/** /commentary → reflexão do dia. */
export function adaptarComentarioEvangelizo(json) {
  const c = json?.data;
  if (!c?.description) throw new Error('Evangelizo sem comentário do dia');
  return {
    tipo: 'comentario',
    titulo: (c.title ?? '').trim(),
    texto: c.description.replace(/\r\n?/g, '\n').trim(),
    autor: c.author?.name ?? '',
    autorDescricao: c.author?.short_description ?? '',
    obra: c.source ?? '',
  };
}
