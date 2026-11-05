// Datas são sempre tratadas como strings ISO locais "AAAA-MM-DD" (sem fuso horário).

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function hojeISO() {
  return paraISO(new Date());
}

export function paraISO(data) {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

export function deISO(iso) {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function ehDataISO(valor) {
  if (!ISO.test(valor ?? '')) return false;
  return paraISO(deISO(valor)) === valor; // rejeita 2026-02-31
}

export function somarDias(iso, dias) {
  const d = deISO(iso);
  d.setDate(d.getDate() + dias);
  return paraISO(d);
}

/** { dia, mes, ano } numéricos, para a Liturgia API. */
export function partes(iso) {
  const d = deISO(iso);
  return { dia: d.getDate(), mes: d.getMonth() + 1, ano: d.getFullYear() };
}

export function formatarExtenso(iso) {
  return deISO(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
