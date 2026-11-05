// Interface: preferências do leitor (tema, fonte, foco), abas, skeletons e mensagens de erro.

import { escaparHtml } from './utils/sanitize.js';

const raiz = document.documentElement;

// ---------------------------------------------------------------------------
// Preferências (localStorage com tolerância a falhas)
// ---------------------------------------------------------------------------

function lerPref(chave, padrao) {
  try { return localStorage.getItem(`pref:${chave}`) ?? padrao; } catch { return padrao; }
}

function gravarPref(chave, valor) {
  try { localStorage.setItem(`pref:${chave}`, valor); } catch { /* sem persistência */ }
}

// Tema --------------------------------------------------------------------

const TEMAS = ['light', 'sepia', 'dark'];
const NOMES_TEMA = { light: 'claro', sepia: 'sépia', dark: 'escuro' };

export function alternarTema() {
  const atual = raiz.dataset.theme ?? 'light';
  const proximo = TEMAS[(TEMAS.indexOf(atual) + 1) % TEMAS.length];
  raiz.dataset.theme = proximo;
  gravarPref('tema', proximo);
  atualizarRotuloTema();
}

function atualizarRotuloTema() {
  const btn = document.getElementById('btn-tema');
  const nome = NOMES_TEMA[raiz.dataset.theme] ?? 'claro';
  btn.title = `Tema: ${nome}`;
  btn.setAttribute('aria-label', `Tema atual: ${nome}. Alternar tema`);
}

// Fonte -------------------------------------------------------------------

const ESCALAS = [0.875, 1, 1.125, 1.25, 1.375, 1.5];

export function mudarFonte(passo) {
  const atual = Number(lerPref('fonte', '1'));
  let i = ESCALAS.indexOf(atual);
  if (i === -1) i = 1;
  const nova = ESCALAS[Math.min(ESCALAS.length - 1, Math.max(0, i + passo))];
  raiz.style.setProperty('--escala-fonte', String(nova));
  gravarPref('fonte', String(nova));
}

// Modo foco ---------------------------------------------------------------

export function alternarFoco(ativar = !document.body.classList.contains('modo-foco')) {
  document.body.classList.toggle('modo-foco', ativar);
  if (ativar) document.getElementById('btn-sair-foco').focus();
}

// ---------------------------------------------------------------------------
// Abas (padrão WAI-ARIA: setas, Home/End)
// ---------------------------------------------------------------------------

let selecionarInterno = () => {};

/** Abre uma aba pelo nome ("liturgia", "santo", ...). */
export function selecionarAba(nome) {
  const aba = document.querySelector(`[role="tab"][data-aba="${nome}"]`);
  if (aba) selecionarInterno(aba);
}

export function iniciarAbas() {
  const abas = [...document.querySelectorAll('[role="tab"]')];
  const selecionar = selecionarInterno = (aba, focar = false) => {
    for (const a of abas) {
      const ativa = a === aba;
      a.setAttribute('aria-selected', String(ativa));
      a.tabIndex = ativa ? 0 : -1;
      document.getElementById(a.getAttribute('aria-controls')).hidden = !ativa;
    }
    if (focar) aba.focus();
    gravarPref('aba', aba.dataset.aba);
  };

  abas.forEach((aba, i) => {
    aba.type = 'button';
    aba.addEventListener('click', () => {
      selecionar(aba);
      // No celular (barra inferior), cada aba abre do início, como num app
      if (matchMedia('(max-width: 767px)').matches) window.scrollTo({ top: 0 });
    });
    aba.addEventListener('keydown', (e) => {
      const destino = {
        ArrowRight: abas[(i + 1) % abas.length],
        ArrowLeft: abas[(i - 1 + abas.length) % abas.length],
        Home: abas[0],
        End: abas[abas.length - 1],
      }[e.key];
      if (destino) { e.preventDefault(); selecionar(destino, true); }
    });
  });

  const salva = abas.find((a) => a.dataset.aba === lerPref('aba', 'liturgia'));
  selecionar(salva ?? abas[0]);
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

export function iniciarControles() {
  atualizarRotuloTema();
  document.getElementById('btn-tema').addEventListener('click', alternarTema);
  document.getElementById('btn-fonte-menos').addEventListener('click', () => mudarFonte(-1));
  document.getElementById('btn-fonte-mais').addEventListener('click', () => mudarFonte(1));
  document.getElementById('btn-foco').addEventListener('click', () => alternarFoco(true));
  document.getElementById('btn-sair-foco').addEventListener('click', () => alternarFoco(false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.body.classList.contains('modo-foco')) alternarFoco(false);
    fecharAjustes();
  });
  iniciarMenuAjustes();
  iniciarAbas();
}

// Menu "Aa" (celular) ------------------------------------------------------

function fecharAjustes() {
  document.getElementById('controles').classList.remove('aberto');
  document.getElementById('btn-ajustes').setAttribute('aria-expanded', 'false');
}

function iniciarMenuAjustes() {
  const botao = document.getElementById('btn-ajustes');
  const menu = document.getElementById('controles');
  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = !menu.classList.contains('aberto');
    menu.classList.toggle('aberto', abrir);
    botao.setAttribute('aria-expanded', String(abrir));
  });
  // Fecha ao tocar fora; toques dentro (A-, A+, tema) mantêm aberto para ajustes seguidos
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) fecharAjustes();
  });
  document.getElementById('btn-foco').addEventListener('click', fecharAjustes);
}

// ---------------------------------------------------------------------------
// Skeletons e erros
// ---------------------------------------------------------------------------

/** Placeholder de texto: `linhas` barras com larguras variadas. */
export function skeletonTexto(linhas = 6) {
  const larguras = ['100%', '96%', '92%', '98%', '85%', '60%'];
  return `<div class="space-y-3" aria-hidden="true">${Array.from({ length: linhas }, (_, i) =>
    `<div class="skeleton h-4" style="width:${larguras[i % larguras.length]}"></div>`).join('')}</div>`;
}

export function skeletonBloco(blocos = 2) {
  return `<div aria-busy="true" aria-label="Carregando">${Array.from({ length: blocos }, () => `
    <div class="bloco">
      <div class="skeleton h-3 w-32 mb-3"></div>
      <div class="skeleton h-5 w-48 mb-6"></div>
      ${skeletonTexto(6)}
    </div>`).join('')}</div>`;
}

/** Mensagem de erro amigável com botão "Tentar novamente". */
export function erroHtml(titulo, detalhe = '') {
  return `
    <div class="rounded-lg border border-borda bg-superficie p-6 text-center" role="alert">
      <p class="font-display text-base">${escaparHtml(titulo)}</p>
      ${detalhe ? `<p class="mt-2 text-sm text-suave">${escaparHtml(detalhe)}</p>` : ''}
      <button type="button" data-acao="recarregar" class="mt-4 text-sm text-liturgica underline underline-offset-4">Tentar novamente</button>
    </div>`;
}
