// Catecismo × Evangelho: parágrafos do Catecismo da Igreja Católica (CIC) que citam o Evangelho do dia.
// Fonte: catechism_by_chapter.json do projeto catechism-cross-reference (lido do GitHub).
// Cada entrada é um capítulo bíblico com os parágrafos do CIC que o citam e os versículos citados.

import { lerReferencia } from './catenaService.js';

const URL_CIC = 'https://raw.githubusercontent.com/ederdandan/catechism-cross-reference/main/etl/output/catechism_by_chapter.json';
const TIMEOUT = 15000;

let indice = null; // Promise<Map<"Mt/5", parágrafos>>

function carregarIndice() {
  if (!indice) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), TIMEOUT);
    indice = fetch(URL_CIC, { signal: controle.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((lista) => new Map(lista.map((c) => [`${c.abbreviation}/${c.chapter}`, c.catechism_paragraphs])))
      .catch((e) => { indice = null; throw e; })
      .finally(() => clearTimeout(timer));
  }
  return indice;
}

/**
 * Parágrafos do CIC que citam algum versículo da referência do Evangelho.
 * Retorna { referencia, livro, paragrafos: [{ paragraph, refs, texto, epigrafe, cap, vIni }] } ou null.
 */
export async function getCatecismo(referencia) {
  const lida = lerReferencia(referencia);
  if (!lida) return null;
  const porCap = await carregarIndice();

  const achados = new Map(); // nº do parágrafo → item
  for (const f of lida.faixas) {
    for (const p of porCap.get(`${lida.livro}/${f.cap}`) ?? []) {
      // verses vazio = capítulo citado inteiro
      const dentro = p.verses.length ? p.verses.filter((v) => v >= f.vIni && v <= f.vFim) : [f.vIni];
      if (!dentro.length) continue;
      const item = achados.get(p.paragraph)
        ?? { paragraph: p.paragraph, refs: [], ...limparTexto(p.text, lida.livro), cap: f.cap, vIni: dentro[0] };
      if (!item.refs.includes(p.ref)) item.refs.push(p.ref);
      achados.set(p.paragraph, item);
    }
  }

  const paragrafos = [...achados.values()]
    .sort((a, b) => a.cap - b.cap || a.vIni - b.vIni || a.paragraph - b.paragraph);
  return { referencia, livro: lida.livro, paragrafos };
}

/**
 * O texto da fonte é fiel ao original e traz imperfeições (ver README do projeto de origem).
 * Aqui só limpamos para exibição: marcadores de nota "(405)", hífen invisível,
 * título da seção seguinte grudado no fim e bloco de notas vazado.
 */
export function limparTexto(texto, livro) {
  let t = String(texto)
    .replace(/­/g, '')
    .replace(/\s+\d+\.\s+Cf\.[\s\S]*$/, '') // bloco de notas vazado
    .replace(/\s*\(\d+\)/g, '') // marcadores de nota
    .replace(/\(\s+/g, '(')
    .replace(/\s+,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Título do artigo seguinte grudado no fim. Às vezes a citação do Evangelho está justamente
  // na epígrafe desse artigo; nesse caso ela é mantida à parte.
  let epigrafe = '';
  const titulo = t.match(/\s+(?:ARTIGO|CAPÍTULO|SECÇÃO|PARÁGRAFO)\s+\d[\s\S]*$/);
  if (titulo) {
    t = t.slice(0, titulo.index);
    const resto = titulo[0].replace(/\s+[IVX]+\.\s+[\s\S]{0,80}$/, '').trim(); // "I. «subtítulo»"
    if (livro && new RegExp(`(?<!\\d\\s?)\\b${livro}\\s?\\d`).test(resto)) epigrafe = resto;
  }
  // Subtítulos soltos no fim: "I. «Ao Senhor teu Deus adorarás»" ou "A LEGÍTIMA DEFESA"
  t = t
    .replace(/([.!?»)])\s+[IVX]+\.\s+[\s\S]{0,80}$/, '$1')
    .replace(/([.!?»)])\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s«»"',:-]{4,}$/, '$1')
    .trim();
  return { texto: t, epigrafe };
}
