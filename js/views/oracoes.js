// Aba "Orações": da Missa do dia (online), Terço do dia e orações fixas (data/oracoes.json).
// Cada parte tem seu contêiner no index.html, para a Missa e o Terço mudarem com a data
// sem fechar as orações que o leitor abriu.

import { escaparHtml } from '../utils/sanitize.js';
import { botaoOuvir } from './ouvir.js';
import { botaoSalvar } from './salvos.js';
import { estaSalvo } from '../salvosService.js';
import { misteriosDoDia } from '../oracoesService.js';

const textoHtml = (t) => escaparHtml(t)
  .replace(/^([VR])\. /gm, '<span class="vr">$1.</span> ')
  .replace(/\n/g, '<br>');

// Texto falado de cada item na tela, pelo id do botão "Ouvir"
const textosAudio = new Map();
export const textoOracaoParaOuvir = (id) => textosAudio.get(id) ?? '';

let porId = new Map(); // id da oração → oração

/** Prepara o texto para a voz: sem "V."/"R." e com a Ave-Maria completa onde está abreviada. */
function paraVoz(texto) {
  const ave = porId.get('ave-maria')?.texto ?? 'Ave, Maria';
  return String(texto)
    .replace(/^[VR]\.\s*/gm, '')
    .replace(/^Ave, Maria…$/gm, ave)
    .replace(/\n/g, ' ');
}

// ---------------------------------------------------------------------------
// Orações fixas
// ---------------------------------------------------------------------------

export function renderListaOracoes(json) {
  porId = new Map(json.categorias.flatMap((c) => c.oracoes).map((o) => [o.id, o]));
  return json.categorias.map((c) => `
    <section class="bloco">
      <p class="rotulo">${escaparHtml(c.nome)}</p>
      <div class="mt-4 lista-oracoes">${c.oracoes.map(oracaoFixa).join('')}</div>
    </section>`).join('');
}

function oracaoFixa(o) {
  const idAudio = `oracao-${o.id}`;
  textosAudio.set(idAudio, `${o.titulo}. ${paraVoz(o.texto)}`);
  const item = {
    id: `oracao:${o.id}`,
    tipo: 'oracao',
    oracao: o.id,
    rotulo: o.titulo,
    trecho: o.texto.length > 160 ? `${o.texto.slice(0, 160).trimEnd()}…` : o.texto,
  };
  return `
    <details class="oracao" id="oracao-${o.id}">
      <summary>${escaparHtml(o.titulo)}</summary>
      <div class="oracao-corpo">
        ${o.nota ? `<p class="text-sm italic text-suave">${escaparHtml(o.nota)}</p>` : ''}
        <p class="${o.nota ? 'mt-2' : ''}">${textoHtml(o.texto)}</p>
        <div class="mt-3 flex items-center gap-1">
          ${botaoOuvir(idAudio, o.titulo)}
          ${botaoSalvar(item, estaSalvo(item.id))}
        </div>
      </div>
    </details>`;
}

// ---------------------------------------------------------------------------
// Terço
// ---------------------------------------------------------------------------

const ORDINAIS = ['Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto'];
const DIAS = ['aos domingos', 'às segundas', 'às terças', 'às quartas', 'às quintas', 'às sextas', 'aos sábados'];

