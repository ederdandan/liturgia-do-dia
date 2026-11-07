// Leitura em voz alta com a voz do próprio aparelho (Web Speech API).
// Chrome/Android usam as vozes do Google; iPhone/Mac, as da Apple. Grátis e sem servidor.
//
// O texto é dividido em frases curtas: o Chrome corta falas longas (~15 s) e o
// pause() do Android não é confiável. "Pausar" cancela e guarda a frase atual;
// "continuar" recomeça dela.

const sintese = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

export const audioDisponivel = () => !!sintese && typeof SpeechSynthesisUtterance !== 'undefined';

let voz = null;
function escolherVoz() {
  const vozes = sintese.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('pt'));
  const pontos = (v) =>
    (v.lang.toLowerCase() === 'pt-br' ? 4 : 0)
    + (/google|natural|neural|online/i.test(v.name) ? 2 : 0)
    + (v.localService ? 0 : 1);
  voz = vozes.sort((a, b) => pontos(b) - pontos(a))[0] ?? null;
}
if (audioDisponivel()) {
  escolherVoz();
  sintese.addEventListener?.('voiceschanged', escolherVoz);
}

/** Divide em frases de até ~220 caracteres. */
function frases(texto) {
  const partes = String(texto).replace(/\s+/g, ' ').match(/[^.!?;:»]+[.!?;:»]*\s*/g) ?? [];
  const saida = [];
  let atual = '';
  for (const p of partes) {
    if ((atual + p).length > 220 && atual) { saida.push(atual.trim()); atual = ''; }
    atual += p;
  }
  if (atual.trim()) saida.push(atual.trim());
  return saida;
}

// Estado da leitura atual
let atual = null; // { id, frases, i, tocando, aoMudar }

function falar() {
  const a = atual;
  if (!a || !a.tocando) return;
  if (a.i >= a.frases.length) { encerrar(); return; }
  const u = new SpeechSynthesisUtterance(a.frases[a.i]);
  u.lang = voz?.lang ?? 'pt-BR';
  if (voz) u.voice = voz;
  u.rate = 0.95;
  u.onend = () => {
    if (atual !== a || !a.tocando) return; // pausado, parado ou trocado
    a.i += 1;
    falar();
  };
  u.onerror = (e) => {
    if (atual !== a || e.error === 'interrupted' || e.error === 'canceled') return;
    console.warn('Falha na leitura em voz alta', e.error);
    encerrar();
  };
  sintese.speak(u);
}

function notificar() {
  atual?.aoMudar(atual.tocando ? 'tocando' : 'pausado');
}

function encerrar() {
  const a = atual;
  atual = null;
  sintese.cancel();
  a?.aoMudar('parado');
}

/**
 * Alterna a leitura de um item: toca, pausa ou continua.
 * @param {string} id  identifica o item (só um toca por vez)
 * @param {string} texto
 * @param {(estado: 'tocando'|'pausado'|'parado') => void} aoMudar
 */
export function alternarAudio(id, texto, aoMudar) {
  if (!audioDisponivel()) return;
  if (atual?.id === id) {
    atual.tocando = !atual.tocando;
    sintese.cancel();
    notificar();
    if (atual.tocando) falar();
    return;
  }
  pararAudio();
  atual = { id, frases: frases(texto), i: 0, tocando: true, aoMudar };
  notificar();
  falar();
}

export function pararAudio() {
  if (atual) encerrar();
}
