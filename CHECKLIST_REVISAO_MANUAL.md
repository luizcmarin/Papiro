# Checklist — revisão manual (Papiro)

Use em sequência. Marca cada item ao concluir. Se algo falhar, regista rota, passos e browser.

**Pré-requisito:** `bun run dev` (ou `bun run build` + `bun run preview` para testar o bundle de produção).

---

## A. Arranque e shell

- [x] **A1** — A app abre sem erro de consola crítico; smoke da base (SQLocal) não bloqueia o ecrã indefinidamente.
- [x] **A2** — Redirecionamento ou conteúdo correcto em `/` e `/dashboard`.
- [-] **A3** — Menu lateral lista todos os módulos; ícones carregam (SVG). REMOVER QR CODE DO MENU E TELA. NÃO SERÁ USADO DESSA FORMA.
- [X] **A4** — Abrir e fechar o **drawer** (mobile / viewport estreito); em desktop o layout permanece utilizável.
- [X] **A5** — Navegar por **várias entradas do menu** em sequência: cada página substitui o conteúdo do outlet (sem “fantasmas” da página anterior).
- [X] **A6** — Clicar num `<a href="…">` interno (mesma origem) não recarrega a página inteira; URL e conteúdo actualizam.
- [X] **A7** — **Voltar / avançar** do browser: histórico sincroniza com a vista actual.
- [X] **A8** — **Refresh (F5)** no meio de um módulo: a app recupera na mesma rota (ou comportamento documentado aceitável).

---

## B. Configurações (antes de stressar dados)

- [x] **B1** — Abrir **Configurações** (`/configuracoes`).
- [x] **B2** — Alternar **tema** Claro/Breu (Web Awesome); transição sem quebrar layout.
- [x] **B3** — Alterar **idioma** (se existir EN/pt): textos da shell e de pelo menos uma página mudam coerentemente.
- [x] **B4** — Guardar preferências, mudar de página e voltar: valores persistem após refresh.

---

## C. Dashboard

- [ ] **C1** — KPIs ou cartões principais aparecem sem erro.
- [ ] **C2** — Gráficos **ECharts** renderizam; redimensionar a janela não deixa gráfico “partido” (ou corrige ao segundo resize).
- [ ] **C3** — Links/atalhos do dashboard levam à rota correcta.

---

## D. Anotações

- [ ] **D1** — Lista (`/anotacoes`): carrega sem `SELECT *` pesado visível como bloqueio; filtros/pastas/modelos (os que existirem) respondem.
- [ ] **D2** — **Nova** (`/anotacoes/nova`): criar nota, guardar, voltar à lista e confirmar que aparece.
- [ ] **D3** — **Editar** (`/anotacoes/<id>`): abrir nota existente; alterar título/corpo; guardar; reabrir e confirmar persistência.
- [ ] **D4** — Editor **TipTap**: negrito/lista; se houver imagem, só formatos permitidos (webp/svg data URL) ou rejeição clara.
- [ ] **D5** — **Modo apresentação / leitura** (se existir): HTML sanitizado, sem XSS de teste simples (`<img onerror=…>` não deve executar script).
- [ ] **D6** — Apagar ou arquivar (se existir): lista actualiza.
- [ ] **D7** — Rota inválida: `/anotacoes/abc` ou `/anotacoes/0` → página **não encontrada** (ou tratamento aceitável), sem crash.

---

## E. Receitas

- [ ] **E1** — Lista (`/receitas`): lazy / listagem utilizável.
- [ ] **E2** — **Nova** (`/receitas/nova`): criar, guardar, listar.
- [ ] **E3** — **Editar** (`/receitas/<id>`): alterar e persistir.
- [ ] **E4** — Diálogos WA (criar/editar/apagar): foco e fecho com ESC ou botão sem ficar preso.
- [ ] **E5** — ID inválido na URL: mesmo critério que anotações (404 / rota não encontrada).