/** @param {string} [escolhido] conjunto de mistérios escolhido pelo leitor (padrão: o do dia) */
export function renderTerco(json, dataISO, escolhido) {
  const doDia = misteriosDoDia(json, dataISO);
  const tipo = escolhido ?? doDia;
  const t = json.terco;
  const nome = (id) => porId.get(id)?.titulo ?? id;
  const dias = t.porDiaDaSemana.map((m, i) => (m === tipo ? DIAS[i] : null)).filter(Boolean);
  const passo = (p) => `${p.vezes ? `${p.vezes} ` : ''}${linkOracao(p.oracao, p.vezes ? `${nome(p.oracao)}s` : nome(p.oracao))}${p.nota ? ` <span class="text-suave">(${escaparHtml(p.nota)})</span>` : ''}`;

  const idAudio = `terco-${tipo}`;
  textosAudio.set(idAudio, textoDoTerco(json, tipo));

  return `
    <section class="bloco">
      <div class="flex items-center justify-between gap-2">
        <p class="rotulo">Terço${tipo === doDia ? ' do dia' : ''}</p>
        ${botaoOuvir(idAudio, `o Terço, ${t.nomes[tipo]}`)}
      </div>
      <h2 class="mt-2 font-bold text-liturgica">${escaparHtml(t.nomes[tipo])}</h2>
      <p class="mt-1 text-sm text-suave">Rezados ${dias.join(' e ')}.</p>

      <div class="atalhos mt-4 mb-0" role="group" aria-label="Escolher os mistérios">
        ${Object.keys(t.nomes).map((k) => `
          <button type="button" class="atalho" data-terco="${k}" aria-pressed="${k === tipo}">
            ${escaparHtml(t.nomes[k].replace('Mistérios ', ''))}${k === doDia ? ' · hoje' : ''}
          </button>`).join('')}
      </div>

      <ol class="terco mt-6">
        <li>
          <p class="font-bold">Início</p>
          <p class="text-[0.95em]">${t.inicio.map(passo).join(' · ')}</p>
        </li>
        ${t.misterios[tipo].map((m, i) => `
          <li>
            <p><span class="font-bold">${i + 1}º Mistério:</span> ${escaparHtml(m)}</p>
            <p class="text-sm text-suave">${t.dezena.map(passo).join(', ')}</p>
          </li>`).join('')}
        <li>
          <p class="font-bold">Ao final</p>
          <p class="text-[0.95em]">${t.fim.map(passo).join(' · ')}</p>
        </li>
      </ol>
    </section>`;
}

function linkOracao(id, rotulo) {
  return `<button type="button" class="link-oracao" data-ir-oracao="${escaparHtml(id)}">${escaparHtml(rotulo)}</button>`;
}

/** O Terço inteiro para ouvir: cada oração na íntegra, quantas vezes for rezada. */
function textoDoTerco(json, tipo) {
  const t = json.terco;
  const falar = (passos) => passos.flatMap((p) => {
    const o = porId.get(p.oracao);
    return o ? Array(p.vezes ?? 1).fill(paraVoz(o.texto)) : [];
  }).join(' ');
  const singular = t.nomes[tipo].replace('Mistérios ', '').replace(/s$/, '').toLowerCase();
  const dezenas = t.misterios[tipo]
    .map((m, i) => `${ORDINAIS[i]} mistério ${singular}: ${m}. ${falar(t.dezena)}`)
    .join(' ');
  return `Terço. ${t.nomes[tipo]}. ${falar(t.inicio)} ${dezenas} ${falar(t.fim)}`;
}

// ---------------------------------------------------------------------------
// Missa do dia (vem da liturgia)
// ---------------------------------------------------------------------------

/** @param {object|null} liturgia dados de getLiturgia, ou null se indisponível */
export function renderMissa(liturgia) {
  const ant = liturgia?.antifonas ?? {};
  const or = liturgia?.oracoes ?? {};
  const itens = [
    ['entrada', 'Antífona de entrada', ant.entrada, true],
    ['coleta', 'Oração do dia', or.coleta],
    ['oferendas', 'Sobre as oferendas', or.oferendas],
    ['comunhao-antifona', 'Antífona da comunhão', ant.comunhao, true],
    ['comunhao', 'Depois da comunhão', or.comunhao],
  ].filter(([, , texto]) => texto);

  if (!itens.length) {
    return `
      <section class="bloco">
        <p class="rotulo">Da Missa do dia</p>
        <p class="mt-3 text-sm italic text-suave">As orações da Missa não estão disponíveis para este dia.</p>
      </section>`;
  }
  return `
    <section class="bloco">
      <p class="rotulo">Da Missa do dia</p>
      <div class="mt-4 space-y-6">
        ${itens.map(([id, rotulo, texto, italico]) => {
          const idAudio = `missa-${id}`;
          textosAudio.set(idAudio, `${rotulo}. ${texto}`);
          return `
            <div>
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-bold">${rotulo}</p>
                ${botaoOuvir(idAudio, rotulo)}
              </div>
              <p class="mt-1 ${italico ? 'italic' : ''}">${escaparHtml(texto)}</p>
            </div>`;
        }).join('')}
      </div>
    </section>`;
}
