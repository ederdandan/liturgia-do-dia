// Aba "Liturgia do Dia": antífonas, leituras, salmo, Evangelho e orações.

import { escaparHtml } from '../utils/sanitize.js';
import { botaoSalvar } from './salvos.js';
import { estaSalvo } from '../salvosService.js';

const ROTULOS = {
  primeira: 'Primeira Leitura',
  salmo: 'Salmo Responsorial',
  segunda: 'Segunda Leitura',
  evangelho: 'Evangelho',
};

const CREDITOS = {
  'liturgia-api': 'Fonte: Liturgia Diária API · tradução litúrgica da CNBB',
  evangelizo: 'Fonte: <a href="https://evangelizo.org" target="_blank" rel="noopener">Evangelizo.org</a> · tradução portuguesa (fonte reserva: a fonte principal está indisponível)',
};

const textoHtml = (t) => escaparHtml(t).replace(/\n/g, '<br>');

let ctx = { data: '', tituloDia: '' }; // contexto da renderização atual

function itemSalvavel(leitura, opcao) {
  const id = `${ctx.data}:${leitura.tipo}:${leitura.referencia}`;
  const texto = leitura.versiculos.map((v) => v.texto).join(' ');
  return {
    id,
    data: ctx.data,
    tituloDia: ctx.tituloDia,
    tipo: leitura.tipo,
    rotulo: ROTULOS[leitura.tipo] + (opcao ? ` (${opcao})` : ''),
    referencia: leitura.referencia,
    trecho: texto.length > 220 ? `${texto.slice(0, 220).trimEnd()}…` : texto,
  };
}

/**
 * @param {{ dados: object, fonte: string }} resultado de getLiturgia
 * @param {string} data  AAAA-MM-DD (para salvar leituras)
 */
export function renderLiturgia({ dados, fonte }, data) {
  const partes = [];
  ctx = { data, tituloDia: dados.titulo };

  if (dados.antifonas.entrada) {
    partes.push(blocoAntifona('Antífona de entrada', dados.antifonas.entrada));
  }

  // Conta repetições de tipo (ex.: dois Evangelhos no Domingo de Páscoa)
  const totais = {};
  dados.leituras.forEach((l) => { totais[l.tipo] = (totais[l.tipo] ?? 0) + 1; });
  const vistos = {};
  for (const leitura of dados.leituras) {
    vistos[leitura.tipo] = (vistos[leitura.tipo] ?? 0) + 1;
    const opcao = totais[leitura.tipo] > 1 ? (leitura.forma || `opção ${vistos[leitura.tipo]}`) : leitura.forma;
    partes.push(leitura.tipo === 'salmo' ? blocoSalmo(leitura, opcao) : blocoLeitura(leitura, opcao));
  }

  const { coleta, oferendas, comunhao } = dados.oracoes;
  if (coleta || oferendas || comunhao || dados.antifonas.comunhao) {
    partes.push(`
      <section class="bloco">
        <p class="rotulo">Orações da Missa</p>
        <div class="mt-4 space-y-6">
          ${oracao('Oração do dia', coleta)}
          ${oracao('Sobre as oferendas', oferendas)}
          ${dados.antifonas.comunhao ? oracao('Antífona da comunhão', dados.antifonas.comunhao, true) : ''}
          ${oracao('Depois da comunhão', comunhao)}
        </div>
      </section>`);
  }

  partes.push(`<p class="credito">${CREDITOS[fonte] ?? ''}</p>`);
  return partes.join('');
}

function cabecalho(leitura, opcao) {
  const item = itemSalvavel(leitura, opcao);
  return `
    <div class="flex items-center justify-between gap-2">
      <p class="rotulo">${ROTULOS[leitura.tipo]}${opcao ? ` <span class="selo ml-1 normal-case tracking-normal">${escaparHtml(opcao)}</span>` : ''}</p>
      ${botaoSalvar(item, estaSalvo(item.id))}
    </div>
    <h2 class="mt-2 font-bold text-liturgica">${escaparHtml(leitura.referencia)}</h2>
    ${leitura.titulo && leitura.tipo !== 'salmo' ? `<p class="mt-1 text-sm italic text-suave">${escaparHtml(leitura.titulo)}</p>` : ''}
    ${leitura.nota ? `<p class="mt-1 text-xs text-suave">${escaparHtml(leitura.nota)}</p>` : ''}`;
}

function blocoLeitura(leitura, opcao) {
  const corpo = leitura.versiculos
    .map((v) => `${v.n ? `<sup>${v.n}</sup>` : ''}${textoHtml(v.texto)}`)
    .join(' ');
  return `
    <article class="bloco">
      ${cabecalho(leitura, opcao)}
      <p class="mt-5">${corpo}</p>
      ${leitura.tipo === 'evangelho'
        ? '<p class="mt-5 text-sm italic text-suave">— Palavra da Salvação. — Glória a vós, Senhor.</p>'
        : '<p class="mt-5 text-sm italic text-suave">— Palavra do Senhor. — Graças a Deus.</p>'}
    </article>`;
}

function blocoSalmo(leitura, opcao) {
  const refrao = leitura.refrao
    ? `<p class="refrao mt-5"><span class="rotulo mr-2">R.</span>${escaparHtml(leitura.refrao)}</p>`
    : '';
  const estrofes = leitura.versiculos
    .map((v) => `<p>${v.n ? `<sup>${v.n}</sup>` : ''}${textoHtml(v.texto)}</p>`)
    .join('');
  return `
    <article class="bloco">
      ${cabecalho(leitura, opcao)}
      ${refrao}
      <div class="mt-5 space-y-4">${estrofes}</div>
    </article>`;
}

function blocoAntifona(rotulo, texto) {
  return `
    <section class="bloco">
      <p class="rotulo">${rotulo}</p>
      <p class="mt-3 italic">${escaparHtml(texto)}</p>
    </section>`;
}

function oracao(rotulo, texto, italico = false) {
  if (!texto) return '';
  return `
    <div>
      <p class="text-sm font-bold">${rotulo}</p>
      <p class="mt-1 ${italico ? 'italic' : ''}">${escaparHtml(texto)}</p>
    </div>`;
}
