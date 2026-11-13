// Atualizações do app (service worker).
// - Uma nova versão fica "em espera" até a página pedir para ativá-la.
// - "Atualizar sozinho" ligado (padrão): ativa e recarrega na hora.
// - Desligado: mostra um aviso com o botão "Atualizar".
// - Procura novas versões ao abrir o app e sempre que ele volta a ficar visível.

const CHAVE_AUTO = 'pref:atualizar-sozinho';
const el = (id) => document.getElementById(id);

function autoLigado() {
  try { return localStorage.getItem(CHAVE_AUTO) !== '0'; } catch { return true; }
}

function definirAuto(ligado) {
  try { localStorage.setItem(CHAVE_AUTO, ligado ? '1' : '0'); } catch { /* sem persistência */ }
  atualizarRotulo();
}

function atualizarRotulo() {
  const ligado = autoLigado();
  el('btn-auto-atualizar').setAttribute('aria-checked', String(ligado));
  el('auto-atualizar-estado').textContent = ligado ? 'Ligado' : 'Desligado';
}

function mostrarVersao() {
  const v = self.APP_VERSAO;
  if (v) el('versao-app').textContent = `Versão ${v}`;
}

let reg = null;

function ativar(worker) {
  el('aviso-atualizar').hidden = true;
  worker.postMessage({ tipo: 'ativar' });
}

function novaVersaoPronta(worker) {
  if (!navigator.serviceWorker.controller) return; // primeira instalação: nada a atualizar
  if (autoLigado()) ativar(worker);
  else el('aviso-atualizar').hidden = false;
}

function acompanhar(worker) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') novaVersaoPronta(worker);
  });
}

export function iniciarAtualizacoes() {
  mostrarVersao();
  atualizarRotulo();
  el('btn-auto-atualizar').addEventListener('click', () => {
    const ligar = !autoLigado();
    definirAuto(ligar);
    if (ligar && reg?.waiting) ativar(reg.waiting);
  });
  el('btn-atualizar-agora').addEventListener('click', () => { if (reg?.waiting) ativar(reg.waiting); });
  el('btn-atualizar-fechar').addEventListener('click', () => { el('aviso-atualizar').hidden = true; });

  // Uso offline: o service worker só funciona via http(s), não em file://
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  // Quando a nova versão assume, recarrega uma única vez para usar os arquivos novos
  const tinhaControle = Boolean(navigator.serviceWorker.controller);
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaControle || recarregando) return;
    recarregando = true;
    location.reload();
  });

  navigator.serviceWorker.register('sw.js').then((r) => {
    reg = r;
    if (r.waiting) novaVersaoPronta(r.waiting);
    if (r.installing) acompanhar(r.installing);
    r.addEventListener('updatefound', () => acompanhar(r.installing));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') r.update().catch(() => {});
    });
  }).catch((e) => console.warn('Service worker não registrado', e));
}
