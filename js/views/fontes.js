// Painel "Fontes e créditos" (botão ⓘ no topo): todas as fontes num só lugar,
// marcando as que foram usadas no dia aberto.

import { escaparHtml } from '../utils/sanitize.js';

const link = (url, texto) => `<a href="${escaparHtml(url)}" target="_blank" rel="noopener">${escaparHtml(texto)}</a>`;

/**
 * @param {object} usadas  fontes do dia aberto, preenchidas pelo app conforme cada bloco carrega:
 *   { liturgia, santo, santoWiki: {url, titulo}, santoBio, reflexao, catena: {idioma, link}, catecismo }
 */
export function renderFontes(usadas = {}) {
  const emUso = (cond) => (cond ? ' <span class="selo selo-uso">em uso neste dia</span>' : '');
  const item = (titulo, texto, uso = false) => `
    <li>
      <p class="font-bold">${titulo}${emUso(uso)}</p>
      <p class="text-suave">${texto}</p>
    </li>`;

  const secoes = [
    ['Liturgia', [
      item(link('https://liturgia.up.railway.app', 'Liturgia Diária API'),
        'Leituras, salmo e Evangelho na tradução litúrgica da CNBB. Fonte principal.',
        usadas.liturgia === 'liturgia-api'),
      item(link('https://evangelizo.org', 'Evangelizo.org'),
        'Reserva quando a fonte principal não responde. A tradução portuguesa pode diferir da litúrgica.',
        usadas.liturgia === 'evangelizo'),
    ]],
    ['Santo do dia', [
      item(link('https://evangelizo.org', 'Evangelizo.org'),
        `Biografia e imagem do santo.${usadas.santoBio ? ` Neste dia: ${escaparHtml(usadas.santoBio)}.` : ''}`,
        usadas.santo === 'evangelizo'),
      item(link('https://pt.wikipedia.org', 'Wikipedia'),
        `Resumo e imagem, sob licença CC BY-SA.${usadas.santoWiki
          ? ` Neste dia: ${link(usadas.santoWiki.url, usadas.santoWiki.titulo || 'artigo')}.`
          : ''}`,
        usadas.santo === 'wikipedia' || !!usadas.santoWiki),
      item('Título litúrgico do dia',
        'Quando nenhuma fonte de biografia responde, o nome do santo vem do título da liturgia.',
        usadas.santo === 'liturgia-api'),
    ]],
    ['Reflexão', [
      item(link('https://evangelizo.org', 'Evangelizo.org'),
        'Comentário do Evangelho do dia, em tradução portuguesa.',
        usadas.reflexao === 'evangelizo'),
      item('Meditação com a liturgia',
        'Reserva: reúne as antífonas e a oração do dia quando o comentário está indisponível.',
        usadas.reflexao === 'liturgia-api'),
    ]],
    ['Catena Aurea', [
      item(link(usadas.catena?.link || 'https://catenaaurea.com.br', 'Projeto Catena Áurea (catenaaurea.com.br)'),
        'Tradução portuguesa de Guilherme Evangelista, baseada na edição inglesa de Oxford (1841).',
        usadas.catena?.idioma === 'pt'),
      item(link('https://github.com/HistoricalChristianFaith/Commentaries-Database', 'Commentaries-Database'),
        'Reserva em inglês: tradução de J. H. Newman (1841), domínio público.',
        usadas.catena?.idioma === 'en'),
    ]],
    ['Catecismo', [
      item(link('https://www.vatican.va/archive/cathechism_po/index_new/prima-pagina-cic_po.html', 'Catecismo da Igreja Católica'),
        `Texto do vatican.va, © Libreria Editrice Vaticana, organizado por versículo pelo projeto
         ${link('https://github.com/ederdandan/catechism-cross-reference', 'catechism-cross-reference')}.
         Só entram as citações do corpo do texto, não as das notas de rodapé.`,
        !!usadas.catecismo),
    ]],
    ['Orações', [
      item(link('https://liturgia.up.railway.app', 'Liturgia Diária API'),
        'Orações e antífonas da Missa do dia, na tradução litúrgica da CNBB.',
        usadas.liturgia === 'liturgia-api'),
      item('Orações tradicionais e Terço',
        'Textos nas formas tradicionais rezadas no Brasil, guardados no próprio app (funcionam sem internet).'),
    ]],
    ['Áudio e imagens', [
      item('Voz do aparelho',
        'A leitura em voz alta usa a voz instalada no celular ou no navegador (Google, Apple ou Microsoft).'),
      item(link('https://commons.wikimedia.org/wiki/File:Angelico,_pala_di_fiesole,_full.jpg', 'Fra Angelico, Retábulo de Fiesole'),
        'Imagem padrão do santo (c. 1424–25), domínio público, via Wikimedia Commons.'),
    ]],
    ['Privacidade', [
      item(link('https://www.goatcounter.com', 'GoatCounter'),
        'Estatísticas anônimas de uso (visitas, abas e recursos mais usados), sem cookies e sem dados pessoais. Ajudam a saber o que melhorar.'),
    ]],
  ];

  return secoes.map(([titulo, itens]) => `
    <section class="mt-6 first:mt-0">
      <p class="rotulo">${titulo}</p>
      <ul class="mt-3 space-y-3 text-sm">${itens.join('')}</ul>
    </section>`).join('');
}
