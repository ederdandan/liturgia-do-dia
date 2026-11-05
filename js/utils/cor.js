// Cores litúrgicas: normalização e inferência pelo título litúrgico.

export const CORES = ['verde', 'branco', 'vermelho', 'roxo', 'rosa'];

function semAcento(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** "Branco" → "branco"; "Violeta"/"Roxo" → "roxo". Retorna null se desconhecida. */
export function normalizarCor(cor) {
  const c = semAcento(cor);
  if (!c) return null;
  if (c.startsWith('verd')) return 'verde';
  if (c.startsWith('branc') || c.startsWith('dourad')) return 'branco';
  if (c.startsWith('vermelh')) return 'vermelho';
  if (c.startsWith('rox') || c.startsWith('violet')) return 'roxo';
  if (c.startsWith('rosa') || c.startsWith('rose')) return 'rosa';
  return null;
}

/**
 * Inferência aproximada da cor a partir do título litúrgico (usada só quando a fonte
 * primária falha). Não conhece todas as festas; o resultado é marcado como "inferida".
 */
export function inferirCor(titulo) {
  const t = semAcento(titulo);
  if (!t) return null;
  if (/3.? domingo do advento|4.? domingo da quaresma/.test(t)) return 'rosa';
  if (/ramos|paixao|sexta-feira santa|pentecostes|martir|apostol|evangelista/.test(t)) return 'vermelho';
  if (/advento|quaresma|cinzas|fieis defuntos/.test(t)) return 'roxo';
  if (/pascoa|natal|epifania|santissima trindade|corpo e sangue|sagrado coracao|cristo rei|nossa senhora|virgem maria|todos os santos/.test(t)) return 'branco';
  if (/tempo comum/.test(t)) return 'verde';
  return null;
}
