import { criarControleGeracaoGraficos } from '../../infra/charts/controle-geracao-grafico.js';
import { garantirEchartsRegistrado } from '../../infra/charts/echarts-bundle.js';
import type { EChartsType } from '../../infra/charts/echarts-bundle.js';
import { lerCoresGraficoDoDocumento, opcoesTemaGraficoEcharts } from '../../infra/charts/cores-documento.js';
import * as dashRepo from '../../modules/dashboard/dados/repositorio.js';
import { obterTextosDashboard } from '../../modules/dashboard/ui/textos-dashboard.js';
import { eAbortoDom } from '../../modules/shared/dados/aborto-dom.js';
import { intervaloMesLocalAtualUtc } from '../../modules/shared/dados/datas.js';
import { obterLocaleAtual, registarAoLocaleAtualizado } from '../../modules/shared/ui/locale.js';
import { contarSessoesFocoCompletas } from '../../modules/estudo/dados/repositorio.js';
import { formatarMoeda } from '../ui/formatos.js';
import { criarCardUi, criarGrid, criarPaginaUi } from '../ui/layout.js';
import { criarBotaoAcao } from '../ui/lista.js';
import { criarGradeMetricas, renderizarMetricas } from '../ui/metricas.js';
import { hrefParaRota } from '../menu-rotas.js';
import type { PaginaMontavel } from '../pagina-montavel.js';
import { definirTituloDocumentoApp, reporTituloDocumentoSoNomeApp } from '../ui/titulo-documento.js';

/** Instâncias ECharts da página (dispose no `unmount`). */
let graficosDashboardPagina: EChartsType[] = [];

