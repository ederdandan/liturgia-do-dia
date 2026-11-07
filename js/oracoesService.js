// Orações fixas (tradicionais, marianas e roteiro do Terço): arquivo local data/oracoes.json.
// As orações da Missa do dia vêm da liturgia (Liturgia Diária API), já carregada pelo app.

let base = null; // Promise<json>

export function getOracoes() {
  if (!base) {
    base = fetch('data/oracoes.json')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch((e) => { base = null; throw e; });
  }
  return base;
}

/** Mistérios do Terço para uma data AAAA-MM-DD, conforme o dia da semana. */
export function misteriosDoDia(json, dataISO) {
  const [a, m, d] = dataISO.split('-').map(Number);
  return json.terco.porDiaDaSemana[new Date(a, m - 1, d).getDay()];
}
