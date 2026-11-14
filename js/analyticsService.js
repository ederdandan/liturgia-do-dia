// Estatísticas anônimas de uso (GoatCounter: sem cookies, sem dados pessoais).
// - A visita é contada pelo script em index.html (caminho "/" no navegador, "/app" instalado).
// - Os eventos abaixo contam ações: abas, ouvir, salvar, orações, instalação, erros de fonte...
// - Sem internet, bloqueado por extensão ou em localhost: tudo vira no-op, sem erros.

const fila = [];

function enviar(ev) {
  try { window.goatcounter.count(ev); } catch { /* estatística nunca quebra o app */ }
}

/**
 * Registra um evento. O nome vira o "caminho" no painel do GoatCounter.
 * @param {string} nome    ex.: "aba-santo", "ouvir", "erro-liturgia"
 * @param {string} [titulo] texto legível no painel
 */
export function registrar(nome, titulo = nome) {
  const ev = { path: nome, title: titulo, event: true };
  if (window.goatcounter?.count) enviar(ev);
  else if (fila.length < 20) fila.push(ev); // script ainda carregando
}

/** Envia os eventos que chegaram antes de o script do GoatCounter terminar de carregar. */
export function iniciarEstatisticas() {
  const esvaziar = () => { if (window.goatcounter?.count) fila.splice(0).forEach(enviar); };
  if (window.goatcounter?.count) esvaziar();
  else document.querySelector('script[data-goatcounter]')?.addEventListener('load', esvaziar);
}
