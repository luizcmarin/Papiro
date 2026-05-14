import { criarControleGeracaoGraficos } from '../../infra/charts/controle-geracao-grafico.js';
import { garantirEchartsRegistrado } from '../../infra/charts/echarts-bundle.js';
import type { EChartsType } from '../../infra/charts/echarts-bundle.js';
import { lerCoresGraficoDoDocumento, opcoesTemaGraficoEcharts } from '../../infra/charts/cores-documento.js';
import * as repo from '../../modules/financeiro/dados/repositorio.js';
import type {
  CategoriaFinanceiroRow,
  TipoTransacao,
  TransacaoRow,
} from '../../modules/financeiro/dados/types.js';
import { obterTextosFinanceiro } from '../../modules/financeiro/ui/textos-financeiro.js';
import { eAbortoDom } from '../../modules/shared/dados/aborto-dom.js';
import { formatarDataInputUtc, intervaloMesInputUtc, parseDataInputUtcMs } from '../../modules/shared/dados/datas.js';
import { obterLocaleAtual, registarAoLocaleAtualizado } from '../../modules/shared/ui/locale.js';
import { criarDialogoConfirmacao, criarDialogoFormulario } from '../ui/dialogos.js';
import { criarCampoData, criarCampoNumero, criarCampoSelect, criarCampoTexto, criarFormGrid, limparCampos } from '../ui/form.js';
import { formatarMoeda } from '../ui/formatos.js';
import { criarCardUi, criarGrid, criarPaginaUi } from '../ui/layout.js';
import { criarBotaoAcao, criarLinhaLista, criarListaCrud } from '../ui/lista.js';
import type { PaginaMontavel } from '../pagina-montavel.js';
import { definirTituloDocumentoApp, reporTituloDocumentoSoNomeApp } from '../ui/titulo-documento.js';

function mesAtualAAAAMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Instâncias ECharts da página atual (dispose no unmount ou remontagem). */
let graficosFinanceiroPaginaAtual: EChartsType[] = [];

