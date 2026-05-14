const CHAVE_ARMAZENAMENTO = 'papiro-tema-aparencia';

export type TemaVisual = 'claro' | 'escuro' | 'breu';

export const EVENTO_TEMA_VISUAL_ATUALIZADO = 'papiro-tema-visual-atualizado';

const ORDEM_TEMA: readonly TemaVisual[] = ['claro', 'escuro', 'breu'];

export function obterTemaPreferido(): TemaVisual {
  const gravado = localStorage.getItem(CHAVE_ARMAZENAMENTO);
  if (gravado === 'claro' || gravado === 'escuro' || gravado === 'breu') {
    return gravado;
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function aplicarTemaNoDocumento(tema: TemaVisual): void {
  const raiz = document.documentElement;
  raiz.classList.remove('wa-light', 'wa-dark', 'papiro-tema-breu');
  if (tema === 'claro') {
    raiz.classList.add('wa-light');
  } else {
    raiz.classList.add('wa-dark');
    if (tema === 'breu') {
      raiz.classList.add('papiro-tema-breu');
    }
  }
}

export function guardarTemaPreferido(tema: TemaVisual): void {
  localStorage.setItem(CHAVE_ARMAZENAMENTO, tema);
}

export function definirTemaVisual(tema: TemaVisual): void {
  aplicarTemaNoDocumento(tema);
  guardarTemaPreferido(tema);
  window.dispatchEvent(
    new CustomEvent<{ tema: TemaVisual }>(EVENTO_TEMA_VISUAL_ATUALIZADO, { detail: { tema } }),
  );
}

export function rodarTemaSeguinte(): void {
  const atual = obterTemaPreferido();
  const i = ORDEM_TEMA.indexOf(atual);
  const base = i >= 0 ? i : 0;
  const proximo = ORDEM_TEMA[(base + 1) % ORDEM_TEMA.length]!;
  definirTemaVisual(proximo);
}

export function inicializarTemaDoArmazenamento(): void {
  aplicarTemaNoDocumento(obterTemaPreferido());
}
