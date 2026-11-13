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
  const nome = NOMES_TEMA[raiz.dataset.theme] ?? 'claro';
  document.getElementById('tema-nome').textContent = nome;
  document.getElementById('btn-tema').setAttribute('aria-label', `Tema atual: ${nome}. Alternar tema`);
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
  atualizarRotuloFonte();
}

function atualizarRotuloFonte() {
  const escala = Number(lerPref('fonte', '1')) || 1;
  document.getElementById('fonte-valor').textContent = `${Math.round(escala * 100)}%`;
  document.getElementById('btn-fonte-menos').disabled = escala <= ESCALAS[0];
  document.getElementById('btn-fonte-mais').disabled = escala >= ESCALAS[ESCALAS.length - 1];
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

// Deslizar para trocar de aba (só no celular) -------------------------------

const CELULAR = '(max-width: 767px)';

/** Elemento (ou ancestral) que rola na horizontal: o gesto é dele, não da troca de aba. */
function rolaDeLado(el) {
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}

function iniciarDeslize() {
  const area = document.getElementById('conteudo');
  let inicio = null;

  area.addEventListener('touchstart', (e) => {
    inicio = null;
    if (!matchMedia(CELULAR).matches || e.touches.length !== 1) return;
    const t = e.touches[0];
    // Bordas da tela: gesto de "voltar" do sistema (Android/iPhone)
    if (t.clientX < 24 || t.clientX > innerWidth - 24) return;
    if (e.target.closest('input, textarea, select, [contenteditable], details, .sem-deslize') || rolaDeLado(e.target)) return;
    inicio = { x: t.clientX, y: t.clientY, tempo: Date.now() };
  }, { passive: true });

  area.addEventListener('touchend', (e) => {
    if (!inicio) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    const rapido = Date.now() - inicio.tempo < 700;
    inicio = null;
    if (!rapido || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (String(getSelection?.() ?? '').length) return; // selecionando texto

    const abas = [...document.querySelectorAll('[role="tab"]')];
    const i = abas.findIndex((a) => a.getAttribute('aria-selected') === 'true');
    const destino = abas[i + (dx < 0 ? 1 : -1)];
    if (!destino) return; // já na primeira/última aba
    destino.click(); // seleciona e volta ao topo, como o toque na barra
    const painel = document.getElementById(destino.getAttribute('aria-controls'));
    painel.classList.remove('entrar-dir', 'entrar-esq');
    void painel.offsetWidth; // reinicia a animação
    painel.classList.add(dx < 0 ? 'entrar-dir' : 'entrar-esq');
  }, { passive: true });

  area.addEventListener('touchcancel', () => { inicio = null; }, { passive: true });
  area.addEventListener('animationend', (e) => e.target.classList?.remove('entrar-dir', 'entrar-esq'));
}

// Painéis em folha ("Fontes e créditos", "Salvos") ----------------------------

/**
 * Liga um botão do topo a um <dialog class="folha">.
 * @param {string} nome  "fontes" → #btn-fontes, #dialogo-fontes, #fontes-conteudo
 * @param {() => string} conteudo  HTML gerado na hora de abrir (sempre com os dados atuais)
 * @returns {{ abrir: () => void, fechar: () => void, atualizar: () => void }}
 */
export function iniciarFolha(nome, conteudo) {
  const dialogo = document.getElementById(`dialogo-${nome}`);
  const botao = document.getElementById(`btn-${nome}`);
  const corpo = document.getElementById(`${nome}-conteudo`);
  const atualizar = () => { if (dialogo.open) corpo.innerHTML = conteudo(); };
  const abrir = () => { corpo.innerHTML = conteudo(); if (!dialogo.open) dialogo.showModal(); };
  const fechar = () => { if (dialogo.open) dialogo.close(); };
  if (!dialogo?.showModal) { botao.hidden = true; return { abrir() {}, fechar() {}, atualizar() {} }; }

  botao.addEventListener('click', abrir);
  dialogo.addEventListener('click', (e) => {
    // Botão fechar, ou toque no fundo escurecido (fora do conteúdo)
    if (e.target === dialogo || e.target.closest('[data-fechar-folha]')) fechar();
  });
  // Volta o foco ao botão sem rolar a página (o leitor pode ter ido para outra parte)
  dialogo.addEventListener('close', () => botao.focus({ preventScroll: true }));
  return { abrir, fechar, atualizar };
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

export function iniciarControles() {
  atualizarRotuloTema();
  atualizarRotuloFonte();
  document.getElementById('btn-tema').addEventListener('click', alternarTema);
  document.getElementById('btn-fonte-menos').addEventListener('click', () => mudarFonte(-1));
  document.getElementById('btn-fonte-mais').addEventListener('click', () => mudarFonte(1));
  document.getElementById('btn-foco').addEventListener('click', () => alternarFoco(true));
  document.getElementById('btn-sair-foco').addEventListener('click', () => alternarFoco(false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.body.classList.contains('modo-foco')) alternarFoco(false);
  });
  iniciarMenuMais();
  iniciarAbas();
  iniciarDeslize();
}

// Menu ⋮ "Mais opções" -------------------------------------------------------

function iniciarMenuMais() {
  const botao = document.getElementById('btn-mais');
  const menu = document.getElementById('menu-mais');
  const itens = () => [...menu.querySelectorAll('[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]')];

  const fechar = (devolverFoco = false) => {
    if (menu.hidden) return;
    menu.hidden = true;
    botao.setAttribute('aria-expanded', 'false');
    if (devolverFoco) botao.focus();
  };
  const abrir = (focarPrimeiro) => {
    menu.hidden = false;
    botao.setAttribute('aria-expanded', 'true');
    if (focarPrimeiro) itens()[0]?.focus();
  };

  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    // e.detail === 0: aberto pelo teclado (Enter/Espaço) → foco no primeiro item
    if (menu.hidden) abrir(e.detail === 0); else fechar();
  });
  // Fecha ao tocar fora. Tamanho do texto e tema mantêm aberto, para ajustes seguidos.
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== botao) fechar();
  });
  document.getElementById('btn-foco').addEventListener('click', () => fechar());
  document.getElementById('btn-fontes').addEventListener('click', () => fechar());

  // Teclado: setas percorrem os itens, Esc fecha, Tab sai do menu
  menu.addEventListener('keydown', (e) => {
    const lista = itens();
    const i = lista.indexOf(document.activeElement);
    const destino = { ArrowDown: lista[(i + 1) % lista.length], ArrowUp: lista[(i - 1 + lista.length) % lista.length],
      Home: lista[0], End: lista[lista.length - 1] }[e.key];
    if (destino) { e.preventDefault(); destino.focus(); }
    if (e.key === 'Escape') { e.stopPropagation(); fechar(true); }
    if (e.key === 'Tab') fechar();
  });
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

/**
 * Carregamento com mensagem: indicador girando + texto, e uma dica que só aparece
 * se a espera passar de alguns segundos (via CSS, sem timers). Abaixo, o skeleton.
 */
export function carregandoHtml(texto, dica = '', blocos = 2) {
  return `
    <div role="status" class="carregando">
      <span class="giro" aria-hidden="true"></span>
      <span>${escaparHtml(texto)}</span>
    </div>
    ${dica ? `<p class="carregando-dica text-sm text-suave">${escaparHtml(dica)}</p>` : ''}
    <div class="mt-6">${skeletonBloco(blocos)}</div>`;
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
