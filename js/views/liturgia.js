// Aba "Liturgia do Dia": leituras, salmo e Evangelho, com atalhos no topo para cada um.

import { escaparHtml } from '../utils/sanitize.js';
import { botaoSalvar } from './salvos.js';
import { estaSalvo } from '../salvosService.js';

const ROTULOS = {
  primeira: 'Primeira Leitura',
  salmo: 'Salmo Responsorial',
  segunda: 'Segunda Leitura',
  evangelho: 'Evangelho',
};

const ATALHOS = {
  primeira: '1ª Leitura',
  salmo: 'Salmo',
  segunda: '2ª Leitura',
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
  const leituras = dados.leituras.filter((l) => ROTULOS[l.tipo]);

  // Conta repetições de tipo (ex.: dois Evangelhos no Domingo de Páscoa)
  const totais = {};
  leituras.forEach((l) => { totais[l.tipo] = (totais[l.tipo] ?? 0) + 1; });
  const vistos = {};
  for (const leitura of leituras) {
    vistos[leitura.tipo] = (vistos[leitura.tipo] ?? 0) + 1;
    const opcao = totais[leitura.tipo] > 1 ? (leitura.forma || `opção ${vistos[leitura.tipo]}`) : leitura.forma;
    // Âncora só na primeira ocorrência de cada tipo (é para lá que o atalho leva)
    const ancora = vistos[leitura.tipo] === 1 ? `leitura-${leitura.tipo}` : '';
    partes.push(leitura.tipo === 'salmo' ? blocoSalmo(leitura, opcao, ancora) : blocoLeitura(leitura, opcao, ancora));
  }

  partes.unshift(atalhos(leituras));
  partes.push(`<p class="credito">${CREDITOS[fonte] ?? ''}</p>`);
  return partes.join('');
}

/** Botões no topo que rolam até cada leitura, na ordem em que aparecem. */
function atalhos(leituras) {
  const tipos = [...new Set(leituras.map((l) => l.tipo))];
  if (tipos.length < 2) return '';
  return `
    <nav class="atalhos" aria-label="Ir para a leitura">
      ${tipos.map((t) => `<button type="button" class="atalho" data-ir-para="leitura-${t}">${ATALHOS[t]}</button>`).join('')}
    </nav>`;
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

function blocoLeitura(leitura, opcao, ancora) {
  const corpo = leitura.versiculos
    .map((v) => `${v.n ? `<sup>${v.n}</sup>` : ''}${textoHtml(v.texto)}`)
    .join(' ');
  return `
    <article class="bloco"${ancora ? ` id="${ancora}"` : ''}>
      ${cabecalho(leitura, opcao)}
      <p class="mt-5">${corpo}</p>
      ${leitura.tipo === 'evangelho'
        ? '<p class="mt-5 text-sm italic text-suave">— Palavra da Salvação. — Glória a vós, Senhor.</p>'
        : '<p class="mt-5 text-sm italic text-suave">— Palavra do Senhor. — Graças a Deus.</p>'}
    </article>`;
}

function blocoSalmo(leitura, opcao, ancora) {
  const refrao = leitura.refrao
    ? `<p class="refrao mt-5"><span class="rotulo mr-2">R.</span>${escaparHtml(leitura.refrao)}</p>`
    : '';
  const estrofes = leitura.versiculos
    .map((v) => `<p>${v.n ? `<sup>${v.n}</sup>` : ''}${textoHtml(v.texto)}</p>`)
    .join('');
  return `
    <article class="bloco"${ancora ? ` id="${ancora}"` : ''}>
      ${cabecalho(leitura, opcao)}
      ${refrao}
      <div class="mt-5 space-y-4">${estrofes}</div>
    </article>`;
}
