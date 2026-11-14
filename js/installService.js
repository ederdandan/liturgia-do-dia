// Convite para instalar o app (PWA).
// - Android / Chrome / Edge: usa o evento `beforeinstallprompt` e abre o diálogo nativo.
// - iPhone / iPad: não existe diálogo automático; mostra como adicionar pela tela "Compartilhar".
// - Já instalado (modo standalone) ou convite dispensado há menos de 30 dias: não aparece.

import { registrar } from './analyticsService.js';

const CHAVE_DISPENSADO = 'pref:instalar-dispensado';
const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

const el = (id) => document.getElementById(id);

function jaInstalado() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function dispensadoRecentemente() {
  try {
    return Date.now() - Number(localStorage.getItem(CHAVE_DISPENSADO) ?? 0) < TRINTA_DIAS;
  } catch {
    return false;
  }
}

function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
}

function mostrar() { el('aviso-instalar').hidden = false; }
function esconder() { el('aviso-instalar').hidden = true; }

function dispensar() {
  esconder();
  try { localStorage.setItem(CHAVE_DISPENSADO, String(Date.now())); } catch { /* sem persistência */ }
}

export function iniciarInstalacao() {
  if (jaInstalado()) return;

  let promptAdiado = null;
  el('btn-instalar-fechar').addEventListener('click', () => { dispensar(); registrar('instalar-dispensado', 'Fechou o convite de instalação'); });

  // Android / Chrome / Edge
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptAdiado = e;
    if (!dispensadoRecentemente()) mostrar();
  });
  el('btn-instalar').addEventListener('click', async () => {
    if (!promptAdiado) return;
    esconder();
    promptAdiado.prompt();
    const { outcome } = await promptAdiado.userChoice;
    promptAdiado = null;
    registrar(outcome === 'accepted' ? 'instalar-aceito' : 'instalar-recusado', 'Convite de instalação');
    if (outcome !== 'accepted') dispensar();
  });
  window.addEventListener('appinstalled', () => { esconder(); registrar('app-instalado', 'App instalado'); });

  // iPhone / iPad: instruções manuais
  if (ehIOS() && !dispensadoRecentemente()) {
    el('instalar-texto').innerHTML =
      'Toque em <strong>Compartilhar</strong> <span aria-hidden="true">⬆︎</span> e depois em <strong>Adicionar à Tela de Início</strong>.';
    el('btn-instalar').hidden = true;
    mostrar();
  }
}