const dashboardPagina: PaginaMontavel = {
  async mount(container, sinal) {
    for (const g of graficosDashboardPagina) {
      g.dispose();
    }
    graficosDashboardPagina = [];

    const echarts = garantirEchartsRegistrado();
    const graf = criarControleGeracaoGraficos(sinal);
    let valoresKpi = ['—', '—', '—', '—', '—', '—', '—'];

    const loc0 = obterLocaleAtual();
    const t0 = obterTextosDashboard(loc0);
    definirTituloDocumentoApp(t0.tituloPagina, loc0);

    const pagina = criarPaginaUi({ titulo: t0.tituloPagina });

    const msgBd = document.createElement('p');
    msgBd.className = 'shell__sub';
    msgBd.hidden = true;
    msgBd.setAttribute('role', 'alert');

    const alertaDpa = document.createElement('p');
    alertaDpa.className = 'shell__empty shell__empty--erro';
    alertaDpa.hidden = true;
    alertaDpa.setAttribute('role', 'status');

    const kpiRow = criarGradeMetricas();

    const divGauge = document.createElement('div');
    divGauge.className = 'shell__grafico shell__grafico--compacto';

    const divFin = document.createElement('div');
    divFin.className = 'shell__grafico';

    const divMeta = document.createElement('div');
    divMeta.className = 'shell__grafico';

    const quickActions = document.createElement('div');
    quickActions.className = 'shell__acoes';

    const btnPerfil = criarBotaoAcao(t0.acaoPerfilIce, { variant: 'brand' });
    const btnQr = criarBotaoAcao(t0.acaoQr, { variant: 'neutral' });
    const btnPrep = criarBotaoAcao(t0.acaoPreparacao, { variant: 'neutral' });
    const btnCofre = criarBotaoAcao(t0.acaoCofre, { variant: 'neutral' });
    const btnConfig = criarBotaoAcao(t0.acaoConfig, { variant: 'neutral' });
    quickActions.append(btnPerfil, btnQr, btnPrep, btnCofre, btnConfig);

    const syncInfo = document.createElement('p');
    syncInfo.className = 'shell__hint';
    syncInfo.textContent = t0.syncFutura;

    const cardAcoes = criarCardUi({
      titulo: t0.acoesRapidasTitulo,
      conteudo: [quickActions, syncInfo],
    });
    const cardGauge = criarCardUi({
      titulo: t0.graficoGaugeTitulo,
      descricao: t0.graficoGaugeSub,
      conteudo: [divGauge],
    });
    const cardFin = criarCardUi({ titulo: t0.graficoFinMesTitulo, conteudo: [divFin] });
    const cardMeta = criarCardUi({ titulo: t0.graficoMetasTitulo, conteudo: [divMeta] });

    pagina.corpo.append(
      msgBd,
      alertaDpa,
      kpiRow,
      criarGrid(cardAcoes.cartao, cardGauge.cartao),
      criarGrid(cardFin.cartao, cardMeta.cartao),
    );
    container.replaceChildren(pagina.raiz);

    function renderizarKpis(): void {
      const tm = obterTextosDashboard(obterLocaleAtual());
      renderizarMetricas(kpiRow, [
        { rotulo: tm.kpiAnotacoes, valor: valoresKpi[0] ?? '—' },
        { rotulo: tm.kpiReceitas, valor: valoresKpi[1] ?? '—' },
        { rotulo: tm.kpiFinanceiroMes, valor: valoresKpi[2] ?? '—' },
        { rotulo: tm.kpiMetasAbertas, valor: valoresKpi[3] ?? '—' },
        { rotulo: tm.kpiMetasConcluidas, valor: valoresKpi[4] ?? '—' },
        { rotulo: tm.kpiSessoesFoco, valor: valoresKpi[5] ?? '—' },
        { rotulo: tm.kpiProntidao, valor: valoresKpi[6] ?? '—' },
      ]);
    }

    function aplicarRotulos(): void {
      const lc = obterLocaleAtual();
      const tm = obterTextosDashboard(lc);
      definirTituloDocumentoApp(tm.tituloPagina, lc);
      pagina.titulo.textContent = tm.tituloPagina;
      cardGauge.titulo.textContent = tm.graficoGaugeTitulo;
      if (cardGauge.subtitulo) {
        cardGauge.subtitulo.textContent = tm.graficoGaugeSub;
      }
      cardAcoes.titulo.textContent = tm.acoesRapidasTitulo;
      cardFin.titulo.textContent = tm.graficoFinMesTitulo;
      cardMeta.titulo.textContent = tm.graficoMetasTitulo;
      msgBd.textContent = tm.erroBd;
      alertaDpa.textContent = tm.alertaDpa;
      btnPerfil.textContent = tm.acaoPerfilIce;
      btnQr.textContent = tm.acaoQr;
      btnPrep.textContent = tm.acaoPreparacao;
      btnCofre.textContent = tm.acaoCofre;
      btnConfig.textContent = tm.acaoConfig;
      syncInfo.textContent = tm.syncFutura;
      renderizarKpis();
    }

    function encadearCharts(
      indiceProntidao: Awaited<ReturnType<typeof dashRepo.calcularIndiceProntidaoDashboard>>,
      totaisMes: Awaited<ReturnType<typeof dashRepo.totaisFinanceirosNoIntervalo>>,
      contMeta: Awaited<ReturnType<typeof dashRepo.contarMetasPorEstado>>,
    ): void {
      const minhaGeracao = graf.novaGeracao();
      for (const g of graficosDashboardPagina) {
        g.dispose();
      }
      graficosDashboardPagina = [];

      const tm = obterTextosDashboard(obterLocaleAtual());
      const cores = lerCoresGraficoDoDocumento(container);

      const cGg = echarts.init(divGauge);
      graficosDashboardPagina.push(cGg);

      const pct = Math.max(0, Math.min(100, indiceProntidao.percentual));

      cGg.setOption({
        ...opcoesTemaGraficoEcharts(),
        tooltip: {},
        series: [
          {
            type: 'gauge',
            radius: '100%',
            startAngle: 220,
            endAngle: -35,
            min: 0,
            max: 100,
            splitNumber: 5,
            progress: {
              width: 8,
              show: true,
              color: cores.destaque,
            },
            axisLine: {
              lineStyle: { width: 8, color: [[1, cores.linhaGrade]] },
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { distance: -16, fontSize: 10, color: cores.textoSuave },
            pointer: { show: false },
            anchor: { show: false },
            title: {
              fontSize: 12,
              color: cores.textoSuave,
            },
            detail: {
              valueAnimation: true,
              fontSize: 18,
              color: cores.textoPrincipal,
              formatter: `{value}%`,
            },
            data: [{ value: Math.round(pct), name: indiceProntidao.alerta }],
          },
        ],
      });

      if (graf.obsoleto(minhaGeracao)) {
        graficosDashboardPagina.forEach((x) => x.dispose());
        graficosDashboardPagina = [];
        return;
      }

      const cFin = echarts.init(divFin);
      graficosDashboardPagina.push(cFin);
      if (totaisMes.receita <= 0 && totaisMes.despesa <= 0) {
        cFin.setOption({
          ...opcoesTemaGraficoEcharts(),
          title: {
            text: tm.listaVaziaGraficos,
            left: 'center',
            top: 'center',
            textStyle: { fontSize: 14, color: cores.textoSuave },
          },
        });
      } else {
        cFin.setOption({
          ...opcoesTemaGraficoEcharts(),
          tooltip: {},
          legend: { bottom: 0, textStyle: { color: cores.textoPrincipal } },
          series: [
            {
              type: 'pie',
              radius: ['36%', '62%'],
              data: [
                { value: totaisMes.receita, name: tm.receitaLegenda, itemStyle: { color: cores.destaque } },
                { value: totaisMes.despesa, name: tm.despesaLegenda, itemStyle: { color: '#EF5350' } },
              ],
            },
          ],
        });
      }

      if (graf.obsoleto(minhaGeracao)) {
        graficosDashboardPagina.forEach((x) => x.dispose());
        graficosDashboardPagina = [];
        return;
      }

      const cMeta = echarts.init(divMeta);
      graficosDashboardPagina.push(cMeta);
      if (contMeta.abertas === 0 && contMeta.concluidas === 0) {
        cMeta.setOption({
          ...opcoesTemaGraficoEcharts(),
          title: {
            text: tm.listaVaziaGraficos,
            left: 'center',
            top: 'center',
            textStyle: { fontSize: 14, color: cores.textoSuave },
          },
        });
      } else {
        cMeta.setOption({
          ...opcoesTemaGraficoEcharts(),
          tooltip: {},
          legend: { bottom: 0, textStyle: { color: cores.textoPrincipal } },
          series: [
            {
              type: 'pie',
              radius: ['36%', '62%'],
              data: [
                { value: contMeta.abertas, name: tm.metaAbertaLegenda, itemStyle: { color: cores.destaque } },
                { value: contMeta.concluidas, name: tm.metaConclLegenda, itemStyle: { color: cores.linhaGrade } },
              ],
            },
          ],
        });
      }
    }

    async function carregar(): Promise<void> {
      msgBd.hidden = true;
      const lim = intervaloMesLocalAtualUtc();
      try {
        const [nAnot, nRec, tot, ultRel, mets, nFoco, indiceProntidao, perfil] = await Promise.all([
          dashRepo.contarAnotacoesNaoArquivadas(),
          dashRepo.contarReceitas(),
          dashRepo.totaisFinanceirosNoIntervalo(lim.min, lim.maxEx),
          dashRepo.obterUltimoRelatorioMinisterioResumo(),
          dashRepo.contarMetasPorEstado(),
          contarSessoesFocoCompletas(),
          dashRepo.calcularIndiceProntidaoDashboard(),
          dashRepo.obterPerfilDashboardResumo(),
        ]);

        sinal.throwIfAborted();

        const locM = obterLocaleAtual();

        valoresKpi = [
          String(nAnot),
          String(nRec),
          `${formatarMoeda(tot.receita, locM, 0)} / ${formatarMoeda(tot.despesa, locM, 0)}`,
          String(mets.abertas),
          String(mets.concluidas),
          `${String(nFoco)} · ${ultRel ? `${Math.round((100 * Number(ultRel.horas)) / Math.max(Number(ultRel.meta_horas), 0.001))}% campo` : 'sem relatório'}`,
          `${indiceProntidao.percentual}%`,
        ];
        alertaDpa.hidden = !perfil || (perfil.recusaTransfusao === 0 && perfil.uriScanDpa.trim().length === 0);
        renderizarKpis();

        encadearCharts(indiceProntidao, tot, mets);
      } catch (erro) {
        if (eAbortoDom(erro)) return;
        msgBd.hidden = false;
      }
    }

    aplicarRotulos();
    btnPerfil.addEventListener('click', () => { window.location.href = hrefParaRota('/perfil'); }, { signal: sinal });
    btnQr.addEventListener('click', () => { window.location.href = hrefParaRota('/qr'); }, { signal: sinal });
    btnPrep.addEventListener('click', () => { window.location.href = hrefParaRota('/preparacao'); }, { signal: sinal });
    btnCofre.addEventListener('click', () => { window.location.href = hrefParaRota('/preparacao/cofre'); }, { signal: sinal });
    btnConfig.addEventListener('click', () => { window.location.href = hrefParaRota('/configuracoes'); }, { signal: sinal });
    await carregar();

    registarAoLocaleAtualizado(() => {
      aplicarRotulos();
      void carregar();
    }, sinal);
  },

  unmount() {
    for (const g of graficosDashboardPagina) {
      g.dispose();
    }
    graficosDashboardPagina = [];
    reporTituloDocumentoSoNomeApp();
  },
};

export default dashboardPagina;
