// Mapeamento de abreviaturas bíblicas.
// A Evangelizo usa o padrão da Bíblia de Jerusalém francesa (ex.: "1_R", "Nb", "Sg", "Ph").
// A Liturgia API e a interface usam o padrão da CNBB (ex.: "1Rs", "Nm", "Sb", "Fl").

export const EVANGELIZO_PARA_PT = {
  Gn: 'Gn', Ex: 'Ex', Lv: 'Lv', Nb: 'Nm', Dt: 'Dt',
  Jos: 'Js', Jg: 'Jz', Rt: 'Rt', '1_S': '1Sm', '2_S': '2Sm', '1_R': '1Rs', '2_R': '2Rs',
  '1_Ch': '1Cr', '2_Ch': '2Cr', Esd: 'Esd', Ne: 'Ne', Tb: 'Tb', Jdt: 'Jt', Est: 'Est',
  '1_M': '1Mc', '2_M': '2Mc', Jb: 'Jó', Ps: 'Sl', Pr: 'Pr', Qo: 'Ecl', Ct: 'Ct',
  Sg: 'Sb', Si: 'Eclo', Is: 'Is', Jr: 'Jr', Lm: 'Lm', Ba: 'Br', Ez: 'Ez', Dn: 'Dn',
  Os: 'Os', Jl: 'Jl', Am: 'Am', Ab: 'Ab', Jon: 'Jn', Mi: 'Mq', Na: 'Na', Ha: 'Hab',
  So: 'Sf', Ag: 'Ag', Za: 'Zc', Ml: 'Ml',
  Mt: 'Mt', Mc: 'Mc', Lc: 'Lc', Jn: 'Jo',
  Ac: 'At', Rm: 'Rm', '1_Co': '1Cor', '2_Co': '2Cor', Ga: 'Gl', Ep: 'Ef', Ph: 'Fl',
  Col: 'Cl', '1_Th': '1Ts', '2_Th': '2Ts', '1_Tm': '1Tm', '2_Tm': '2Tm', Tt: 'Tt',
  Phm: 'Fm', He: 'Hb', Jc: 'Tg', '1_P': '1Pd', '2_P': '2Pd',
  '1_Jn': '1Jo', '2_Jn': '2Jo', '3_Jn': '3Jo', Jude: 'Jd', Ap: 'Ap',
};

/** Livros dos Evangelhos no padrão CNBB (usados pela Catena Aurea). */
export const EVANGELHOS = ['Mt', 'Mc', 'Lc', 'Jo'];

/** Converte um código de livro da Evangelizo para a abreviatura PT. Mantém o original se desconhecido. */
export function livroEvangelizoParaPt(codigo) {
  return EVANGELIZO_PARA_PT[codigo] ?? codigo.replace('_', '');
}

/**
 * Converte a referência da Evangelizo para o padrão PT.
 *   "1_Th 4,13-18"                    → "1Ts 4,13-18"
 *   "Ps 63,2-2#Ps 63,3-4#Ps 63,5-6"   → "Sl 63,2-6"
 */
export function referenciaEvangelizoParaPt(referencia) {
  if (!referencia) return '';
  const partes = referencia.split('#').map((p) => p.trim()).filter(Boolean);
  const [livro, resto = ''] = partes[0].split(/\s+/, 2);
  const livroPt = livroEvangelizoParaPt(livro);

  if (partes.length === 1) return `${livroPt} ${resto}`.trim();

  // Várias partes (salmos): junta o primeiro e o último versículo quando o capítulo é o mesmo.
  const primeiro = partes[0].match(/(\d+),(\d+)/);
  const ultimo = partes[partes.length - 1].match(/(\d+),\d+-(\d+)$/) ?? partes[partes.length - 1].match(/(\d+),(\d+)$/);
  if (primeiro && ultimo && primeiro[1] === ultimo[1]) {
    return `${livroPt} ${primeiro[1]},${primeiro[2]}-${ultimo[2]}`;
  }
  return `${livroPt} ${resto}`.trim();
}
