// Adapter: Catena Áurea em português do projeto catenaaurea.com.br
// (github.com/guilherme-evangelista/catena-aurea), lida diretamente do repositório do autor.
// Uso pessoal: os dados NÃO são copiados para este repositório.
//
// Formato de origem: { commentary: { [cap]: { [id]: { range: "14:25–33", text } } } }
// O `text` traz primeiro os versículos do Evangelho ("25. Grandes multidões...", descartados aqui)
// e depois os comentários no formato "Autor. (citação) texto", com quebras de linha de PDF.

export const LIVROS_PT = { Mt: 'mateus', Mc: 'marcos', Lc: 'lucas', Jo: 'joao' };

const NOMES_TITULO = [
  'São João Crisóstomo', 'Santo Agostinho', 'Santo Ambrósio', 'Santo Atanásio', 'Santo Epifânio',
  'Santo Hilário', 'Santo Isidoro de Pelúsio', 'Santo Isidoro', 'Santo Pascásio Radberto', 'São Basílio',
  'São Beda, o Venerável', 'São Cipriano', 'São Cirilo de Alexandria', 'São Cirilo de Jerusalém',
  'São Dionísio de Alexandria', 'São Gregório de Nazianzo', 'São Gregório de Nissa', 'São Gregório Magno',
  'São Jerônimo', 'São João Cassiano', 'São João Damasceno', 'São Leão Magno', 'São Máximo',
  'São Pedro Crisólogo', 'São Remígio', 'Alcuíno', 'Ambrosiaster', 'Concílio de Éfeso', 'Dídimo',
  'Eusébio', 'Expositor Grego', 'Genádio', 'Glosa', 'Haymo', 'Lanfranc', 'Nemésio', 'Orígenes',
  'Petrus Alfonsus', 'Pseudo-Agostinho', 'Pseudo-Atanásio', 'Pseudo-Basílio', 'Pseudo-Crisóstomo',
  'Pseudo-Dionísio', 'Pseudo-Jerônimo', 'Pseudo-Orígenes', 'Rábano Mauro',
  'Segundo Concílio de Constantinopla', 'Severiano', 'Teódoto de Ancira', 'Teofilato', 'Tito de Bostra',
].sort((a, b) => b.length - a.length);

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE_NOME = new RegExp(`^\\s*(${NOMES_TITULO.map(escapar).join('|')})\\s*\\.\\s*`, 'iu');
const MAIUSC = 'A-Z\\u00C0-\\u00D6\\u00D8-\\u00DE\\-';
const RE_NOME_MAIUSC = new RegExp(`^\\s*([${MAIUSC}]{3,}(?:[\\s\\-][${MAIUSC}]+)*)\\s*\\.\\s*`, 'u');
const RE_VERSO = /^\s*(\d+)\.\s*(?=\S)/;
const RE_CITACAO = /^\(([^()]{1,100})\)\s*/;

function nomeDoPai(linha) {
  const m = linha.match(RE_NOME) ?? linha.match(RE_NOME_MAIUSC);
  return m ? { nome: m[1], fim: m[0].length } : null;
}

/** "14:25–33" → { cap: 14, vIni: 25, vFim: 33 } */
export function lerRange(range) {
  const m = String(range).match(/(\d+):(\d+)(?:\s*[–\-]\s*(?:(\d+):)?(\d+))?/);
  if (!m) return null;
  const cap = Number(m[1]);
  const vIni = Number(m[2]);
  const vFim = m[3] && Number(m[3]) !== cap ? 999 : Number(m[4] ?? m[2]);
  return { cap, vIni, vFim };
}

/** Separa um bloco em comentários [{ autor, citacao, textoPt }], descartando o texto do Evangelho. */
export function separarComentarios(texto, range) {
  const { vIni, vFim } = lerRange(range) ?? { vIni: 0, vFim: 0 };
  const ehVersoDoTrecho = (linha) => {
    const m = linha.match(RE_VERSO);
    return m && Number(m[1]) >= vIni && Number(m[1]) <= vFim;
  };

  // Junta as linhas quebradas do PDF em parágrafos
  const paragrafos = [];
  let atual = null;
  let viuPai = false;
  for (const bruta of String(texto).split('\n')) {
    const linha = bruta.trim();
    if (!linha) continue;
    const pai = nomeDoPai(linha);
    const verso = !viuPai && ehVersoDoTrecho(linha);
    if (pai || verso || !atual) {
      if (atual) paragrafos.push(atual);
      atual = { texto: linha, pai, verso };
      if (pai) viuPai = true;
    } else {
      atual.texto += (atual.texto.endsWith('-') ? '' : ' ') + linha;
    }
  }
  if (atual) paragrafos.push(atual);

  return paragrafos
    .filter((p) => p.pai) // descarta versículos do Evangelho e texto antes do primeiro Padre
    .map((p) => {
      let resto = p.texto.slice(p.pai.fim);
      let citacao = null;
      const c = resto.match(RE_CITACAO);
      if (c) { citacao = c[1].trim(); resto = resto.slice(c[0].length); }
      return { autor: normalizarNome(p.pai.nome), citacao, textoPt: resto.trim() };
    })
    .filter((t) => t.textoPt);
}

/** "SANTO AGOSTINHO" → "Santo Agostinho" (alguns blocos vêm em maiúsculas). */
function normalizarNome(nome) {
  if (nome !== nome.toUpperCase()) return nome;
  const pequenas = new Set(['de', 'da', 'do', 'o', 'a', 'e']);
  return nome.toLowerCase().split(/(\s+|-)/).map((p, i) =>
    (i > 0 && pequenas.has(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

/**
 * Converte o JSON de um Evangelho em blocos por capítulo:
 * Map<cap, [{ cap, vIni, vFim, trechos }]>
 */
export function adaptarCatenaPt(json) {
  if (!json?.commentary) throw new Error('Catena PT em formato inesperado');
  const porCap = new Map();
  for (const blocos of Object.values(json.commentary)) {
    for (const b of Object.values(blocos)) {
      const r = lerRange(b.range);
      if (!r) continue;
      const trechos = separarComentarios(b.text, b.range);
      if (!trechos.length) continue;
      if (!porCap.has(r.cap)) porCap.set(r.cap, []);
      porCap.get(r.cap).push({ ...r, trechos });
    }
  }
  return porCap;
}