const financeiroPagina: PaginaMontavel = {
  async mount(container, sinal) {
    for (const gc of graficosFinanceiroPaginaAtual) {
      gc.dispose();
    }
    graficosFinanceiroPaginaAtual = [];

    const echarts = garantirEchartsRegistrado();
    const graf = criarControleGeracaoGraficos(sinal);
    const loc = obterLocaleAtual();
    const tLoc = obterTextosFinanceiro(loc);
    definirTituloDocumentoApp(tLoc.tituloPagina, loc);

    const divBar = document.createElement('div');
    divBar.className = 'shell__grafico';
    const divPie = document.createElement('div');
    divPie.className = 'shell__grafico';

    let categorias: CategoriaFinanceiroRow[] = [];
    let transacoes: TransacaoRow[] = [];

    let mesRef = mesAtualAAAAMM();
    let editingTx: TransacaoRow | null = null;

    const wrapMes = document.createElement('div');
    wrapMes.className = 'shell__campo';
    const rotMes = document.createElement('label');
    rotMes.className = 'shell__etiqueta';
    rotMes.setAttribute('for', 'fin-mes-ref');
    rotMes.textContent = tLoc.mesReferencia;
    const inputMes = document.createElement('input');
    inputMes.id = 'fin-mes-ref';
    inputMes.type = 'month';
    inputMes.className = 'shell__input-texto';
    inputMes.value = mesRef;
    wrapMes.append(rotMes, inputMes);

    const botaoNovaCategoria = criarBotaoAcao(tLoc.novaCategoria, { variant: 'brand' });
    const botaoNovaTransacao = criarBotaoAcao(tLoc.novaTransacao, { variant: 'brand' });
    const pagina = criarPaginaUi({
      titulo: tLoc.tituloPagina,
      acoes: [wrapMes, botaoNovaCategoria, botaoNovaTransacao],
    });

    const campoCatNome = criarCampoTexto({ rotulo: tLoc.campoNome });
    const campoCatIcone = criarCampoTexto({ rotulo: tLoc.campoIcone, valorInicial: 'payments' });
    const campoCatCor = criarCampoTexto({ rotulo: tLoc.campoCor, valorInicial: '#4FC3F7' });
    const campoCatLimite = criarCampoNumero({ rotulo: tLoc.campoLimite, valorInicial: 0, step: 'any' });

    const campoTxDescricao = criarCampoTexto({ rotulo: tLoc.campoDescricao });
    const campoTxValor = criarCampoNumero({ rotulo: tLoc.campoValor, valorInicial: 0, min: 0, step: 'any' });
    const campoTxTipo = criarCampoSelect({
      rotulo: tLoc.campoTipo,
      opcoes: [
        { valor: '0', texto: tLoc.tipoReceita },
        { valor: '1', texto: tLoc.tipoDespesa },
      ],
    });
    const campoTxCategoria = criarCampoSelect({ rotulo: tLoc.campoCategoria });
    const campoTxVencimento = criarCampoData({
      rotulo: tLoc.campoVencimento,
      valorInicial: formatarDataInputUtc(Date.now()),
    });
    const dPago = document.createElement('label');
    dPago.className = 'shell__checkbox-linha';
    const ckPago = document.createElement('input');
    ckPago.type = 'checkbox';
    ckPago.checked = true;
    const textoPago = document.createTextNode(tLoc.pagoLabel);
    dPago.append(ckPago, textoPago);

    const msgBd = document.createElement('p');
    msgBd.className = 'shell__sub';
    msgBd.hidden = true;

    const confirmacao = criarDialogoConfirmacao({
      titulo: tLoc.apagarTransacaoTitulo,
      texto: tLoc.apagarTransacaoTitulo,
      cancelar: tLoc.cancelarDialogo,
      confirmar: tLoc.apagarConfirmar,
      signal: sinal,
    });

    const listaCategorias = criarListaCrud<CategoriaFinanceiroRow>({
      vazio: tLoc.listaVaziaCategorias,
      renderItem: (categoria) => {
        const tm = obterTextosFinanceiro(obterLocaleAtual());
        const apagar = criarBotaoAcao(tm.apagar, { variant: 'danger' });
        apagar.addEventListener(
          'click',
          () => {
            confirmacao.abrir({
              titulo: tm.apagarCategoriaTitulo,
              texto: tm.apagarCategoriaTitulo,
              aoConfirmar: async () => {
                await repo.apagarCategoria(categoria.id);
                await refrescarListaCategorias();
                await refrescarTransacoesMes();
                encadearCharts();
              },
            });
          },
          { signal: sinal },
        );

        return criarLinhaLista({
          titulo: categoria.nome,
          meta: `${categoria.icone || 'payments'} · ${categoria.hex_cor} · ${formatarMoeda(
            categoria.limite_mensal,
            obterLocaleAtual(),
          )}`,
          acoes: [apagar],
        });
      },
    });

    const listaTransacoes = criarListaCrud<TransacaoRow>({
      vazio: tLoc.listaVaziaTransacoes,
      renderItem: (transacao) => {
        const tm = obterTextosFinanceiro(obterLocaleAtual());
        const mapaNome = new Map(categorias.map((c) => [c.id, c.nome] as const));
        const tag = transacao.tipo === 0 ? tm.tipoReceita : tm.tipoDespesa;
        const editar = criarBotaoAcao(tm.editar, { variant: 'neutral' });
        editar.addEventListener(
          'click',
          () => {
            editingTx = transacao;
            campoTxDescricao.definirValor(transacao.descricao);
            campoTxValor.definirValor(transacao.valor);
            campoTxTipo.definirValor(String(transacao.tipo));
            campoTxCategoria.definirValor(String(transacao.categoria_id));
            campoTxVencimento.definirValor(formatarDataInputUtc(transacao.data_vencimento));
            ckPago.checked = transacao.esta_pago !== 0;
            dialogoTransacao.definirTitulo(tm.salvarTransacao);
            dialogoTransacao.botaoConfirmar.textContent = tm.salvarTransacao;
            dialogoTransacao.abrir();
          },
          { signal: sinal },
        );
        const apagar = criarBotaoAcao(tm.apagar, { variant: 'danger' });
        apagar.addEventListener(
          'click',
          () => {
            confirmacao.abrir({
              titulo: tm.apagarTransacaoTitulo,
              texto: tm.apagarTransacaoTitulo,
              aoConfirmar: async () => {
                await repo.apagarTransacao(transacao.id);
                await refrescarTransacoesMes();
                encadearCharts();
              },
            });
          },
          { signal: sinal },
        );

        return criarLinhaLista({
          titulo: `${tag} · ${transacao.descricao}`,
          meta: `${formatarMoeda(transacao.valor, obterLocaleAtual())} · ${
            mapaNome.get(transacao.categoria_id) ?? '—'
          } · ${formatarDataParaUi(transacao.data_vencimento)}`,
          acoes: [editar, apagar],
        });
      },
    });

    const listaAlertas = criarListaCrud<string>({
      vazio: tLoc.semAlertas,
      renderItem: (alerta) => criarLinhaLista({ titulo: alerta }),
    });

    const dialogoCategoria = criarDialogoFormulario({
      titulo: tLoc.novaCategoria,
      confirmarTexto: tLoc.salvarCategoria,
      cancelarTexto: tLoc.cancelarDialogo,
      conteudo: [criarFormGrid(campoCatNome.elemento, campoCatIcone.elemento, campoCatCor.elemento, campoCatLimite.elemento)],
      signal: sinal,
      aoConfirmar: async () => {
        msgBd.hidden = true;
        const nome = campoCatNome.valor();
        if (!nome) return false;

        try {
          await repo.inserirCategoria({
            nome,
            icone: campoCatIcone.valor() || 'payments',
            hex_cor: campoCatCor.valor() || '#4FC3F7',
            limite_mensal: Number.isFinite(campoCatLimite.valor()) ? campoCatLimite.valor() : 0,
          });
          limparCampos(campoCatNome, campoCatIcone, campoCatCor);
          campoCatIcone.definirValor('payments');
          campoCatCor.definirValor('#4FC3F7');
          campoCatLimite.definirValor(0);
          await refrescarListaCategorias();
          await refrescarTransacoesMes();
        } catch {
          msgBd.hidden = false;
          msgBd.textContent = obterTextosFinanceiro(obterLocaleAtual()).erroBd;
          return false;
        }
      },
    });

    const dialogoTransacao = criarDialogoFormulario({
      titulo: tLoc.novaTransacao,
      confirmarTexto: tLoc.salvarTransacao,
      cancelarTexto: tLoc.cancelarDialogo,
      conteudo: [
        criarFormGrid(
          campoTxDescricao.elemento,
          campoTxValor.elemento,
          campoTxTipo.elemento,
          campoTxCategoria.elemento,
          campoTxVencimento.elemento,
        ),
        dPago,
      ],
      signal: sinal,
      aoConfirmar: async () => {
        msgBd.hidden = true;
        const catId = Number(campoTxCategoria.valor());
        const val = campoTxValor.valor();
        const utc = parseDataInputUtcMs(campoTxVencimento.valor());
        if (!Number.isFinite(catId) || catId <= 0 || !Number.isFinite(val) || utc === null) return false;

        const entrada = {
          descricao: campoTxDescricao.valor(),
          valor: Math.abs(val),
          tipo: Number(campoTxTipo.valor()) as TipoTransacao,
          categoria_id: catId,
          data_vencimento: utc,
          esta_pago: ckPago.checked ? 1 : 0,
        };
        try {
          if (editingTx) {
            await repo.atualizarTransacao(editingTx.id, entrada);
          } else {
            await repo.inserirTransacao(entrada);
          }
          reporFormularioTransacao();
          await refrescarTransacoesMes();
          encadearCharts();
        } catch {
          msgBd.hidden = false;
          msgBd.textContent = obterTextosFinanceiro(obterLocaleAtual()).erroBd;
          return false;
        }
      },
    });

    const cardBar = criarCardUi({ titulo: tLoc.graficoBarrasTitulo, conteudo: [divBar] });
    const cardPie = criarCardUi({ titulo: tLoc.graficoPizzaTitulo, conteudo: [divPie] });
    const cardCategorias = criarCardUi({ titulo: tLoc.categoriasTitulo, conteudo: [listaCategorias.elemento] });
    const cardTransacoes = criarCardUi({ titulo: tLoc.transacoesTitulo, conteudo: [listaTransacoes.elemento] });
    const cardAlertas = criarCardUi({ titulo: tLoc.alertasTitulo, conteudo: [listaAlertas.elemento] });

    pagina.corpo.append(
      msgBd,
      criarGrid(cardBar.cartao, cardPie.cartao),
      cardAlertas.cartao,
      criarGrid(cardCategorias.cartao, cardTransacoes.cartao),
    );
    container.replaceChildren(pagina.raiz, dialogoCategoria.elemento, dialogoTransacao.elemento, confirmacao.elemento);

    function aplicarTitulosLocales(): void {
      const lc = obterLocaleAtual();
      const tm = obterTextosFinanceiro(lc);
      definirTituloDocumentoApp(tm.tituloPagina, lc);
      pagina.titulo.textContent = tm.tituloPagina;
      rotMes.textContent = tm.mesReferencia;
      botaoNovaCategoria.textContent = tm.novaCategoria;
      botaoNovaTransacao.textContent = tm.novaTransacao;
      cardBar.titulo.textContent = tm.graficoBarrasTitulo;
      cardPie.titulo.textContent = tm.graficoPizzaTitulo;
      cardAlertas.titulo.textContent = tm.alertasTitulo;
      cardCategorias.titulo.textContent = tm.categoriasTitulo;
      cardTransacoes.titulo.textContent = tm.transacoesTitulo;
      campoCatNome.definirRotulo(tm.campoNome);
      campoCatNome.definirPlaceholder(tm.campoNome);
      campoCatIcone.definirRotulo(tm.campoIcone);
      campoCatIcone.definirPlaceholder(tm.campoIcone);
      campoCatCor.definirRotulo(tm.campoCor);
      campoCatCor.definirPlaceholder(tm.campoCor);
      campoCatLimite.definirRotulo(tm.campoLimite);
      campoCatLimite.definirPlaceholder(tm.campoLimite);
      campoTxDescricao.definirRotulo(tm.campoDescricao);
      campoTxDescricao.definirPlaceholder(tm.campoDescricao);
      campoTxValor.definirRotulo(tm.campoValor);
      campoTxValor.definirPlaceholder(tm.campoValor);
      campoTxTipo.definirRotulo(tm.campoTipo);
      renderizarTiposTransacao();
      campoTxCategoria.definirRotulo(tm.campoCategoria);
      campoTxVencimento.definirRotulo(tm.campoVencimento);
      campoTxVencimento.definirPlaceholder(tm.campoVencimento);
      textoPago.textContent = tm.pagoLabel;
      dialogoCategoria.definirTitulo(tm.novaCategoria);
      dialogoCategoria.botaoConfirmar.textContent = tm.salvarCategoria;
      dialogoCategoria.botaoCancelar.textContent = tm.cancelarDialogo;
      dialogoTransacao.definirTitulo(editingTx ? tm.salvarTransacao : tm.novaTransacao);
      dialogoTransacao.botaoConfirmar.textContent = tm.salvarTransacao;
      dialogoTransacao.botaoCancelar.textContent = tm.cancelarDialogo;
      listaCategorias.definirTextoVazio(tm.listaVaziaCategorias);
      listaTransacoes.definirTextoVazio(tm.listaVaziaTransacoes);
      listaAlertas.definirTextoVazio(tm.semAlertas);
      confirmacao.definirTextos({
        titulo: tm.apagarTransacaoTitulo,
        texto: tm.apagarTransacaoTitulo,
        cancelar: tm.cancelarDialogo,
        confirmar: tm.apagarConfirmar,
      });
    }

    function renderizarTiposTransacao(): void {
      const valorAtual = campoTxTipo.valor() || '1';
      const tm = obterTextosFinanceiro(obterLocaleAtual());
      campoTxTipo.input.replaceChildren(
        Object.assign(document.createElement('option'), { value: '0', textContent: tm.tipoReceita }),
        Object.assign(document.createElement('option'), { value: '1', textContent: tm.tipoDespesa }),
      );
      campoTxTipo.definirValor(valorAtual);
    }

    function encadearCharts(): void {
      const minhaGeracao = graf.novaGeracao();
      for (const g of graficosFinanceiroPaginaAtual) {
        g.dispose();
      }
      graficosFinanceiroPaginaAtual = [];

      void (async (): Promise<void> => {
        const cores = lerCoresGraficoDoDocumento(container);
        const localeId = obterLocaleAtual();
        const tmGraf = obterTextosFinanceiro(localeId);
        if (graf.obsoleto(minhaGeracao)) return;
        let pts;
        try {
          pts = await repo.agregarReceitaDespesaUltimosMeses(8);
          sinal.throwIfAborted();
        } catch (erro) {
          if (eAbortoDom(erro)) return;
          return;
        }
        if (graf.obsoleto(minhaGeracao)) return;
        if (divBar.offsetParent === null && !divBar.isConnected) return;

        const cBar = echarts.init(divBar);
        graficosFinanceiroPaginaAtual.push(cBar);
        cBar.setOption({
          ...opcoesTemaGraficoEcharts(),
          title: { show: false },
          textStyle: { color: cores.textoPrincipal },
          tooltip: {},
          legend: { textStyle: { color: cores.textoPrincipal } },
          xAxis: {
            type: 'category',
            data: pts.map((p) => p.rotulo),
            axisLine: { lineStyle: { color: cores.linhaGrade } },
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number): string => formatarMoeda(v, localeId),
            },
          },
          series: [
            {
              type: 'bar',
              name: tmGraf.tipoReceita,
              data: pts.map((p) => p.receita),
              itemStyle: { color: cores.destaque },
            },
            {
              type: 'bar',
              name: tmGraf.tipoDespesa,
              data: pts.map((p) => p.despesa),
              itemStyle: { color: '#EF5350' },
            },
          ],
        });

        const limites = intervaloMesInputUtc(mesRef);
        let agrega: Awaited<ReturnType<typeof repo.somarDespesasPorCategoriaNoIntervalo>>;
        if (!limites) agrega = [];
        else {
          try {
            agrega = await repo.somarDespesasPorCategoriaNoIntervalo(limites.min, limites.maxEx);
            sinal.throwIfAborted();
          } catch (erro) {
            if (eAbortoDom(erro)) {
              graficosFinanceiroPaginaAtual.forEach((x) => x.dispose());
              graficosFinanceiroPaginaAtual = [];
              return;
            }
            agrega = [];
          }
        }
        if (graf.obsoleto(minhaGeracao)) {
          graficosFinanceiroPaginaAtual.forEach((x) => x.dispose());
          graficosFinanceiroPaginaAtual = [];
          return;
        }
        const cPie = echarts.init(divPie);
        graficosFinanceiroPaginaAtual.push(cPie);
        if (agrega.length === 0) {
          cPie.setOption({
            ...opcoesTemaGraficoEcharts(),
            title: {
              text: tmGraf.listaVaziaGraficos,
              left: 'center',
              top: 'center',
              textStyle: { fontSize: 14, color: cores.textoSuave },
            },
          });
          return;
        }

        if (graf.obsoleto(minhaGeracao)) {
          graficosFinanceiroPaginaAtual.forEach((x) => x.dispose());
          graficosFinanceiroPaginaAtual = [];
          return;
        }
        cPie.setOption({
          ...opcoesTemaGraficoEcharts(),
          tooltip: {},
          legend: {
            orient: 'vertical',
            left: 'left',
            textStyle: { color: cores.textoPrincipal },
          },
          series: [
            {
              type: 'pie',
              radius: ['40%', '70%'],
              data: agrega.map((r) => ({ name: r.nome, value: r.total, itemStyle: { color: r.hex_cor } })),
            },
          ],
        });
      })();
    }

    function renderizarAlertasFinanceiros(): void {
      const tm = obterTextosFinanceiro(obterLocaleAtual());
      const alertas: string[] = [];
      const despesas = transacoes.filter((t) => t.tipo === 1);
      const receitas = transacoes.filter((t) => t.tipo === 0);
      const totalReceita = receitas.reduce((total, tx) => total + tx.valor, 0);
      const totalDespesa = despesas.reduce((total, tx) => total + tx.valor, 0);
      const vencidas = despesas.filter((tx) => tx.esta_pago === 0 && tx.data_vencimento < Date.now()).length;

      for (const categoria of categorias) {
        if (categoria.limite_mensal <= 0) continue;
        const totalCategoria = despesas
          .filter((tx) => tx.categoria_id === categoria.id)
          .reduce((total, tx) => total + tx.valor, 0);
        if (totalCategoria > categoria.limite_mensal) {
          alertas.push(
            `${tm.limiteCategoria} ${categoria.nome}: ${formatarMoeda(totalCategoria, obterLocaleAtual())} / ${formatarMoeda(
              categoria.limite_mensal,
              obterLocaleAtual(),
            )}`,
          );
        }
      }

      if (vencidas > 0) {
        alertas.push(`${tm.transacoesVencidas}: ${String(vencidas)}`);
      }

      const saldo = totalReceita - totalDespesa;
      const diasMes = 30;
      const gastoDia = totalDespesa / diasMes;
      if (saldo > 0 && gastoDia > 0) {
        alertas.push(`${tm.diasSobrevivencia}: ${String(Math.floor(saldo / gastoDia))}`);
      }

      listaAlertas.renderizar(alertas);
    }

    async function garantirSeedCategoria(): Promise<void> {
      if (categorias.length > 0) return;
      await repo.inserirCategoria({
        nome: 'Geral',
        icone: 'payments',
        hex_cor: '#4FC3F7',
        limite_mensal: 0,
      });
    }

    async function refrescarListaCategorias(): Promise<void> {
      try {
        categorias = await repo.listarCategorias();
      } catch {
        msgBd.hidden = false;
        msgBd.textContent = obterTextosFinanceiro(obterLocaleAtual()).erroBd;
        return;
      }
      if (categorias.length === 0) {
        await garantirSeedCategoria();
        categorias = await repo.listarCategorias();
      }

      renderizarOpcoesCategorias();
      listaCategorias.renderizar(categorias);
      renderizarAlertasFinanceiros();
    }

    function renderizarOpcoesCategorias(): void {
      const valorAtual = campoTxCategoria.valor();
      campoTxCategoria.input.replaceChildren(Object.assign(document.createElement('option'), { value: '', textContent: '—' }));
      for (const c of categorias) {
        const opt = document.createElement('option');
        opt.value = String(c.id);
        opt.textContent = c.nome;
        campoTxCategoria.input.append(opt);
      }
      campoTxCategoria.definirValor(categorias.some((c) => String(c.id) === valorAtual) ? valorAtual : '');
    }

    async function refrescarTransacoesMes(): Promise<void> {
      const limites = intervaloMesInputUtc(mesRef);
      if (!limites) return;
      try {
        transacoes = await repo.listarTransacoesNoIntervalo(limites.min, limites.maxEx);
      } catch {
        msgBd.hidden = false;
        msgBd.textContent = obterTextosFinanceiro(obterLocaleAtual()).erroBd;
        return;
      }
      listaTransacoes.renderizar(transacoes);
      renderizarAlertasFinanceiros();
    }

    function formatarDataParaUi(ms: number): string {
      return formatarDataInputUtc(ms);
    }

    aplicarTitulosLocales();
    await refrescarListaCategorias();
    await refrescarTransacoesMes();
    encadearCharts();

    inputMes.addEventListener(
      'change',
      async () => {
        mesRef = inputMes.value;
        await refrescarTransacoesMes();
        encadearCharts();
      },
      { signal: sinal },
    );

    botaoNovaCategoria.addEventListener(
      'click',
      () => {
        limparCampos(campoCatNome, campoCatIcone, campoCatCor);
        campoCatIcone.definirValor('payments');
        campoCatCor.definirValor('#4FC3F7');
        campoCatLimite.definirValor(0);
        dialogoCategoria.abrir();
      },
      { signal: sinal },
    );

    botaoNovaTransacao.addEventListener(
      'click',
      () => {
        reporFormularioTransacao();
        const tm = obterTextosFinanceiro(obterLocaleAtual());
        dialogoTransacao.definirTitulo(tm.novaTransacao);
        dialogoTransacao.botaoConfirmar.textContent = tm.salvarTransacao;
        dialogoTransacao.abrir();
      },
      { signal: sinal },
    );

    function reporFormularioTransacao(): void {
      editingTx = null;
      limparCampos(campoTxDescricao);
      campoTxValor.definirValor(0);
      campoTxTipo.definirValor('1');
      campoTxCategoria.definirValor(categorias[0] ? String(categorias[0].id) : '');
      campoTxVencimento.definirValor(formatarDataInputUtc(Date.now()));
      ckPago.checked = true;
    }

    registarAoLocaleAtualizado(() => {
      aplicarTitulosLocales();
      void refrescarListaCategorias();
      void refrescarTransacoesMes();
      encadearCharts();
    }, sinal);
  },

  unmount() {
    for (const gc of graficosFinanceiroPaginaAtual) {
      gc.dispose();
    }
    graficosFinanceiroPaginaAtual = [];
    reporTituloDocumentoSoNomeApp();
  },
};

export default financeiroPagina;
