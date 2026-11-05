// Aba "Homilia & Reflexão": comentário do dia (Evangelizo) ou meditação com a liturgia (reserva).

import { escaparHtml, textoParaHtml } from '../utils/sanitize.js';

/** @param {{ dados: object, fonte: string }} resultado de getReflexao */
export function renderReflexao({ dados: r, fonte }) {
  const comentario = r.tipo === 'comentario';
  return `
    <article>
      <p class="rotulo">${comentario ? 'Comentário do dia' : 'Meditação'}</p>
      ${r.titulo ? `<h2 class="mt-3 text-xl italic leading-snug">${escaparHtml(r.titulo)}</h2>` : ''}

      ${comentario && r.autor ? `
        <p class="mt-4 text-sm text-suave">
          <span class="font-bold text-texto">${escaparHtml(r.autor)}</span>${r.autorDescricao ? `, ${escaparHtml(r.autorDescricao)}` : ''}
          ${r.obra ? `<br><span class="italic">${escaparHtml(r.obra)}</span>` : ''}
        </p>` : ''}

      <div class="prosa mt-6">${comentario ? textoParaHtml(r.texto) : meditacaoHtml(r.texto)}</div>

      <p class="credito">${fonte === 'evangelizo'
        ? 'Fonte: <a href="https://evangelizo.org" target="_blank" rel="noopener">Evangelizo.org</a> · tradução portuguesa'
        : 'O comentário do dia está indisponível; esta meditação reúne as antífonas e a oração da liturgia.'}</p>
    </article>`;
}

/** Texto da reserva: blocos "Rótulo\nTexto" separados por linha em branco. */
function meditacaoHtml(texto) {
  return texto.split(/\n{2,}/).map((bloco) => {
    const [rotulo, ...resto] = bloco.split('\n');
    return `<p><span class="block text-sm font-bold">${escaparHtml(rotulo)}</span><span class="italic">${escaparHtml(resto.join(' '))}</span></p>`;
  }).join('');
}
