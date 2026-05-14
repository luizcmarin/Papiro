import type { TemaVisual } from '../../../app/tema.js';
import type { LocaleId } from './locale.js';

/** Chaves estáveis alinhadas a `menu-rotas.ts` (não usar como texto direto na UI). */
export type ChaveNav =
  | 'dashboard'
  | 'anotacoes'
  | 'estudo'
  | 'ministerio'
  | 'financeiro'
  | 'metas'
  | 'receitas'
  | 'preparacao'
  | 'preparacaoGuias'
  | 'preparacaoCofre'
  | 'quiz'
  | 'poesia'
  | 'perfil'
  | 'qr'
  | 'configuracoes';

const PT: Record<ChaveNav, string> = {
  dashboard: 'Dashboard',
  anotacoes: 'Anotações',
  estudo: 'Estudo',
  ministerio: 'Ministério',
  financeiro: 'Financeiro',
  metas: 'Metas',
  receitas: 'Receitas',
  preparacao: 'Preparação',
  preparacaoGuias: 'Guias de preparação',
  preparacaoCofre: 'Cofre',
  quiz: 'Quiz',
  poesia: 'Poesia',
  perfil: 'Perfil e ficha ICE',
  qr: 'QR Code',
  configuracoes: 'Configurações',
};

const EN: Record<ChaveNav, string> = {
  dashboard: 'Dashboard',
  anotacoes: 'Notes',
  estudo: 'Study',
  ministerio: 'Ministry',
  financeiro: 'Finance',
  metas: 'Goals',
  receitas: 'Recipes',
  preparacao: 'Preparedness',
  preparacaoGuias: 'Preparedness guides',
  preparacaoCofre: 'Vault',
  quiz: 'Quiz',
  poesia: 'Poetry',
  perfil: 'Profile & ICE card',
  qr: 'QR code',
  configuracoes: 'Settings',
};

export function textoRotuloNavegacao(chave: ChaveNav, locale: LocaleId): string {
  return locale === 'en' ? EN[chave] : PT[chave];
}

export function textosTopoShell(locale: LocaleId): {
  botaoAbrirMenu: string;
  temaRotuloClaro: string;
  temaRotuloEscuro: string;
  temaRotuloBreu: string;
  temaCicloAria: string;
  gavetaLabel: string;
  navAria: string;
} {
  return locale === 'en'
    ? {
        botaoAbrirMenu: 'Menu',
        temaRotuloClaro: 'Light',
        temaRotuloEscuro: 'Dark',
        temaRotuloBreu: 'Tactical',
        temaCicloAria: 'Cycle theme: each click advances through light, dark, and tactical.',
        gavetaLabel: 'Navigation',
        navAria: 'Main navigation',
      }
    : {
        botaoAbrirMenu: 'Menu',
        temaRotuloClaro: 'Claro',
        temaRotuloEscuro: 'Escuro',
        temaRotuloBreu: 'Breu',
        temaCicloAria: 'Alternar tema: cada clique avança entre claro, escuro e breu tático.',
        gavetaLabel: 'Navegação',
        navAria: 'Principal',
      };
}

export function rotuloTemaVisual(tema: TemaVisual, locale: LocaleId): string {
  const t = textosTopoShell(locale);
  if (tema === 'claro') return t.temaRotuloClaro;
  if (tema === 'escuro') return t.temaRotuloEscuro;
  return t.temaRotuloBreu;
}

export function textoAriaCicloTema(locale: LocaleId): string {
  return textosTopoShell(locale).temaCicloAria;
}
