import { garantirEchartsRegistrado } from '../../infra/charts/echarts-bundle.js';
import type { EChartsType } from '../../infra/charts/echarts-bundle.js';
import { lerCoresGraficoDoDocumento, opcoesTemaGraficoEcharts } from '../../infra/charts/cores-documento.js';
import { conquistasParaSessaoEstudo } from '../../modules/estudo/aplicacao/conquistas-estudo.js';
import { TimerPomodoroController } from '../../modules/estudo/aplicacao/timer-controller.js';
import type { FaseTimer } from '../../modules/estudo/aplicacao/timer-controller.js';
import * as repo from '../../modules/estudo/dados/repositorio.js';
import type { ConquistaEstudoRow, SessaoEstudoRow } from '../../modules/estudo/dados/types.js';
import { obterTextosEstudo } from '../../modules/estudo/ui/textos-estudo.js';
import { obterLocaleAtual, registarAoLocaleAtualizado } from '../../modules/shared/ui/locale.js';
import { criarDialogoFormulario } from '../ui/dialogos.js';
import { criarCampoTexto, criarFormGrid, limparCampos } from '../ui/form.js';
import { criarCardUi, criarGrid, criarPaginaUi } from '../ui/layout.js';
import { criarBotaoAcao, criarLinhaLista, criarListaCrud } from '../ui/lista.js';
import type { PaginaMontavel } from '../pagina-montavel.js';
import { definirTituloDocumentoApp, reporTituloDocumentoSoNomeApp } from '../ui/titulo-documento.js';

let estudoGraficosPagina: EChartsType[] = [];

