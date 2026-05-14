import { EVENTO_TEMA_VISUAL_ATUALIZADO, obterTemaPreferido } from '../tema.js';
import { instalarBotaoCicloTema } from '../tema-controle-ui.js';
import {
  CHAVE_IDIOMA_UI,
  obterCodigoIdiomaPreferidoArmazenado,
} from '../../modules/configuracao/ui/preferencias-ui.js';
import { obterTextosConfig } from '../../modules/configuracao/ui/textos-config.js';
import { apagarTodosDadosLocais, exportarBackupPapiro, restaurarBackupPapiro } from '../../modules/backup/dados/repositorio.js';
import { nomeArquivoBackup } from '../../modules/backup/dominio/pacote-backup.js';
import type { PaginaMontavel } from '../pagina-montavel.js';
import { EVENTO_LOCALE_ATUALIZADO, obterLocaleAtual } from '../../modules/shared/ui/locale.js';
import { rotuloTemaVisual } from '../../modules/shared/ui/menu-navegacao.js';
import { criarCardUi, criarGrid, criarPaginaUi } from '../ui/layout.js';
import { definirTituloDocumentoApp, reporTituloDocumentoSoNomeApp } from '../ui/titulo-documento.js';

export function obterCodigoIdiomaGravado(): string {
  return obterCodigoIdiomaPreferidoArmazenado();
}

const ID_SELECT_IDIOMA_CONFIG = 'papiro-config-select-idioma';

/** Remontagens da página de config (ex.: idioma) sem sair da rota: aborta listeners do bloco tema. */
let abortConfigTema: AbortController | null = null;

