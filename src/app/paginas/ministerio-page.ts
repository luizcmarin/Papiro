import { garantirEchartsRegistrado } from '../../infra/charts/echarts-bundle.js';
import type { EChartsType } from '../../infra/charts/echarts-bundle.js';
import { lerCoresGraficoDoDocumento, opcoesTemaGraficoEcharts } from '../../infra/charts/cores-documento.js';
import * as repo from '../../modules/ministerio/dados/repositorio.js';
import type { EstudoBiblicoRow, RelatorioMinisterioRow } from '../../modules/ministerio/dados/types.js';
import {
  calcularAnoServico,
  classificarMetaHoras,
  metaPadraoHoras,
  montarRelatorioMinisterioCompartilhavel,
} from '../../modules/ministerio/dominio/relatorio-ministerio.js';
import { obterTextosMinisterio } from '../../modules/ministerio/ui/textos-ministerio.js';
import { formatarDataInputUtc, parseDataInputUtcMs } from '../../modules/shared/dados/datas.js';
import { obterLocaleAtual, registarAoLocaleAtualizado } from '../../modules/shared/ui/locale.js';
import { criarDialogoConfirmacao, criarDialogoFormulario } from '../ui/dialogos.js';
import { criarCampoData, criarCampoNumero, criarCampoTexto, criarFormGrid, limparCampos } from '../ui/form.js';
import { criarCardUi, criarGrid, criarPaginaUi } from '../ui/layout.js';
import { criarBotaoAcao, criarLinhaLista, criarListaCrud } from '../ui/lista.js';
import type { PaginaMontavel } from '../pagina-montavel.js';
import { definirTituloDocumentoApp, reporTituloDocumentoSoNomeApp } from '../ui/titulo-documento.js';

function relatorioMaisRecente(ls: RelatorioMinisterioRow[]): RelatorioMinisterioRow | null {
  let top: RelatorioMinisterioRow | null = null;
  for (const r of ls) {
    if (!top || r.ano > top.ano || (r.ano === top.ano && r.mes > top.mes)) top = r;
  }
  return top;
}

function ordenRelCrescente(ls: RelatorioMinisterioRow[]): RelatorioMinisterioRow[] {
  return [...ls].sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
}

let ministerioGraficosPagina: EChartsType[] = [];

