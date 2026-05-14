/**
 * Cores efectivas para ECharts — lê tokens Web Awesome já aplicados ao documento.
 * No Modo Breu, `neutral-05`…`40` e `brand-50` são a paleta principal; `destaque` segue o accent neon.
 */
export interface CoresGraficoPapiro {
  textoPrincipal: string;
  textoSuave: string;
  linhaGrade: string;
  destaque: string;
  superficieCarta: string;
}

/** Fundo transparente para o canvas integrar com superfícies Breu / escuras (doc produto). */
export function opcoesTemaGraficoEcharts(): { backgroundColor: string } {
  return { backgroundColor: 'transparent' };
}

export function lerCoresGraficoDoDocumento(alvo: HTMLElement = document.documentElement): CoresGraficoPapiro {
  const cs = getComputedStyle(alvo);
  const ler = (nome: string, fallback: string): string => {
    const v = cs.getPropertyValue(nome).trim();
    return v.length > 0 ? v : fallback;
  };
  const destaque = ler(
    '--wa-color-brand-fill-loud',
    ler('--wa-color-brand-50', ler('--wa-color-primary-500', '#4fc3f7')),
  );
  return {
    textoPrincipal: ler('--wa-color-text-normal', '#1a2332'),
    textoSuave: ler('--wa-color-text-quiet', '#64748b'),
    linhaGrade: ler('--wa-color-surface-border', '#cbd5e1'),
    destaque,
    superficieCarta: ler('--wa-color-surface-raised', ler('--wa-color-surface-raised-normal', '#ffffff')),
  };
}
