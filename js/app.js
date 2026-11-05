// Ponto de entrada: estado da data (no hash da URL), carregamento dos blocos e renderização.

import { getLiturgia, getSanto, getReflexao } from './apiService.js';
import { iniciarControles, skeletonBloco, erroHtml, selecionarAba } from './uiService.js';
import { listarSalvos, alternarSalvo, removerSalvo } from './salvosService.js';
import { renderSalvos } from './views/salvos.js';
import { renderLiturgia } from './views/liturgia.js';
import { renderSanto, IMAGEM_PADRAO } from './views/santo.js';
import { renderReflexao } from './views/reflexao.js';
import { getCatena } from './catenaService.js';
import { renderCatena } from './views/catena.js';
import { hojeISO, ehDataISO, somarDias, formatarExtenso } from './utils/date.js';

const el = (id) => document.getElementById(id);
const NOMES_COR = { verde: 'verde', branco: 'branco', vermelho: 'vermelho', roxo: 'roxo', rosa: 'rosa' };

let dataAtual = null;
let geracao = 0; // descarta respostas de datas que já não estão na tela

// ---------------------------------------------------------------------------
// Data e roteamento (#AAAA-MM-DD)
// ---------------------------------------------------------------------------

function dataDoHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  return ehDataISO(h) ? h : hojeISO();
}

function irPara(data) {
  if (data === dataAtual) return;
  location.hash = data;
}

function aoMudarHash() {
  carregar(dataDoHash());
}

// ---------------------------------------------------------------------------
// Carregamento
// ---------------------------------------------------------------------------

async function carregar(data) {
  dataAtual = data;
  const minhaGeracao = ++geracao;
  const atual = () => minhaGeracao === geracao;

  // Cabeçalho imediato
  el('data-extenso').textContent = formatarExtenso(data);
  el('seletor-data').value = data;
  el('btn-hoje').classList.toggle('hidden', data === hojeISO());
  el('titulo-liturgico').innerHTML = '<span class="skeleton inline-block h-6 w-64 align-middle"></span>';
  el('cor-nome').textContent = '';
  delete document.documentElement.dataset.cor;

  el('painel-liturgia').innerHTML = skeletonBloco(3);
  el('painel-santo').innerHTML = `<div class="skeleton h-72 w-full rounded-lg"></div><div class="mt-6">${skeletonBloco(1)}</div>`;

  el('painel-reflexao').innerHTML = skeletonBloco(1);
  el('painel-catena').innerHTML = skeletonBloco(2);

  const liturgiaP = getLiturgia(data);
  const santoP = getSanto(data, liturgiaP);
  const reflexaoP = getReflexao(data, liturgiaP);

  // Catena: depende da referência do(s) Evangelho(s) do dia
  liturgiaP
    .then((res) => Promise.all(res.dados.leituras
      .filter((l) => l.tipo === 'evangelho')
      .map((l) => getCatena(l.referencia))))
    .then((resultados) => {
      if (atual()) el('painel-catena').innerHTML = renderCatena(resultados);
    })
    .catch((e) => {
      if (!atual()) return;
      console.warn(e);
      el('painel-catena').innerHTML = erroHtml('Não foi possível carregar a Catena Aurea.');
    });

  reflexaoP
    .then((res) => {
      if (atual()) el('painel-reflexao').innerHTML = renderReflexao(res);
    })
    .catch((e) => {
      if (!atual()) return;
      console.warn(e, e.tentativas);
      el('painel-reflexao').innerHTML = erroHtml('Não foi possível carregar a reflexão do dia.');
    });

  liturgiaP
    .then((res) => {
      if (!atual()) return;
      renderCabecalho(res.dados);
      el('painel-liturgia').innerHTML = renderLiturgia(res, data);
    })
    .catch((e) => {
      if (!atual()) return;
      console.warn(e, e.tentativas);
      el('titulo-liturgico').textContent = 'Liturgia indisponível';
      el('painel-liturgia').innerHTML = erroHtml(
        'Não foi possível carregar a liturgia deste dia.',
        'Verifique sua conexão. As fontes consultadas não responderam.',
      );
    });

  santoP
    .then(async (res) => {
      const liturgia = await liturgiaP.then((r) => r.dados).catch(() => null);
      if (!atual()) return;
      el('painel-santo').innerHTML = renderSanto(res, liturgia);
    })
    .catch((e) => {
      if (!atual()) return;
      console.warn(e, e.tentativas);
      el('painel-santo').innerHTML = `
        <figure class="overflow-hidden rounded-lg bg-superficie">
          <img src="${IMAGEM_PADRAO}" alt="Pintura clássica de santos (Fra Angelico)" class="mx-auto max-h-[28rem] w-auto object-contain">
        </figure>
        <div class="mt-6">${erroHtml('Não foi possível carregar o santo do dia.', 'Pode não haver memória de santo nesta data, ou as fontes não responderam.')}</div>`;
    });
}