function montarPainelConfiguracao(container: HTMLElement, sinal: AbortSignal): void {
  if (sinal.aborted) return;

  abortConfigTema?.abort();
  abortConfigTema = new AbortController();
  const signTema = abortConfigTema.signal;
  sinal.addEventListener('abort', () => abortConfigTema?.abort(), { once: true });

  const loc = obterLocaleAtual();
  const s = obterTextosConfig(loc);
  definirTituloDocumentoApp(s.titulo, loc);
  container.replaceChildren();

  const pagina = criarPaginaUi({ titulo: s.titulo });

  const textoTema = document.createElement('p');
  textoTema.className = 'shell__sub';
  function textoTemaAtual(): void {
    textoTema.textContent = `${s.temaAtual}: ${rotuloTemaVisual(obterTemaPreferido(), loc)}.`;
  }
  textoTemaAtual();

  const pTemaAjuda = document.createElement('p');
  pTemaAjuda.className = 'shell__sub';
  pTemaAjuda.textContent = s.temaAjuda;

  const btnTema = document.createElement('button');
  btnTema.type = 'button';
  btnTema.className = 'shell__acao-primaria-botao';
  instalarBotaoCicloTema(btnTema, loc, signTema);

  const onTemaLinha = (): void => {
    if (sinal.aborted) return;
    textoTemaAtual();
  };
  window.addEventListener(EVENTO_TEMA_VISUAL_ATUALIZADO, onTemaLinha);
  signTema.addEventListener(
    'abort',
    () => {
      window.removeEventListener(EVENTO_TEMA_VISUAL_ATUALIZADO, onTemaLinha);
    },
    { once: true },
  );
  const pId = document.createElement('p');
  pId.className = 'shell__sub';
  pId.textContent = s.idiomaDescricao;
  const sel = document.createElement('select');
  sel.id = ID_SELECT_IDIOMA_CONFIG;
  sel.className = 'shell__select';
  const opPt = document.createElement('option');
  opPt.value = 'pt-BR';
  opPt.textContent = s.idiomaPt;
  const opEn = document.createElement('option');
  opEn.value = 'en';
  opEn.textContent = s.idiomaEn;
  sel.append(opPt, opEn);
  sel.value = obterCodigoIdiomaPreferidoArmazenado().toLowerCase().startsWith('en') ? 'en' : 'pt-BR';
  const btnId = document.createElement('button');
  btnId.type = 'button';
  btnId.className = 'shell__acao-secundaria-botao';
  btnId.textContent = s.guardarIdioma;
  btnId.addEventListener('click', () => {
    if (sinal.aborted) return;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const codigo = sel.value;
    localStorage.setItem(CHAVE_IDIOMA_UI, codigo);
    document.documentElement.lang = codigo.startsWith('en') ? 'en' : 'pt-BR';
    window.dispatchEvent(new CustomEvent(EVENTO_LOCALE_ATUALIZADO));
    montarPainelConfiguracao(container, sinal);
    requestAnimationFrame(() => {
      if (sinal.aborted) return;
      window.scrollTo(sx, sy);
      document.getElementById(ID_SELECT_IDIOMA_CONFIG)?.focus({ preventScroll: true });
    });
  });

  const pPin = document.createElement('p');
  pPin.className = 'shell__sub';
  pPin.textContent = s.pinDescricao;
  const inpPin = document.createElement('input');
  inpPin.type = 'password';
  inpPin.disabled = true;
  inpPin.className = 'shell__input-texto';
  inpPin.setAttribute('aria-label', s.pinCampoEtiqueta);
  inpPin.placeholder = s.pinCampoPlaceholder;

  const backupStatus = document.createElement('p');
  backupStatus.className = 'shell__sub';
  backupStatus.setAttribute('role', 'status');
  backupStatus.textContent = s.backupDescricao;
  const btnExportar = document.createElement('button');
  btnExportar.type = 'button';
  btnExportar.className = 'shell__acao-primaria-botao';
  btnExportar.textContent = s.exportarBackup;
  const inputImportar = document.createElement('input');
  inputImportar.type = 'file';
  inputImportar.accept = '.papiro,application/json';
  inputImportar.className = 'shell__input-texto';
  const btnImportar = document.createElement('button');
  btnImportar.type = 'button';
  btnImportar.className = 'shell__acao-secundaria-botao';
  btnImportar.textContent = s.importarBackup;

  btnExportar.addEventListener('click', async () => {
    const backup = await exportarBackupPapiro();
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = nomeArquivoBackup(backup.metadados.criadoEm);
    a.click();
    URL.revokeObjectURL(href);
    backupStatus.textContent = s.backupOk;
  });

  btnImportar.addEventListener('click', async () => {
    const file = inputImportar.files?.[0];
    if (!file) return;
    await restaurarBackupPapiro(JSON.parse(await file.text()));
    backupStatus.textContent = s.restauracaoOk;
  });

  const pPanico = document.createElement('p');
  pPanico.className = 'shell__sub';
  pPanico.textContent = s.panicoDescricao;
  const inpPanico = document.createElement('input');
  inpPanico.className = 'shell__input-texto';
  inpPanico.placeholder = s.panicoPlaceholder;
  const btnPanico = document.createElement('button');
  btnPanico.type = 'button';
  btnPanico.className = 'shell__botao-perigo';
  btnPanico.textContent = s.panicoBotao;
  btnPanico.addEventListener('click', async () => {
    if (inpPanico.value !== 'APAGAR') return;
    await apagarTodosDadosLocais();
    inpPanico.value = '';
    pPanico.textContent = s.panicoOk;
  });

  pagina.corpo.append(
    criarGrid(
      criarCardUi({ titulo: s.temaSecao, conteudo: [textoTema, pTemaAjuda, btnTema] }).cartao,
      criarCardUi({ titulo: s.idiomaSecao, conteudo: [pId, sel, btnId] }).cartao,
      criarCardUi({ titulo: s.pinSecao, conteudo: [pPin, inpPin] }).cartao,
      criarCardUi({ titulo: s.backupSecao, conteudo: [backupStatus, btnExportar, inputImportar, btnImportar] }).cartao,
      criarCardUi({ titulo: s.panicoSecao, conteudo: [pPanico, inpPanico, btnPanico] }).cartao,
    ),
  );
  container.append(pagina.raiz);
}

const configPagina: PaginaMontavel = {
  mount(container, sinal) {
    sinal.addEventListener(
      'abort',
      () => {
        /* nada a libertar nesta página */
      },
      { once: true },
    );
    montarPainelConfiguracao(container, sinal);
  },
  unmount() {
    reporTituloDocumentoSoNomeApp();
  },
};

export default configPagina;