const ministerioPagina: PaginaMontavel = {
  async mount(container, sinal) {
    const echarts = garantirEchartsRegistrado();
    function limparCharts(): void {
      ministerioGraficosPagina.forEach((x) => x.dispose());
      ministerioGraficosPagina = [];
    }
    limparCharts();

    let rels: RelatorioMinisterioRow[] = [];
    let ests: EstudoBiblicoRow[] = [];

    const lm = obterLocaleAtual();
    const tm0 = obterTextosMinisterio(lm);
    definirTituloDocumentoApp(tm0.tituloPagina, lm);

    const botaoNovoRelatorio = criarBotaoAcao(tm0.novoRelatorio, { variant: 'brand' });
    const botaoNovoEstudo = criarBotaoAcao(tm0.novoEstudo, { variant: 'brand' });
    const pagina = criarPaginaUi({ titulo: tm0.tituloPagina, acoes: [botaoNovoRelatorio, botaoNovoEstudo] });

    const bxBarra = document.createElement('div');
    bxBarra.className = 'shell__grafico';
    const bxGauge = document.createElement('div');
    bxGauge.className = 'shell__grafico shell__grafico--compacto';

    const agora = new Date();
    const campoMes = criarCampoNumero({ rotulo: tm0.mesCampo, valorInicial: agora.getMonth() + 1, min: 1 });
    campoMes.input.setAttribute('max', '12');
    const campoAno = criarCampoNumero({ rotulo: tm0.anoCampo, valorInicial: agora.getFullYear() });
    const campoAnoServico = criarCampoNumero({ rotulo: tm0.anoServicoCampo, valorInicial: 1 });
    const campoHoras = criarCampoNumero({ rotulo: tm0.horasCampo, valorInicial: 8, step: 'any' });
    const campoEstudos = criarCampoNumero({ rotulo: tm0.estudosCampo, valorInicial: 0 });
    const campoParticipacao = criarCampoNumero({ rotulo: tm0.participacaoCampo, valorInicial: 1 });
    const campoTipo = criarCampoTexto({ rotulo: tm0.tipoCampo });
    const campoMetaHoras = criarCampoNumero({ rotulo: tm0.metaHorasCampo, valorInicial: 40, step: 'any' });
    const campoNotasPub = criarCampoTexto({ rotulo: tm0.notasPubCampo, linhas: 2 });
    const campoDirNome = criarCampoTexto({ rotulo: tm0.dirigenteNome });
    const campoDirTel = criarCampoTexto({ rotulo: tm0.dirigenteTel });

    const campoEstNome = criarCampoTexto({ rotulo: tm0.nomeEstudo });
    const campoEstContato = criarCampoTexto({ rotulo: tm0.contatoCampo });
    const campoEstEndereco = criarCampoTexto({ rotulo: tm0.enderecoCampo });
    const campoEstZoom = criarCampoTexto({ rotulo: tm0.zoomCampo });
    const campoEstPubAtual = criarCampoTexto({ rotulo: tm0.publicacaoCampo });
    const campoEstLicao = criarCampoNumero({ rotulo: tm0.licaoCampo, valorInicial: 1 });
    const campoEstDia = criarCampoTexto({ rotulo: tm0.diaCampo });
    const campoEstHorario = criarCampoNumero({ rotulo: tm0.horarioMinCampo, valorInicial: 1140 });
    const campoEstProximo = criarCampoData({ rotulo: tm0.proximoEstudoCampo, valorInicial: formatarDataInputUtc(Date.now()) });
    const campoEstNotas = criarCampoTexto({ rotulo: tm0.notasEstudoCampo, linhas: 2 });

    const confirmacao = criarDialogoConfirmacao({
      titulo: tm0.apagarRelatorioTitulo,
      texto: tm0.apagarRelatorioTitulo,
      cancelar: tm0.cancelar,
      confirmar: tm0.confirmarExclusao,
      signal: sinal,
    });

    const listaRelatorios = criarListaCrud<RelatorioMinisterioRow>({
      vazio: tm0.semRelatorios,
      renderItem: (relatorio) => {
        const tm = obterTextosMinisterio(obterLocaleAtual());
        const apagar = criarBotaoAcao(tm.confirmarExclusao, { variant: 'danger' });
        const compartilhar = criarBotaoAcao(tm.compartilharRelatorio, { variant: 'neutral' });
        compartilhar.addEventListener(
          'click',
          async () => {
            await navigator.clipboard?.writeText(montarRelatorioMinisterioCompartilhavel(relatorio));
            compartilhar.textContent = tm.relatorioCopiado;
          },
          { signal: sinal },
        );
        apagar.addEventListener(
          'click',
          () => {
            confirmacao.abrir({
              titulo: tm.apagarRelatorioTitulo,
              texto: tm.apagarRelatorioTitulo,
              aoConfirmar: async () => {
                await repo.apagarRelatorio(relatorio.id);
                await dados();
              },
            });
          },
          { signal: sinal },
        );

        const status = classificarMetaHoras(relatorio.horas, relatorio.meta_horas);
        return criarLinhaLista({
          titulo: `${String(relatorio.mes).padStart(2, '0')}/${relatorio.ano}`,
          meta: `${relatorio.horas} h · ${tm.statusMeta}: ${status}`,
          acoes: [compartilhar, apagar],
        });
      },
    });

    const listaEstudos = criarListaCrud<EstudoBiblicoRow>({
      vazio: tm0.listaEstudosVazia,
      renderItem: (estudo) => {
        const tm = obterTextosMinisterio(obterLocaleAtual());
        const apagar = criarBotaoAcao(tm.confirmarExclusao, { variant: 'danger' });
        apagar.addEventListener(
          'click',
          () => {
            confirmacao.abrir({
              titulo: tm.apagarEstudoTitulo,
              texto: tm.apagarEstudoTitulo,
              aoConfirmar: async () => {
                await repo.apagarEstudoBiblico(estudo.id);
                await dados();
              },
            });
          },
          { signal: sinal },
        );

        return criarLinhaLista({
          titulo: estudo.nome,
          meta: estudo.publicacao_atual.replace(/\s+/u, ' ').slice(0, 42),
          acoes: [apagar],
        });
      },
    });

    const dialogoRelatorio = criarDialogoFormulario({
      titulo: tm0.novoRelatorio,
      confirmarTexto: tm0.salvarRelatorio,
      cancelarTexto: tm0.cancelar,
      conteudo: [
        criarFormGrid(
          campoMes.elemento,
          campoAno.elemento,
          campoAnoServico.elemento,
          campoHoras.elemento,
          campoEstudos.elemento,
          campoParticipacao.elemento,
          campoTipo.elemento,
          campoMetaHoras.elemento,
        ),
        criarFormGrid(campoNotasPub.elemento, campoDirNome.elemento, campoDirTel.elemento),
      ],
      signal: sinal,
      aoConfirmar: async () => {
        const mes = campoMes.valor();
        const ano = campoAno.valor();
        if (!Number.isFinite(mes) || mes < 1 || mes > 12 || !Number.isFinite(ano)) return false;

        await repo.inserirRelatorio({
          mes,
          ano,
          ano_servico: campoAnoServico.valor(),
          horas: campoHoras.valor(),
          estudos: campoEstudos.valor(),
          participacao: campoParticipacao.valor(),
          tipo_publicador: campoTipo.valor(),
          meta_horas: campoMetaHoras.valor(),
          notas_publicacoes: campoNotasPub.valor(),
          telefone_dirigente: campoDirTel.valor(),
          nome_dirigente: campoDirNome.valor(),
        });
        reporFormularioRelatorio();
        await dados();
      },
    });

    const dialogoEstudo = criarDialogoFormulario({
      titulo: tm0.novoEstudo,
      confirmarTexto: tm0.salvarEstudo,
      cancelarTexto: tm0.cancelar,
      conteudo: [
        criarFormGrid(
          campoEstNome.elemento,
          campoEstContato.elemento,
          campoEstEndereco.elemento,
          campoEstZoom.elemento,
          campoEstPubAtual.elemento,
          campoEstLicao.elemento,
          campoEstDia.elemento,
          campoEstHorario.elemento,
          campoEstProximo.elemento,
        ),
        campoEstNotas.elemento,
      ],
      signal: sinal,
      aoConfirmar: async () => {
        const ms = parseDataInputUtcMs(campoEstProximo.valor());
        if (!campoEstNome.valor()) return false;

        await repo.inserirEstudoBiblico({
          nome: campoEstNome.valor(),
          contato: campoEstContato.valor(),
          endereco: campoEstEndereco.valor(),
          zoom_link: campoEstZoom.valor(),
          publicacao_atual: campoEstPubAtual.valor(),
          licao_atual: campoEstLicao.valor(),
          dia_semana: campoEstDia.valor(),
          horario_minutos: campoEstHorario.valor(),
          proximo_estudo_em: ms ?? Date.now(),
          notas: campoEstNotas.valor(),
        });
        reporFormularioEstudo();
        await dados();
      },
    });

    const cardBarra = criarCardUi({ titulo: tm0.graficoBarrasTitulo, conteudo: [bxBarra] });
    const cardGauge = criarCardUi({
      titulo: tm0.graficoGaugeTitulo,
      descricao: tm0.gaugeDetalhe,
      conteudo: [bxGauge],
    });
    const cardRelatorios = criarCardUi({ titulo: tm0.relatoriosTitulo, conteudo: [listaRelatorios.elemento] });
    const cardEstudos = criarCardUi({ titulo: tm0.estudosTitulo, conteudo: [listaEstudos.elemento] });

    pagina.corpo.append(
      criarGrid(cardBarra.cartao, cardGauge.cartao),
      criarGrid(cardRelatorios.cartao, cardEstudos.cartao),
    );
    container.replaceChildren(pagina.raiz, dialogoRelatorio.elemento, dialogoEstudo.elemento, confirmacao.elemento);

    function pintarCharts(tm: ReturnType<typeof obterTextosMinisterio>): void {
      limparCharts();
      const cores = lerCoresGraficoDoDocumento(container);
      const ord = ordenRelCrescente(rels);

      const cBarra = echarts.init(bxBarra);
      ministerioGraficosPagina.push(cBarra);
      if (ord.length === 0) {
        cBarra.setOption({
          ...opcoesTemaGraficoEcharts(),
          title: { text: tm.semRelatorios, left: 'center', top: 'middle', textStyle: { color: cores.textoSuave } },
        });
      } else {
        cBarra.setOption({
          ...opcoesTemaGraficoEcharts(),
          textStyle: { color: cores.textoPrincipal },
          tooltip: {},
          grid: { left: 56, bottom: 32, containLabel: true },
          xAxis: { type: 'category', data: ord.map((r) => `${String(r.mes).padStart(2, '0')}/${String(r.ano)}`) },
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: ord.map((r) => r.horas), itemStyle: { color: cores.destaque } }],
        });
      }

      const cGg = echarts.init(bxGauge);
      ministerioGraficosPagina.push(cGg);
      const topo = relatorioMaisRecente(rels);
      const objetivoMeta = topo ? Math.max(Number(topo.meta_horas), 0.001) : 50;
      const pct = topo ? Math.min(100, (100 * Number(topo.horas)) / objetivoMeta) : 0;

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
            progress: { width: 8, show: true, color: cores.destaque },
            axisLine: { lineStyle: { width: 8, color: [[1, cores.linhaGrade]] } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { distance: -16, fontSize: 10, color: cores.textoSuave },
            pointer: { show: false },
            anchor: { show: false },
            title: { fontSize: 12, color: cores.textoSuave },
            detail: {
              valueAnimation: true,
              fontSize: 18,
              color: cores.textoPrincipal,
              formatter: `{value}%`,
            },
            data: [{ value: Math.round(pct), name: tm.graficoGaugeTitulo }],
          },
        ],
      });
    }

    function aplicarRotulos(tm: ReturnType<typeof obterTextosMinisterio>): void {
      definirTituloDocumentoApp(tm.tituloPagina);
      pagina.titulo.textContent = tm.tituloPagina;
      botaoNovoRelatorio.textContent = tm.novoRelatorio;
      botaoNovoEstudo.textContent = tm.novoEstudo;
      cardBarra.titulo.textContent = tm.graficoBarrasTitulo;
      cardGauge.titulo.textContent = tm.graficoGaugeTitulo;
      if (cardGauge.subtitulo) {
        cardGauge.subtitulo.textContent = tm.gaugeDetalhe;
      }
      cardRelatorios.titulo.textContent = tm.relatoriosTitulo;
      cardEstudos.titulo.textContent = tm.estudosTitulo;

      campoMes.definirRotulo(tm.mesCampo);
      campoAno.definirRotulo(tm.anoCampo);
      campoAnoServico.definirRotulo(tm.anoServicoCampo);
      campoHoras.definirRotulo(tm.horasCampo);
      campoEstudos.definirRotulo(tm.estudosCampo);
      campoParticipacao.definirRotulo(tm.participacaoCampo);
      campoTipo.definirRotulo(tm.tipoCampo);
      campoTipo.definirPlaceholder(tm.tipoCampo);
      campoMetaHoras.definirRotulo(tm.metaHorasCampo);
      campoNotasPub.definirRotulo(tm.notasPubCampo);
      campoNotasPub.definirPlaceholder(tm.notasPubCampo);
      campoDirNome.definirRotulo(tm.dirigenteNome);
      campoDirNome.definirPlaceholder(tm.dirigenteNome);
      campoDirTel.definirRotulo(tm.dirigenteTel);
      campoDirTel.definirPlaceholder(tm.dirigenteTel);
      campoEstNome.definirRotulo(tm.nomeEstudo);
      campoEstNome.definirPlaceholder(tm.nomeEstudo);
      campoEstContato.definirRotulo(tm.contatoCampo);
      campoEstContato.definirPlaceholder(tm.contatoCampo);
      campoEstEndereco.definirRotulo(tm.enderecoCampo);
      campoEstEndereco.definirPlaceholder(tm.enderecoCampo);
      campoEstZoom.definirRotulo(tm.zoomCampo);
      campoEstZoom.definirPlaceholder(tm.zoomCampo);
      campoEstPubAtual.definirRotulo(tm.publicacaoCampo);
      campoEstPubAtual.definirPlaceholder(tm.publicacaoCampo);
      campoEstLicao.definirRotulo(tm.licaoCampo);
      campoEstDia.definirRotulo(tm.diaCampo);
      campoEstDia.definirPlaceholder(tm.diaCampo);
      campoEstHorario.definirRotulo(tm.horarioMinCampo);
      campoEstProximo.definirRotulo(tm.proximoEstudoCampo);
      campoEstNotas.definirRotulo(tm.notasEstudoCampo);
      campoEstNotas.definirPlaceholder(tm.notasEstudoCampo);
      dialogoRelatorio.definirTitulo(tm.novoRelatorio);
      dialogoRelatorio.botaoConfirmar.textContent = tm.salvarRelatorio;
      dialogoRelatorio.botaoCancelar.textContent = tm.cancelar;
      dialogoEstudo.definirTitulo(tm.novoEstudo);
      dialogoEstudo.botaoConfirmar.textContent = tm.salvarEstudo;
      dialogoEstudo.botaoCancelar.textContent = tm.cancelar;
      listaRelatorios.definirTextoVazio(tm.semRelatorios);
      listaEstudos.definirTextoVazio(tm.listaEstudosVazia);
      confirmacao.definirTextos({
        titulo: tm.apagarRelatorioTitulo,
        texto: tm.apagarRelatorioTitulo,
        cancelar: tm.cancelar,
        confirmar: tm.confirmarExclusao,
      });
      redesRel();
      redesEst();
      pintarCharts(tm);
    }

    function redesRel(): void {
      listaRelatorios.renderizar(ordenRelCrescente(rels).reverse());
    }

    function redesEst(): void {
      listaEstudos.renderizar(ests);
    }

    async function dados(): Promise<void> {
      rels = await repo.listarRelatorios();
      ests = await repo.listarEstudosBiblicos();
      aplicarRotulos(obterTextosMinisterio(obterLocaleAtual()));
    }

    function reporFormularioRelatorio(): void {
      const data = new Date();
      campoMes.definirValor(data.getMonth() + 1);
      campoAno.definirValor(data.getFullYear());
      campoAnoServico.definirValor(calcularAnoServico(data));
      campoHoras.definirValor(8);
      campoEstudos.definirValor(0);
      campoParticipacao.definirValor(1);
      campoMetaHoras.definirValor(40);
      limparCampos(campoTipo, campoNotasPub, campoDirNome, campoDirTel);
    }

    campoTipo.input.addEventListener(
      'input',
      () => {
        const meta = metaPadraoHoras(campoTipo.valor());
        if (meta > 0) campoMetaHoras.definirValor(meta);
      },
      { signal: sinal },
    );

    function reporFormularioEstudo(): void {
      limparCampos(
        campoEstNome,
        campoEstContato,
        campoEstEndereco,
        campoEstZoom,
        campoEstPubAtual,
        campoEstDia,
        campoEstNotas,
      );
      campoEstLicao.definirValor(1);
      campoEstHorario.definirValor(1140);
      campoEstProximo.definirValor(formatarDataInputUtc(Date.now()));
    }

    botaoNovoRelatorio.addEventListener(
      'click',
      () => {
        reporFormularioRelatorio();
        dialogoRelatorio.abrir();
      },
      { signal: sinal },
    );

    botaoNovoEstudo.addEventListener(
      'click',
      () => {
        reporFormularioEstudo();
        dialogoEstudo.abrir();
      },
      { signal: sinal },
    );

    registarAoLocaleAtualizado(() => void dados(), sinal);

    await dados();
  },

  unmount() {
    ministerioGraficosPagina.forEach((x) => x.dispose());
    ministerioGraficosPagina = [];
    reporTituloDocumentoSoNomeApp();
  },
};

export default ministerioPagina;