function formatarCronometro(ms: number): string {
  const seg = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatoDataLista(ms: number, localeUi: ReturnType<typeof obterLocaleAtual>): string {
  return new Date(ms).toLocaleDateString(localeUi === 'en' ? 'en-US' : 'pt-BR');
}

function rotuloFaseEstudo(fase: FaseTimer, t: ReturnType<typeof obterTextosEstudo>): string {
  if (fase === 'pausa_longa') return t.fasePausaLonga;
  return fase === 'pausa_curta' ? t.fasePausa : t.faseFoco;
}

const estudoPagina: PaginaMontavel = {
  async mount(container, sinal) {
    const echarts = garantirEchartsRegistrado();
    estudoGraficosPagina.forEach((c) => c.dispose());
    estudoGraficosPagina = [];

    const locInicial = obterLocaleAtual();
    const tbl = obterTextosEstudo(locInicial);
    definirTituloDocumentoApp(tbl.tituloPagina, locInicial);

    const pagina = criarPaginaUi({ titulo: tbl.tituloPagina });

    const cron = document.createElement('p');
    cron.className = 'shell__titulo shell__cronometro';

    const faseTxt = document.createElement('p');
    faseTxt.className = 'shell__sub';

    const btns = document.createElement('div');
    btns.className = 'shell__acoes';

    const bStart = criarBotaoAcao(tbl.iniciar, { variant: 'brand' });
    const bPause = criarBotaoAcao(tbl.pausar, { variant: 'neutral' });
    const bResume = criarBotaoAcao(tbl.retomar, { variant: 'neutral' });
    const bReset = criarBotaoAcao(tbl.repor, { variant: 'neutral' });
    const btnReg = criarBotaoAcao(tbl.registrarSessao, { variant: 'brand' });
    btnReg.hidden = true;
    btns.append(bStart, bPause, bResume, bReset, btnReg);

    const campoAssunto = criarCampoTexto({ rotulo: tbl.assuntoCampo });
    const campoNota = criarCampoTexto({ rotulo: tbl.notaPosCampo, linhas: 3 });

    const boxLin = document.createElement('div');
    boxLin.className = 'shell__grafico';

    const listaHistorico = criarListaCrud<SessaoEstudoRow>({
      vazio: tbl.historicoVazio,
      renderItem: (sessao) =>
        criarLinhaLista({
          titulo: `${sessao.assunto} · ${String(sessao.duracao_minutos)} min`,
          meta: formatoDataLista(sessao.concluido_em, obterLocaleAtual()),
        }),
    });

    const listaConquistas = criarListaCrud<ConquistaEstudoRow>({
      vazio: tbl.conquistasVazio,
      renderItem: (conquista) =>
        criarLinhaLista({
          titulo: conquista.tipo,
          meta: formatoDataLista(conquista.desbloqueado_em, obterLocaleAtual()),
        }),
    });

    const dialogoRegistro = criarDialogoFormulario({
      titulo: tbl.registrarSessao,
      confirmarTexto: tbl.registrarSessao,
      cancelarTexto: tbl.repor,
      conteudo: [criarFormGrid(campoAssunto.elemento), campoNota.elemento],
      signal: sinal,
      aoConfirmar: async () => {
        const t = obterTextosEstudo(obterLocaleAtual());
        const minGravar = 25;
        const agora = Date.now();

        await repo.inserirSessaoEstudo({
          assunto: campoAssunto.valor() || t.assuntoCampo,
          tipo_ciclo: 'foco',
          duracao_minutos: minGravar,
          concluido_em: agora,
          nota_meditacao: campoNota.valor(),
        });

        const tot = await repo.contarSessoesFocoCompletas();
        const totalNotas = await repo.contarNotasMeditacao();
        for (const conquista of conquistasParaSessaoEstudo({
          totalFocosAposSessao: tot,
          duracaoMinutos: minGravar,
          totalNotasMeditacao: totalNotas,
        })) {
          await repo.inserirConquistaEstudoSeAusente(conquista, agora);
        }

        btnReg.hidden = true;
        limparCampos(campoAssunto, campoNota);
        await refrescarDadosLista();
      },
    });

    const cardTimer = criarCardUi({ titulo: tbl.timerTitulo, conteudo: [cron, faseTxt, btns] });
    const cardGrafico = criarCardUi({ titulo: tbl.graficoLinhaTitulo, conteudo: [boxLin] });
    const cardHistorico = criarCardUi({ titulo: tbl.historicoTitulo, conteudo: [listaHistorico.elemento] });
    const cardConquistas = criarCardUi({ titulo: tbl.conquistasTitulo, conteudo: [listaConquistas.elemento] });

    pagina.corpo.append(
      criarGrid(cardTimer.cartao, cardGrafico.cartao),
      criarGrid(cardHistorico.cartao, cardConquistas.cartao),
    );
    container.replaceChildren(pagina.raiz, dialogoRegistro.elemento);

    const ctl = new TimerPomodoroController({
      onTick: (ms, f) => {
        if (sinal.aborted) return;
        const t = obterTextosEstudo(obterLocaleAtual());
        cron.textContent = formatarCronometro(ms);
        faseTxt.textContent = rotuloFaseEstudo(f, t);
      },
      onFaseConcluida: (f) => {
        if (f === 'foco') {
          btnReg.hidden = false;
        }
        sincronizarBotoes();
      },
    });

    function sincronizarBotoes(): void {
      const t = obterTextosEstudo(obterLocaleAtual());
      const e = ctl.obterEstado();
      bStart.textContent = t.iniciar;
      bPause.textContent = t.pausar;
      bResume.textContent = t.retomar;
      bReset.textContent = t.repor;
      bStart.toggleAttribute('disabled', e === 'running');
      bPause.toggleAttribute('disabled', e !== 'running');
      bResume.toggleAttribute('disabled', e !== 'paused');
      const f = ctl.obterFase();
      faseTxt.textContent = rotuloFaseEstudo(f, t);
      cron.textContent = formatarCronometro(ctl.obterRestanteMs());
    }

    function aplicarRotulos(): void {
      const t = obterTextosEstudo(obterLocaleAtual());
      definirTituloDocumentoApp(t.tituloPagina);
      pagina.titulo.textContent = t.tituloPagina;
      cardTimer.titulo.textContent = t.timerTitulo;
      cardGrafico.titulo.textContent = t.graficoLinhaTitulo;
      cardHistorico.titulo.textContent = t.historicoTitulo;
      cardConquistas.titulo.textContent = t.conquistasTitulo;
      campoAssunto.definirRotulo(t.assuntoCampo);
      campoAssunto.definirPlaceholder(t.assuntoCampo);
      campoNota.definirRotulo(t.notaPosCampo);
      campoNota.definirPlaceholder(t.notaPosCampo);
      btnReg.textContent = t.registrarSessao;
      dialogoRegistro.definirTitulo(t.registrarSessao);
      dialogoRegistro.botaoConfirmar.textContent = t.registrarSessao;
      dialogoRegistro.botaoCancelar.textContent = t.repor;
      listaHistorico.definirTextoVazio(t.historicoVazio);
      listaConquistas.definirTextoVazio(t.conquistasVazio);
      sincronizarBotoes();
    }

    function pintarLinha(focosCron: SessaoEstudoRow[]): void {
      estudoGraficosPagina.forEach((c) => c.dispose());
      estudoGraficosPagina = [];
      const cores = lerCoresGraficoDoDocumento(container);
      const t = obterTextosEstudo(obterLocaleAtual());
      const ch = echarts.init(boxLin);
      estudoGraficosPagina.push(ch);

      if (focosCron.length === 0) {
        ch.setOption({
          ...opcoesTemaGraficoEcharts(),
          title: {
            text: t.historicoVazio,
            left: 'center',
            top: 'middle',
            textStyle: { color: cores.textoSuave },
          },
        });
        return;
      }

      ch.setOption({
        ...opcoesTemaGraficoEcharts(),
        textStyle: { color: cores.textoPrincipal },
        grid: { left: 40, right: 12, bottom: 28, top: 24, containLabel: true },
        xAxis: { type: 'category', data: focosCron.map((_, ix) => String(ix + 1)) },
        yAxis: { type: 'value' },
        series: [
          {
            type: 'line',
            smooth: true,
            areaStyle: { opacity: 0.12, color: cores.destaque },
            itemStyle: { color: cores.destaque },
            lineStyle: { color: cores.destaque },
            data: focosCron.map((s) => s.duracao_minutos),
          },
        ],
      });
    }

    async function refrescarDadosLista(): Promise<void> {
      const sessoes = await repo.listarSessoesEstudo(36);
      const focosCron = [...sessoes].filter((s) => s.tipo_ciclo === 'foco').slice(-16);
      const conquistas = await repo.listarConquistasEstudo();

      listaHistorico.renderizar(sessoes);
      listaConquistas.renderizar(conquistas);
      pintarLinha(focosCron);
    }

    aplicarRotulos();
    ctl.reporCicloFoco();
    sincronizarBotoes();

    bStart.addEventListener(
      'click',
      () => {
        ctl.iniciar();
        sincronizarBotoes();
      },
      { signal: sinal },
    );

    bPause.addEventListener(
      'click',
      () => {
        ctl.pausar();
        sincronizarBotoes();
      },
      { signal: sinal },
    );

    bResume.addEventListener(
      'click',
      () => {
        ctl.retomar();
        sincronizarBotoes();
      },
      { signal: sinal },
    );

    bReset.addEventListener(
      'click',
      () => {
        ctl.reporCicloFoco();
        btnReg.hidden = true;
        sincronizarBotoes();
      },
      { signal: sinal },
    );

    btnReg.addEventListener(
      'click',
      () => {
        limparCampos(campoAssunto, campoNota);
        dialogoRegistro.abrir();
      },
      { signal: sinal },
    );

    registarAoLocaleAtualizado(() => {
      aplicarRotulos();
      void refrescarDadosLista();
    }, sinal);

    await refrescarDadosLista();

    sinal.addEventListener('abort', () => {
      ctl.dispose();
    });
  },

  unmount() {
    estudoGraficosPagina.forEach((c) => c.dispose());
    estudoGraficosPagina = [];
    reporTituloDocumentoSoNomeApp();
  },
};

export default estudoPagina;
