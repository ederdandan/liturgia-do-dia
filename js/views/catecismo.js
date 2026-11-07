// Aba "Catecismo": parágrafos do Catecismo da Igreja Católica que citam o Evangelho do dia.

import { escaparHtml } from '../utils/sanitize.js';

const URL_VATICANO = 'https://www.vatican.va/archive/cathechism_po/index_new/prima-pagina-cic_po.html';

/** @param {Array} resultados lista de retornos de getCatecismo (um por Evangelho do dia) */
export function renderCatecismo(resultados) {
  const validos = resultados.filter((r) => r?.paragrafos.length);
  if (!validos.length) {
    return `<p class="italic text-suave">O Catecismo não cita diretamente o Evangelho deste dia.</p>`;
  }

  return `
    <p class="rotulo">Catecismo da Igreja Católica</p>
    <p class="mt-3 text-sm text-suave">
      Parágrafos do Catecismo que citam versículos do Evangelho do dia, na ordem dos versículos.
    </p>
    ${validos.map(blocoEvangelho).join('')}
    <p class="credito">
      Texto do Catecismo da Igreja Católica (© Libreria Editrice Vaticana), via
      <a href="https://github.com/ederdandan/catechism-cross-reference" target="_blank" rel="noopener">catechism-cross-reference</a>.
      Só entram citações do corpo do texto, não as das notas de rodapé.
      <a href="${URL_VATICANO}" target="_blank" rel="noopener">Ler no vatican.va</a>.
    </p>`;
}

function blocoEvangelho(r) {
  const n = r.paragrafos.length;
  return `
    <section class="bloco mt-10">
      <h2 class="font-bold text-liturgica">${escaparHtml(r.referencia)}</h2>
      <p class="mt-1 text-sm text-suave">${n} ${n === 1 ? 'parágrafo' : 'parágrafos'}</p>
      <div class="mt-6 space-y-8">
        ${r.paragrafos.map((p) => paragrafo(p, r.livro)).join('')}
      </div>
    </section>`;
}

function paragrafo(p, livro) {
  return `
    <figure>
      <figcaption class="flex flex-wrap items-center gap-2 text-sm">
        <span class="font-bold">§ ${p.paragraph}</span>
        ${p.refs.map((ref) => `<span class="selo">${escaparHtml(ref)}</span>`).join('')}
      </figcaption>
      <blockquote class="mt-2">${destacarCitacoes(escaparHtml(p.texto), livro)}</blockquote>
      ${p.epigrafe ? `
        <p class="mt-2 text-sm text-suave">
          <span class="italic">Epígrafe do artigo seguinte:</span> ${destacarCitacoes(escaparHtml(p.epigrafe), livro)}
        </p>` : ''}
    </figure>`;
}

/** Destaca no texto as citações do Evangelho do dia, ex.: "Mt 5, 21-22". */
function destacarCitacoes(html, livro) {
  // (?<!\d\s?) evita "1 Jo 4, 8" (Primeira Carta de João) quando o Evangelho é "Jo"
  const re = new RegExp(`(?<!\\d\\s?)\\b${livro}\\s?\\d+,\\s?\\d+[a-z]?(?:\\s?[-.,]\\s?\\d+[a-z]?)*`, 'g');
  return html.replace(re, (m) => `<span class="cit">${m}</span>`);
}
