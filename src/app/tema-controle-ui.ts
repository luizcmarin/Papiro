import { EVENTO_LOCALE_ATUALIZADO, obterLocaleAtual, type LocaleId } from '../modules/shared/ui/locale.js';
import { rotuloTemaVisual, textoAriaCicloTema } from '../modules/shared/ui/menu-navegacao.js';
import { EVENTO_TEMA_VISUAL_ATUALIZADO, obterTemaPreferido, rodarTemaSeguinte } from './tema.js';

export function atualizarRotuloBotaoCicloTema(controlo: HTMLElement, locale: LocaleId): void {
  controlo.textContent = rotuloTemaVisual(obterTemaPreferido(), locale);
  controlo.setAttribute('aria-label', textoAriaCicloTema(locale));
}

/**
 * Liga clique ao ciclo de temas e mantém rótulo/ARIA alinhados a tema e idioma.
 * Com `AbortSignal`, remove listeners ao abortar (ex.: desmontar página de configurações).
 */
export function instalarBotaoCicloTema(
  controlo: HTMLElement,
  localeInicial: LocaleId,
  sinal?: AbortSignal,
): void {
  atualizarRotuloBotaoCicloTema(controlo, localeInicial);

  const onClick = (): void => {
    rodarTemaSeguinte();
  };
  const onAtualizado = (): void => {
    atualizarRotuloBotaoCicloTema(controlo, obterLocaleAtual());
  };

  controlo.addEventListener('click', onClick);
  window.addEventListener(EVENTO_TEMA_VISUAL_ATUALIZADO, onAtualizado);
  window.addEventListener(EVENTO_LOCALE_ATUALIZADO, onAtualizado);

  const cleanup = (): void => {
    controlo.removeEventListener('click', onClick);
    window.removeEventListener(EVENTO_TEMA_VISUAL_ATUALIZADO, onAtualizado);
    window.removeEventListener(EVENTO_LOCALE_ATUALIZADO, onAtualizado);
  };

  if (sinal) {
    sinal.addEventListener('abort', cleanup, { once: true });
  }
}