---

## F. Financeiro

- [ ] **F1** — Lista ou tabs principais carregam.
- [ ] **F2** — Criar/editar/apagar movimento ou categoria (o que a UI expuser).
- [ ] **F3** — Gráficos ou totais coerentes com dados introduzidos.
- [ ] **F4** — Refresh: dados mantêm-se.

---

## G. Metas

- [ ] **G1** — Listar metas (abertas/concluídas conforme UI).
- [ ] **G2** — Criar meta e actualizar progresso (se aplicável).
- [ ] **G3** — Persistência após refresh.

---

## H. Ministério

- [ ] **H1** — Relatório ou formulário mensal acessível.
- [ ] **H2** — Preencher e guardar; reabrir mês e confirmar valores.
- [ ] **H3** — Gráfico ou resumo (se houver) sem erro de consola.

---

## I. Estudo

- [ ] **I1** — Configurar durações (foco/pausas) se a UI permitir.
- [ ] **I2** — Iniciar **timer**: contagem visível; **pausa** e **retomar** (ou equivalente).
- [ ] **I3** — Completar ciclo (ou cancelar): registo em histórico/sessões se existir.
- [ ] **I4** — Navegar para outra página durante timer: comportamento aceitável (para timer ou aviso).

---

## J. Preparação

- [ ] **J1** — Página principal (`/preparacao`): indicadores ou checklist utilizável.
- [ ] **J2** — **Guias** (`/preparacao/guias`): conteúdo ou lista conforme implementação.
- [ ] **J3** — **Cofre** (`/preparacao/cofre`): fluxo sem crash; não testar segredos reais — só fluxo UI.

---

## K. Quiz

- [ ] **K1** — Modo quiz e/ou memória (conforme tabs): iniciar, responder, reiniciar.
- [ ] **K2** — Sem erros ao trocar de modo ou sair da página (`unmount`).

---

## L. Poesia

- [ ] **L1** — Listar/visualizar poesias.
- [ ] **L2** — Acções secundárias (favorito, cópia, etc., se existirem).

---

## M. Perfil e ICE

- [ ] **M1** — Dados de perfil editáveis e persistentes.
- [ ] **M2** — Ficha **ICE** ou campos médicos: validação básica; chip ou alerta **DPA** se existir na UI.

---

## N. QR Code

- [ ] **N1** — Gerar QR a partir dos dados do perfil (vcard ou URL).
- [ ] **N2** — Download ou cópia (se existir) sem erro.

---

## O. Encerramento e robustez

- [ ] **O1** — Navegar para URL inexistente (`/rota-que-nao-existe`): **rota não encontrada**, link para dashboard ou menu.
- [ ] **O2** — Sessão longa: abrir 10+ páginas em sequência; memória não dispara de forma óbvia (DevTools opcional).
- [ ] **O3** — **PWA (opcional):** `bun run build` + `preview` ou deploy; “Instalar” / offline após primeira carga — smoke rápido.

---

## Ordem sugerida (uma linha)

`Shell → Config → Dashboard → Anotações → Receitas → Financeiro → Metas → Ministério → Estudo → Preparação (+ guias + cofre) → Quiz → Poesia → Perfil/ICE → QR → 404 e refresh`

---

## Referência de rotas

| Área | Caminhos principais |
| :-- | :-- |
| Dashboard | `/`, `/dashboard` |
| Anotações | `/anotacoes`, `/anotacoes/nova`, `/anotacoes/:id` |
| Receitas | `/receitas`, `/receitas/nova`, `/receitas/:id` |
| Outros | `/estudo`, `/ministerio`, `/financeiro`, `/metas`, `/preparacao`, `/preparacao/guias`, `/preparacao/cofre`, `/quiz`, `/poesia`, `/perfil`, `/qr`, `/configuracoes` |

Fonte: `src/app/menu-rotas.ts`, `src/app/router.ts`.
