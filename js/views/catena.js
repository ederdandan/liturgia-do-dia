// Aba "Patrística & Catena Aurea": comentários dos Padres sobre o Evangelho do dia.
// Mostra o português (textoPt) quando já traduzido; senão, o original em inglês.

import { escaparHtml } from '../utils/sanitize.js';

/** @param {Array} resultados lista de retornos de getCatena (um por Evangelho do dia) */
export function renderCatena(resultados) {
  const validos = resultados.filter((r) => r?.grupos.length);
  if (!validos.length) {
    return `<p class="italic text-suave">Não há comentários da Catena Aurea para o Evangelho deste dia.</p>`;
  }

  const trechos = validos.flatMap((r) => r.grupos.flatMap((g) => g.trechos));
  const traduzidos = trechos.filter((t) => t.textoPt).length;
  const aviso = validos.every((r) => r.idioma === 'pt')
    ? ''
    : traduzidos === 0
      ? 'Texto em inglês, na tradução de J. H. Newman (1841) (a versão em português está indisponível no momento).'
      : 'Parte dos trechos está em português; os demais seguem no inglês de J. H. Newman (1841).';

  return `
    <p class="rotulo">Catena Aurea · São Tomás de Aquino</p>
    <p class="mt-3 text-sm text-suave">
      Comentários dos Padres da Igreja reunidos por São Tomás sobre o Evangelho do dia. ${aviso}
    </p>
    ${validos.map(blocoEvangelho).join('')}
    <p class="credito">${escaparHtml(validos[0].fonte)}${validos[0].link
      ? ` <a href="${escaparHtml(validos[0].link)}" target="_blank" rel="noopener">Ler no site do projeto</a>.`
      : ''}</p>`;
}

function blocoEvangelho(r) {
  return `
    <section class="bloco mt-10">
      <h2 class="font-bold text-liturgica">${escaparHtml(r.referencia)}</h2>
      ${r.grupos.map((g) => `
        <div class="mt-8">
          <p class="selo">${rotuloVersos(r.livro, g)}</p>
          <div class="mt-4 space-y-6">
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
  const cabecalho = `
    <figcaption class="text-sm">
      <span class="font-bold">${escaparHtml(t.autor)}</span>${t.citacao ? ` <span class="text-suave italic">(${escaparHtml(t.citacao)})</span>` : ''}
    </figcaption>`;

  if (!t.textoPt) {
    return `<figure>${cabecalho}<blockquote class="mt-1" lang="en">${escaparHtml(t.texto)}</blockquote></figure>`;
  }
  if (!t.texto) {
    return `<figure>${cabecalho}<blockquote class="mt-1">${escaparHtml(t.textoPt)}</blockquote></figure>`;
  }
  return `
    <figure>
      ${cabecalho}
      <blockquote class="mt-1">${escaparHtml(t.textoPt)}</blockquote>
      <details class="mt-1 text-sm text-suave">
        <summary class="cursor-pointer">original</summary>
        <p class="mt-1" lang="en">${escaparHtml(t.texto)}</p>
      </details>
    </figure>`;
}
