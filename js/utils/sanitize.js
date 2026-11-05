// Sanitização de HTML de terceiros (bio do santo, feeds) e utilitários de texto.
// Usa o DOM do navegador; deve ser chamada apenas na camada de interface.

const PERMITIDAS = new Set(['P', 'BR', 'EM', 'STRONG', 'I', 'B']);
const REMOVER_COM_CONTEUDO = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT']);

/** Mantém só tags da lista permitida, sem atributos. Outras tags são desembrulhadas. */
export function sanitizarHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  limpar(doc.body);
  return doc.body.innerHTML.trim();
}

function limpar(no) {
  for (const filho of [...no.childNodes]) {
    if (filho.nodeType === Node.COMMENT_NODE) {
      filho.remove();
    } else if (filho.nodeType === Node.ELEMENT_NODE) {
      if (REMOVER_COM_CONTEUDO.has(filho.tagName)) {
        filho.remove();
        continue;
      }
      limpar(filho);
      if (PERMITIDAS.has(filho.tagName)) {
        for (const attr of [...filho.attributes]) filho.removeAttribute(attr.name);
      } else {
        filho.replaceWith(...filho.childNodes);
      }
    }
  }
}

/** Escapa texto puro para inserção segura em HTML. */
export function escaparHtml(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Texto puro → parágrafos HTML (quebra dupla = parágrafo, simples = <br>). */
export function textoParaHtml(texto) {
  return String(texto ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escaparHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
