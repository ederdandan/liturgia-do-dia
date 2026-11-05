// Aba "Santo do Dia": imagem, biografia, Wikipedia, oração e outros santos.

import { escaparHtml, sanitizarHtml } from '../utils/sanitize.js';

export const IMAGEM_PADRAO = 'assets/default-saint.jpg';

/**
 * @param {{ dados: object, fonte: string }} santoRes  resultado de getSanto
 * @param {object|null} liturgia  dados da liturgia (para usar a coleta como oração)
 */
export function renderSanto({ dados: s, fonte }, liturgia) {
  const wiki = s.wiki;
  const imagens = [s.imagem, ampliarMiniatura(wiki?.miniatura), wiki?.miniatura, IMAGEM_PADRAO]
    .filter(Boolean)
    .filter((url, i, arr) => arr.indexOf(url) === i);
  const [imagem, ...reservas] = imagens;

  const bio = s.bioHtml ? sanitizarHtml(s.bioHtml) : '';
  const usarWikiComoBio = !bio && wiki?.resumo;

  const oracaoTexto = s.oracao || liturgia?.oracoes?.coleta || '';
  const oracaoRotulo = s.oracao ? 'Oração' : 'Oração do dia (coleta)';

  return `
    <article>
      <figure class="overflow-hidden rounded-lg bg-superficie">
        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(imagem === IMAGEM_PADRAO ? 'Pintura clássica de santos (Fra Angelico)' : s.nome)}"
             data-reservas="${escaparHtml(reservas.join('|'))}"
             class="mx-auto max-h-[28rem] w-auto object-contain" loading="lazy" decoding="async">
      </figure>

      <header class="mt-6">
        <h2 class="font-display text-2xl leading-snug">${escaparHtml(s.nome)}</h2>
        ${s.descricao ? `<p class="mt-1 text-sm text-suave">${escaparHtml(s.descricao)}</p>` : ''}
      </header>

      ${bio ? `<div class="prosa mt-6">${bio}</div>` : ''}
      ${usarWikiComoBio ? `<div class="prosa mt-6"><p>${escaparHtml(wiki.resumo)}</p></div>` : ''}

      ${wiki && !usarWikiComoBio ? `
        <details class="mt-8 rounded-lg border border-borda p-4">
          <summary class="cursor-pointer text-sm text-suave">Na Wikipedia</summary>
          <p class="mt-3 text-[0.95em]">${escaparHtml(wiki.resumo)}</p>
          <p class="mt-2 text-sm"><a class="text-liturgica underline underline-offset-4" href="${escaparHtml(wiki.url)}" target="_blank" rel="noopener">Ler artigo completo</a></p>
        </details>` : ''}

      ${oracaoTexto ? `
        <section class="bloco mt-10">
          <p class="rotulo">${oracaoRotulo}</p>
          <p class="mt-3 italic">${escaparHtml(oracaoTexto)}</p>
        </section>` : ''}

      ${s.outros?.length ? `
        <section class="bloco">
          <p class="rotulo">Também celebrados hoje</p>
          <ul class="mt-3 space-y-1 text-[0.95em]">
            ${s.outros.map((o) => `<li>${escaparHtml(o.nome)}${o.descricao ? ` <span class="text-suave">— ${escaparHtml(o.descricao)}</span>` : ''}</li>`).join('')}
          </ul>
        </section>` : ''}

      <p class="credito">${creditos(fonte, s, wiki)}</p>
    </article>`;
}

/** Miniatura da Wikipedia (330px) → 500px, um dos tamanhos padrão aceitos pelo Wikimedia. */
function ampliarMiniatura(url) {
  return url ? url.replace(/\/\d+px-/, '/500px-') : null;
}

function creditos(fonte, s, wiki) {
  const itens = [];
  if (fonte === 'evangelizo') {
    itens.push(`Biografia e imagem: <a href="https://evangelizo.org" target="_blank" rel="noopener">Evangelizo.org</a>${s.bioFonte ? ` (${escaparHtml(s.bioFonte)})` : ''}`);
  }
  if (wiki) itens.push(`<a href="${escaparHtml(wiki.url)}" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA)`);
  if (fonte === 'liturgia-api') itens.push('Nome a partir do título litúrgico (fontes de biografia indisponíveis)');
  return itens.join(' · ');
}
