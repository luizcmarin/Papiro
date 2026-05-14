import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';

import { garantirEchartsRegistrado } from '../../infra/charts/echarts-bundle.js';
import type { EChartsType } from '../../infra/charts/echarts-bundle.js';
import { lerCoresGraficoDoDocumento, opcoesTemaGraficoEcharts } from '../../infra/charts/cores-documento.js';
import * as repo from '../../modules/metas/dados/repositorio.js';
import type { MetaRow } from '../../modules/metas/dados/types.js';
import { classificarPrazoMeta, percentualMeta, sugerirItemMetaModulo } from '../../modules/metas/dominio/progresso-metas.js';
import { obterTextosMetas } from '../../modules/metas/ui/textos-metas.js';
import { formatarDataInputUtc, MS_POR_DIA, parseDataInputUtcMs } from '../../modules/shared/dados/datas.js';
import { obterLocaleAtual, registarAoLocaleAtualizado } from '../../modules/shared/ui/locale.js';
import { criarDialogoConfirmacao, criarDialogoFormulario } from '../ui/dialogos.js';
import { criarCampoData, criarCampoNumero, criarCampoTexto, criarFormGrid, limparCampos } from '../ui/form.js';
import { criarCardUi, criarGrid, criarPaginaUi } from '../ui/layout.js';
import { criarBotaoAcao, criarLinhaLista, criarListaCrud } from '../ui/lista.js';
import type { PaginaMontavel } from '../pagina-montavel.js';
import { definirTituloDocumentoApp, reporTituloDocumentoSoNomeApp } from '../ui/titulo-documento.js';

let donutMetasPaginaAtual: EChartsType | null = null;