function renderCabecalho(liturgia) {
  el('titulo-liturgico').textContent = liturgia.titulo || '—';
  document.title = `${liturgia.titulo} — Liturgia do Dia`;
  if (liturgia.cor) {
    document.documentElement.dataset.cor = liturgia.cor;
    el('cor-nome').textContent = `Cor litúrgica: ${NOMES_COR[liturgia.cor]}${liturgia.corInferida ? ' (estimada)' : ''}`;
  }
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

function iniciarEventos() {
  el('btn-anterior').addEventListener('click', () => irPara(somarDias(dataAtual, -1)));
  el('btn-proximo').addEventListener('click', () => irPara(somarDias(dataAtual, 1)));
  el('btn-hoje').addEventListener('click', () => irPara(hojeISO()));
  el('seletor-data').addEventListener('change', (e) => {
    if (ehDataISO(e.target.value)) irPara(e.target.value);
  });

  document.addEventListener('click', (e) => {
    // "Tentar novamente" nos blocos com erro
    if (e.target.closest('[data-acao="recarregar"]')) carregar(dataAtual);

    // Salvar / remover leitura
    const btnSalvar = e.target.closest('[data-acao="salvar"]');
    if (btnSalvar) {
      const salvo = alternarSalvo(JSON.parse(btnSalvar.dataset.salvar));
      btnSalvar.setAttribute('aria-pressed', String(salvo));
      const rotulo = salvo ? 'Remover dos salvos' : 'Salvar leitura';
      btnSalvar.setAttribute('aria-label', rotulo);
      btnSalvar.title = rotulo;
    }
    const btnRemover = e.target.closest('[data-acao="remover-salvo"]');
    if (btnRemover) {
      removerSalvo(btnRemover.dataset.id);
      // Desmarca o botão correspondente se a leitura estiver na tela
      for (const b of document.querySelectorAll('[data-acao="salvar"][aria-pressed="true"]')) {
        if (JSON.parse(b.dataset.salvar).id === btnRemover.dataset.id) b.setAttribute('aria-pressed', 'false');
      }
    }

    // Link de um item salvo: abre a data na aba Liturgia
    if (e.target.closest('[data-ir-liturgia]')) selecionarAba('liturgia');
  });

  document.addEventListener('salvos-alterados', renderPainelSalvos);

  // Imagens com reservas: tenta a próxima URL quando uma falha
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.reservas) return;
    const [proxima, ...resto] = img.dataset.reservas.split('|').filter(Boolean);
    img.dataset.reservas = resto.join('|');
    if (proxima) img.src = proxima;
  }, true);

  window.addEventListener('hashchange', aoMudarHash);
}

function renderPainelSalvos() {
  el('painel-salvos').innerHTML = renderSalvos(listarSalvos());
}

// Uso offline: o service worker só funciona via http(s), não em file://
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker não registrado', e));
}

iniciarControles();
iniciarEventos();
renderPainelSalvos();
aoMudarHash();
registrarServiceWorker();
