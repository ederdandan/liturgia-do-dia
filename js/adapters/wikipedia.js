// Adapter: Wikipedia (pt) → complemento do santo (resumo, imagem, link).

const PREFIXOS = /^(São|Santo|Santa|Santos|Santas|S\.|Sto\.|Sta\.|Beato|Beata|Bem-aventurad[oa]|Bto\.|Bta\.)\s+/i;

/**
 * "São Carlos Borromeu, bispo, Memória" → "Carlos Borromeu"
 * "S. Carlos Borromeu"                  → "Carlos Borromeu"
 */
export function nomeParaBusca(nome) {
  let n = String(nome ?? '').split(/[,(]/)[0].trim();
  while (PREFIXOS.test(n)) n = n.replace(PREFIXOS, '');
  return n.trim();
}

/** Converte o JSON de /page/summary/{titulo}. Retorna null para páginas de desambiguação. */
export function adaptarResumoWikipedia(json) {
  if (!json || json.type === 'disambiguation' || !json.extract) return null;
  return {
    titulo: json.title,
    resumo: json.extract,
    imagem: json.originalimage?.source ?? json.thumbnail?.source ?? null,
    miniatura: json.thumbnail?.source ?? null,
    url: json.content_urls?.desktop?.page ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(json.title)}`,
  };
}

/**
 * Escolhe, entre os resultados da busca, o primeiro cujo título contém a última palavra do nome
 * (normalmente o sobrenome ou local: "Borromeu", "Assis", "Ávila").
 */
export function escolherResultadoBusca(json, nome) {
  const resultados = json?.query?.search ?? [];
  const chave = normalizar(nome.split(/\s+/).pop());
  const escolhido = resultados.find((r) => normalizar(r.title).includes(chave));
  return escolhido?.title ?? null;
}

function normalizar(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