const metasPagina: PaginaMontavel = {
  async mount(container, sinal) {
    const echarts = garantirEchartsRegistrado();
    const locBase = obterLocaleAtual();
    const tb = obterTextosMetas(locBase);
    definirTituloDocumentoApp(tb.tituloPagina, locBase);

    let metas: MetaRow[] = [];
    let selecaoId: number | null = null;

    const botaoNovaMeta = criarBotaoAcao(tb.novoObjetivo, { variant: 'brand' });
    const pagina = criarPaginaUi({ titulo: tb.tituloPagina, acoes: [botaoNovaMeta] });

    const divChart = document.createElement('div');
    divChart.className = 'shell__grafico';

    const campoTitulo = criarCampoTexto({ rotulo: tb.tituloCampo });
    const campoItem = criarCampoTexto({ rotulo: tb.itemCampo });
    const campoAtivo = criarCampoTexto({ rotulo: tb.ativoNomeCampo });
    const campoDataMeta = criarCampoData({
      rotulo: tb.dataMetaCampo,
      valorInicial: formatarDataInputUtc(Date.now()),
    });
    const campoPrazo = criarCampoData({
      rotulo: tb.prazoCampo,
      valorInicial: formatarDataInputUtc(Date.now() + 7 * MS_POR_DIA),
    });
    const campoAtual = criarCampoNumero({ rotulo: tb.atualCampo, valorInicial: 0, step: 'any' });
    const campoAlvo = criarCampoNumero({ rotulo: tb.alvoCampo, valorInicial: 100, min: 0, step: 'any' });
    const concluidaLabel = document.createElement('label');
    concluidaLabel.className = 'shell__checkbox-linha';
    const concluidaInput = document.createElement('input');
    concluidaInput.type = 'checkbox';
    const concluidaTexto = document.createTextNode(tb.concluidaLabel);
    concluidaLabel.append(concluidaInput, concluidaTexto);

    const confirmacao = criarDialogoConfirmacao({
      titulo: tb.apagarTituloDialogo,
      texto: tb.apagarTituloDialogo,
      cancelar: tb.cancelar,
      confirmar: tb.apagarBotao,
      signal: sinal,
    });

    const listaMetas = criarListaCrud<MetaRow>({
      vazio: tb.listaVazia,
      renderItem: (meta) => {
        const textos = obterTextosMetas(obterLocaleAtual());
        const titulo = document.createElement('button');
        titulo.type = 'button';
        titulo.className = 'shell__lista-titulo shell__lista-botao';
        titulo.textContent = meta.esta_concluida ? `${meta.titulo} (${textos.concluidaLabel})` : meta.titulo;
        titulo.addEventListener(
          'click',
          () => {
            selecaoId = meta.id;
            reporDonut();
          },
          { signal: sinal },
        );

        const apagar = criarBotaoAcao(textos.apagarBotao, { variant: 'danger' });
        apagar.addEventListener(
          'click',
          () => {
            confirmacao.abrir({
              titulo: textos.apagarTituloDialogo,
              texto: textos.apagarTituloDialogo,
              aoConfirmar: async () => {
                await repo.apagarMeta(meta.id);
                selecaoId = null;
                await pintarLista();
              },
            });
          },
          { signal: sinal },
        );

        const atualLista = meta.esta_concluida !== 0 ? meta.progresso_alvo : meta.progresso_atual;
        const prazo = classificarPrazoMeta(meta);
        const prazoTexto =
          prazo === 'concluida'
            ? textos.concluidaLabel
            : prazo === 'vencida'
              ? textos.prazoVencida
              : prazo === 'vence_em_breve'
                ? textos.prazoEmBreve
                : prazo === 'em_dia'
                  ? textos.prazoEmDia
                  : textos.prazoSemPrazo;
        return criarLinhaLista({
          titulo,
          meta: `${atualLista}/${meta.progresso_alvo} · ${percentualMeta({
            progresso_atual: atualLista,
            progresso_alvo: meta.progresso_alvo,
          })}% · ${prazoTexto} · ${textos.sugestaoModulo}: ${sugerirItemMetaModulo(meta.ativo_nome)}`,
          acoes: [apagar],
        });
      },
    });

    const dialogoMeta = criarDialogoFormulario({
      titulo: tb.novoObjetivo,
      confirmarTexto: tb.salvar,
      cancelarTexto: tb.cancelar,
      conteudo: [
        criarFormGrid(
          campoTitulo.elemento,
          campoItem.elemento,
          campoAtivo.elemento,
          campoDataMeta.elemento,
          campoPrazo.elemento,
          campoAtual.elemento,
          campoAlvo.elemento,
        ),
        concluidaLabel,
      ],
      signal: sinal,
      aoConfirmar: async () => {
        const dm = parseDataInputUtcMs(campoDataMeta.valor());
        const pf = parseDataInputUtcMs(campoPrazo.valor());
        const pa = campoAtual.valor();
        const pb = campoAlvo.valor();
        if (dm === null || pf === null || !Number.isFinite(pa) || !Number.isFinite(pb) || pb <= 0) return false;

        await repo.inserirMeta({
          titulo: campoTitulo.valor() || '?',
          item: campoItem.valor(),
          ativo_id: 0,
          ativo_nome: campoAtivo.valor(),
          data_meta: dm,
          prazo_final: pf,
          progresso_atual: pa,
          progresso_alvo: pb,
          esta_concluida: concluidaInput.checked ? 1 : 0,
        });
        reporFormularioMeta();
        await lista();
      },
    });

    const cardLista = criarCardUi({ titulo: tb.tituloLista, conteudo: [listaMetas.elemento] });
    const cardGrafico = criarCardUi({ titulo: tb.donutTitulo, descricao: tb.donutDetalhe, conteudo: [divChart] });

    pagina.corpo.append(criarGrid(cardLista.cartao, cardGrafico.cartao));
    container.replaceChildren(pagina.raiz, dialogoMeta.elemento, confirmacao.elemento);

    function atualizarTodosTextosPagina(): void {
      const l = obterLocaleAtual();
      const tm = obterTextosMetas(l);
      definirTituloDocumentoApp(tm.tituloPagina, l);
      pagina.titulo.textContent = tm.tituloPagina;
      campoTitulo.definirRotulo(tm.tituloCampo);
      campoTitulo.definirPlaceholder(tm.tituloCampo);
      campoItem.definirRotulo(tm.itemCampo);
      campoItem.definirPlaceholder(tm.itemCampo);
      campoAtivo.definirRotulo(tm.ativoNomeCampo);
      campoAtivo.definirPlaceholder(tm.ativoNomeCampo);
      campoDataMeta.definirRotulo(tm.dataMetaCampo);
      campoDataMeta.definirPlaceholder(tm.dataMetaCampo);
      campoPrazo.definirRotulo(tm.prazoCampo);
      campoPrazo.definirPlaceholder(tm.prazoCampo);
      campoAtual.definirRotulo(tm.atualCampo);
      campoAtual.definirPlaceholder(tm.atualCampo);
      campoAlvo.definirRotulo(tm.alvoCampo);
      campoAlvo.definirPlaceholder(tm.alvoCampo);
      concluidaTexto.textContent = tm.concluidaLabel;
      botaoNovaMeta.textContent = tm.novoObjetivo;
      dialogoMeta.definirTitulo(tm.novoObjetivo);
      dialogoMeta.botaoConfirmar.textContent = tm.salvar;
      dialogoMeta.botaoCancelar.textContent = tm.cancelar;
      listaMetas.definirTextoVazio(tm.listaVazia);
      cardLista.titulo.textContent = tm.tituloLista;
      cardGrafico.titulo.textContent = tm.donutTitulo;
      if (cardGrafico.subtitulo) {
        cardGrafico.subtitulo.textContent = tm.donutDetalhe;
      }
      confirmacao.definirTextos({
        titulo: tm.apagarTituloDialogo,
        texto: tm.apagarTituloDialogo,
        cancelar: tm.cancelar,
        confirmar: tm.apagarBotao,
      });
    }

    function reporDonut(): void {
      if (donutMetasPaginaAtual) {
        donutMetasPaginaAtual.dispose();
        donutMetasPaginaAtual = null;
      }
      const meta = metas.find((m) => m.id === selecaoId);
      const cores = lerCoresGraficoDoDocumento(container);
      const tm = obterTextosMetas(obterLocaleAtual());

      const ch = echarts.init(divChart);
      donutMetasPaginaAtual = ch;

      if (!meta) {
        ch.setOption({
          ...opcoesTemaGraficoEcharts(),
          title: { text: tm.listaVazia, left: 'center', top: 'center', textStyle: { color: cores.textoSuave } },
        });
        return;
      }
      const alvo = Math.max(meta.progresso_alvo, 0.0001);
      const atual = meta.esta_concluida !== 0 ? alvo : Math.min(Math.max(meta.progresso_atual, 0), alvo);
      const pct = percentualMeta({ progresso_atual: atual, progresso_alvo: alvo });
      const dados =
        pct >= 100 || meta.esta_concluida !== 0
          ? [{ name: 'OK', value: 100, itemStyle: { color: cores.destaque } }]
          : [
              { name: 'Progresso', value: pct, itemStyle: { color: cores.destaque } },
              { name: '—', value: 100 - pct, itemStyle: { color: cores.linhaGrade } },
            ];
      ch.setOption({
        ...opcoesTemaGraficoEcharts(),
        title: { text: tm.donutTitulo + `: ${meta.titulo}`, textStyle: { color: cores.textoPrincipal } },
        series: [
          {
            type: 'pie',
            radius: ['50%', '74%'],
            label: {
              formatter: `{b}\n{d}%`,
              color: cores.textoPrincipal,
            },
            data: dados,
          },
        ],
      });
    }

    async function lista(): Promise<void> {
      await pintarLista();
    }

    async function pintarLista(): Promise<void> {
      metas = await repo.listarMetas();

      if (metas.length === 0) {
        selecaoId = null;
        listaMetas.renderizar(metas);
        reporDonut();
        return;
      }

      if (selecaoId === null || !metas.some((x) => x.id === selecaoId)) {
        selecaoId = metas[0]?.id ?? null;
      }

      listaMetas.renderizar(metas);
      reporDonut();
    }

    function reporFormularioMeta(): void {
      limparCampos(campoTitulo, campoItem, campoAtivo);
      campoAtual.definirValor(0);
      campoAlvo.definirValor(100);
      campoDataMeta.definirValor(formatarDataInputUtc(Date.now()));
      campoPrazo.definirValor(formatarDataInputUtc(Date.now() + 7 * MS_POR_DIA));
      concluidaInput.checked = false;
    }

    botaoNovaMeta.addEventListener(
      'click',
      () => {
        reporFormularioMeta();
        dialogoMeta.abrir();
      },
      { signal: sinal },
    );

    atualizarTodosTextosPagina();
    await lista();

    registarAoLocaleAtualizado(() => {
      atualizarTodosTextosPagina();
      reporDonut();
      void lista();
    }, sinal);
  },
  unmount() {
    if (donutMetasPaginaAtual) donutMetasPaginaAtual.dispose();
    donutMetasPaginaAtual = null;
    reporTituloDocumentoSoNomeApp();
  },
};

export default metasPagina;
