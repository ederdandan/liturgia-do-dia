// Aba "Patrística & Catena Aurea": comentários dos Padres sobre o Evangelho do dia.

import { escaparHtml } from '../utils/sanitize.js';

/** @param {Array} resultados lista de retornos de getCatena (um por Evangelho do dia) */
export function renderCatena(resultados) {
  const validos = resultados.filter((r) => r?.grupos.length);
  if (!validos.length) {
    return `<p class="italic text-suave">Não há comentários da Catena Aurea para o Evangelho deste dia.</p>`;
  }

  return `
    <p class="rotulo">Catena Aurea · São Tomás de Aquino</p>
    <p class="mt-3 text-sm text-suave">
      Comentários dos Padres da Igreja reunidos por São Tomás sobre o Evangelho do dia.
      Texto em inglês, na tradução de J. H. Newman (1841).
    </p>
    ${validos.map(blocoEvangelho).join('')}
    <p class="credito">${escaparHtml(validos[0].fonte)}</p>`;
}

function blocoEvangelho(r) {
  return `
    <section class="bloco mt-10">
      <h2 class="font-bold text-liturgica">${escaparHtml(r.referencia)}</h2>
      ${r.grupos.map((g) => `
        <div class="mt-8">
          <p class="selo">${rotuloVersos(r.livro, g)}</p>
          <div class="mt-4 space-y-6" lang="en">
            ${g.trechos.map(trecho).join('')}
          </div>
        </div>`).join('')}
    </section>`;
}

function rotuloVersos(livro, g) {
  const fim = g.vFim === 999 ? 'fim' : g.vFim;
  return `${livro} ${g.cap},${g.vIni}${fim !== g.vIni ? `-${fim}` : ''}`;
}

function trecho(t) {
  return `
    <figure>
      <figcaption class="text-sm" lang="pt-BR">
        <span class="font-bold">${escaparHtml(t.autor)}</span>${t.citacao ? ` <span class="text-suave italic">(${escaparHtml(t.citacao)})</span>` : ''}
      </figcaption>
      <blockquote class="mt-1">${escaparHtml(t.texto)}</blockquote>
    </figure>`;
}
