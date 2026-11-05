// Aba "Salvos": lista de leituras guardadas, da mais recente para a mais antiga.

import { escaparHtml } from '../utils/sanitize.js';
import { formatarExtenso } from '../utils/date.js';

export const ICONE_MARCADOR = `
  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <path d="M6 3h12v18l-6-4-6 4z"/>
  </svg>`;

/** Botão de salvar para uma leitura. `item` é guardado em data-salvar. */
export function botaoSalvar(item, salvo) {
  return `
    <button type="button" class="btn-icone btn-salvar" data-acao="salvar"
            data-salvar="${escaparHtml(JSON.stringify(item))}" aria-pressed="${salvo}"
            aria-label="${salvo ? 'Remover dos salvos' : 'Salvar leitura'}" title="${salvo ? 'Remover dos salvos' : 'Salvar leitura'}">
      ${ICONE_MARCADOR}
    </button>`;
}

export function renderSalvos(itens) {
  if (!itens.length) {
    return `
      <p class="rotulo">Leituras salvas</p>
      <p class="mt-4 italic text-suave">Nenhuma leitura salva ainda. Use o marcador ao lado de cada leitura para guardá-la aqui.</p>`;
  }
  return `
    <p class="rotulo">Leituras salvas</p>
    <ul class="mt-6 space-y-6">
      ${itens.map((i) => `
        <li class="rounded-lg border border-borda p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs text-suave">${escaparHtml(formatarExtenso(i.data))} · ${escaparHtml(i.tituloDia ?? '')}</p>
              <a href="#${escaparHtml(i.data)}" data-ir-liturgia class="mt-1 block font-bold text-liturgica underline-offset-4 hover:underline">
                ${escaparHtml(i.rotulo)} — ${escaparHtml(i.referencia)}
              </a>
              <p class="mt-2 text-[0.95em] text-suave">${escaparHtml(i.trecho)}</p>
            </div>
            <button type="button" class="btn-icone" data-acao="remover-salvo" data-id="${escaparHtml(i.id)}"
                    aria-label="Remover dos salvos" title="Remover">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>
        </li>`).join('')}
    </ul>`;
}
