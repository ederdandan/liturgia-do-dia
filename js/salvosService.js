// Leituras salvas (favoritos) no localStorage.
// Cada item guarda um resumo para a lista funcionar mesmo sem rede.

const CHAVE = 'salvos:v1';

export function listarSalvos() {
  try {
    const itens = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    return Array.isArray(itens) ? itens : [];
  } catch {
    return [];
  }
}

function gravar(itens) {
  try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch { /* sem persistência */ }
  document.dispatchEvent(new CustomEvent('salvos-alterados'));
}

export function estaSalvo(id) {
  return listarSalvos().some((i) => i.id === id);
}

/** Salva ou remove o item. Retorna true se ficou salvo. */
export function alternarSalvo(item) {
  const itens = listarSalvos();
  const existe = itens.some((i) => i.id === item.id);
  gravar(existe ? itens.filter((i) => i.id !== item.id) : [{ ...item, salvoEm: Date.now() }, ...itens]);
  return !existe;
}

export function removerSalvo(id) {
  gravar(listarSalvos().filter((i) => i.id !== id));
}
