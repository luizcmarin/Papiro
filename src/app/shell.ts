import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/drawer/drawer.js';

import type { LocaleId } from '../modules/shared/ui/locale.js';
import { EVENTO_LOCALE_ATUALIZADO, obterLocaleAtual } from '../modules/shared/ui/locale.js';
import {
  textosTopoShell,
  textoRotuloNavegacao,
  type ChaveNav,
} from '../modules/shared/ui/menu-navegacao.js';
import { hrefParaRota, ITENS_MENU_ROTAS } from './menu-rotas.js';
import { inicializarTemaDoArmazenamento } from './tema.js';
import { atualizarRotuloBotaoCicloTema, instalarBotaoCicloTema } from './tema-controle-ui.js';
import { obterClienteSqlocal } from '../infra/db/cliente-sqlocal.js';

type WaDrawerElement = HTMLElement & { open: boolean };

/** Atualiza rótulos do drawer/menu e botões da barra conforme idioma atual. */
export function atualizarRotulosInternosShell(raizApp: HTMLElement, locale?: LocaleId): void {
  const loc = locale ?? obterLocaleAtual();
  const topo = textosTopoShell(loc);
  const drawer = raizApp.querySelector('#drawer-nav');
  if (drawer) drawer.setAttribute('label', topo.gavetaLabel);
  const nav = raizApp.querySelector('nav.shell__nav');
  if (nav) nav.setAttribute('aria-label', topo.navAria);
  const btnMenu = raizApp.querySelector('#btn-abrir-menu');
  if (btnMenu) btnMenu.textContent = topo.botaoAbrirMenu;
  const btnTema = raizApp.querySelector('#topbar-btn-tema');
  if (btnTema instanceof HTMLElement) atualizarRotuloBotaoCicloTema(btnTema, loc);

  for (const item of ITENS_MENU_ROTAS) {
    const a = raizApp.querySelector<HTMLAnchorElement>(`a.shell__nav-linha[data-chave-nav="${item.chaveNav}"]`);
    if (a) {
      const span = a.querySelector('span');
      if (span) {
        span.textContent = textoRotuloNavegacao(item.chaveNav as ChaveNav, loc);
      }
    }
  }
}

function textoEstadoBaseDados(locale: LocaleId, numPastas: number): string {
  if (locale === 'en') {
    return numPastas === 0
      ? 'Database ready; tbl_pasta is empty.'
      : `Database ready; ${String(numPastas)} folder row(s) in tbl_pasta (listing uses light columns only).`;
  }
  return numPastas === 0
    ? 'Base pronta; tabela tbl_pasta vazia.'
    : `Base pronta; ${String(numPastas)} pasta(s) em tbl_pasta (listagem sem conteúdo pesado).`;
}

/** Monta a casca inicial (marcador só com `<nav>` vazio dentro do drawer). */
function montarMarkupShellInicial(): string {
  return `
    <div class="shell">
      <header class="shell__topbar" data-papiro-topbar>
        <div class="shell__topbar-inicio">
          <wa-drawer id="drawer-nav" label="Navigation" placement="start">
            <span slot="label">Papiro</span>
            <nav class="shell__nav" aria-label="Navigation"></nav>
          </wa-drawer>
          <wa-button id="btn-abrir-menu" variant="brand">Menu</wa-button>
        </div>
        <div class="shell__topbar-fim">
          <wa-button id="topbar-btn-tema" size="s" type="button" variant="neutral">Tema</wa-button>
        </div>
      </header>
      <main class="shell__principal">
        <div id="outlet-papiro" class="shell__outlet" aria-live="polite"></div>
        <p class="shell__sub shell__estado-bd" id="texto-estado-bd"></p>
      </main>
    </div>
  `;
}

async function preencherLinksNavegacao(nav: Element): Promise<void> {
  nav.replaceChildren();
  const basePublica = import.meta.env.BASE_URL;
  for (const item of ITENS_MENU_ROTAS) {
    const caminhoHref = item.caminhos[0];
    const href = hrefParaRota(caminhoHref);
    const a = document.createElement('a');
    a.className = 'shell__nav-linha';
    a.href = href;
    a.dataset.chaveNav = item.chaveNav;

    let icone: SVGSVGElement | null = null;
    try {
      const res = await fetch(`${basePublica}icons/m3/${item.icone}.svg`);
      if (res.ok) {
        const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
        const el = doc.querySelector('svg');
        if (el instanceof SVGSVGElement) {
          icone = el;
          icone.classList.add('shell__icone');
          icone.setAttribute('width', '24');
          icone.setAttribute('height', '24');
          icone.setAttribute('aria-hidden', 'true');
        }
      }
    } catch {
      /* ícone opcional */
    }

    const span = document.createElement('span');
    span.textContent = textoRotuloNavegacao(item.chaveNav as ChaveNav, obterLocaleAtual());
    if (icone) {
      a.append(icone, span);
    } else {
      a.append(span);
    }
    nav.append(a);
  }
}

export async function montarShell(container: HTMLElement): Promise<void> {
  inicializarTemaDoArmazenamento();
  container.innerHTML = montarMarkupShellInicial();

  const shell = container.querySelector('.shell');
  const navEl = container.querySelector('nav.shell__nav');
  if (navEl) {
    await preencherLinksNavegacao(navEl);
  }
  const raizParaRotulos = shell instanceof HTMLElement ? shell : container;
  atualizarRotulosInternosShell(raizParaRotulos, obterLocaleAtual());

  const ouvirLocale = (): void =>
    atualizarRotulosInternosShell(raizParaRotulos, obterLocaleAtual());
  window.addEventListener(EVENTO_LOCALE_ATUALIZADO, ouvirLocale);

  const drawer = container.querySelector('#drawer-nav');
  const btnMenu = container.querySelector('#btn-abrir-menu');
  const btnTema = container.querySelector('#topbar-btn-tema');
  const textoBd = container.querySelector('#texto-estado-bd');

  if (btnMenu instanceof HTMLElement && drawer instanceof HTMLElement) {
    btnMenu.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      (drawer as WaDrawerElement).open = true;
    });
  }

  if (btnTema instanceof HTMLElement) {
    instalarBotaoCicloTema(btnTema, obterLocaleAtual());
  }

  try {
    const { sql } = obterClienteSqlocal();
    const pastas = await sql`SELECT id, nome, icone, ordem FROM tbl_pasta ORDER BY ordem ASC`;
    if (textoBd) {
      textoBd.textContent = textoEstadoBaseDados(obterLocaleAtual(), pastas.length);
    }
  } catch (erro) {
    if (textoBd) {
      const msg =
        obterLocaleAtual() === 'en'
          ? `Error reading tbl_pasta: ${erro instanceof Error ? erro.message : String(erro)}`
          : `Erro ao ler tbl_pasta: ${erro instanceof Error ? erro.message : String(erro)}`;
      textoBd.textContent = msg;
    }
  }
}
