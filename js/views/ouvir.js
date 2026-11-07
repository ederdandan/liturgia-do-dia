// Botão "Ouvir" compartilhado (leituras e orações). O app liga o clique ao audioService.

import { escaparHtml } from '../utils/sanitize.js';
import { audioDisponivel } from '../audioService.js';

const ICONE_OUVIR = `
  <svg class="icone-ouvir" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>
  </svg>
  <svg class="icone-pausar" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6.5" y="5" width="3.8" height="14" rx="1"/><rect x="13.7" y="5" width="3.8" height="14" rx="1"/>
  </svg>`;

export function botaoOuvir(id, rotulo) {
  if (!audioDisponivel()) return '';
  return `
    <button type="button" class="btn-ouvir" data-acao="ouvir" data-alvo="${id}" data-estado="parado"
            aria-pressed="false" aria-label="Ouvir ${escaparHtml(rotulo)}" title="Ouvir">
      ${ICONE_OUVIR}<span class="btn-ouvir-texto">Ouvir</span>
    </button>`;
}
