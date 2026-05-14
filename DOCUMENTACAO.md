# Documentação técnica — Papiro

**SPA TypeScript** offline-first (Bun, Vite, Web Awesome, SQLocal, TipTap). **Contrato de dados:** [`basedados.json`](./basedados.json) (`database.version` **37**). Projeto novo — sem retrocompatibilidade com stacks anteriores.

## Onde está o quê

| Documento | Conteúdo |
| :-- | :-- |
| **Este ficheiro** | Visão, stack, arquitetura, estado do produto, comandos |
| [`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md) | SQLite, `id_remoto`, lazy selection, sync, queries |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Web Awesome, tema Claro/Breu, layout, ECharts |
| [`GUIA_USUARIO.md`](./GUIA_USUARIO.md) | Fluxos por módulo (visão geral no [`README`](./README.md#sobre-o-produto)) |
| [`CHECKLIST_REVISAO_MANUAL.md`](./CHECKLIST_REVISAO_MANUAL.md) | Sequência sugerida para revisão manual / QA |
| [`AGENTS.md`](./AGENTS.md) | Orientação para assistentes no repositório |
| [`basedados.json`](./basedados.json) | Esquema relacional gerado para migrações |

---

## 1. Visão do produto

PWA para vida espiritual, ministério, finanças, prontidão e módulos satélite — **instalável**, **sem loja obrigatória**, dados locais em **SQLite** (OPFS + worker). Mapeamento módulos ↔ tabelas: ver **BANCO_DE_DADOS.md**.

---

## 2. Stack

| Área | Escolha |
| :-- | :-- |
| Linguagem / bundler | **TypeScript** + **Vite** |
| Rotas | **Router SPA** (`src/app/router.ts`, `src/app/navegacao/router-spa.ts`) — History API, `base` do Vite alinhado a deploy estático |
| UI | **[Web Awesome](https://webawesome.com)** (Web Components), tema **Claro/Breu** nativo — sem pacote paralelo de tokens |
| Persistência | **SQLocal** — SQLite em **worker** + **OPFS**; SQL parametrizado, **sem ORM** |
| Editor | **TipTap** + **`infra/sanitize.ts`** (DOMPurify espelhado ao HTML do TipTap) |
| Imagens em notas | Apenas **`data:image/webp`** ou **`data:image/svg+xml`** em Base64 |
| Gráficos | **Apache ECharts** |
| PWA | **`vite-plugin-pwa`** |
| Testes | **Vitest**; e2e quando existir pipeline |
| Tooling | **Bun** (`packageManager` no `package.json`) |

---

## 3. Diagrama de dependências (mental)

```
                    ┌─────────────────────────┐
                    │   Vite SPA (entrada)    │  ← index.html, main.ts, router
                    └────────────┬────────────┘
                                 │ monta shell + outlet
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ infra/db        │  │ infra/sync       │  │ Web Awesome      │
  │ SQLocal OPFS    │  │ fetch JSON remoto│  │ (UI + tema)      │
  └────────┬────────┘  └────────┬─────────┘  └──────────────────┘
           │                    │
           └──────────┬─────────┘
                      ▼
           ┌─────────────────────┐
           │ modules/<nome>/     │  ← fatias verticais
           │  aplicacao/         │
           │  dados/             │  ← repositórios + types
           │  ui/                │
           │  dominio/ (opc.)    │  ← regras puras sem I/O
           └─────────────────────┘
```

Regras de negócio **sem I/O** em `dominio/` quando existir; orquestração e acesso a dados em `aplicacao/` e `dados/`. Tipos e SQL espelham **`basedados.json`**.

---

## 4. Estrutura do repositório

```text
src/
  main.ts
  app/
    router.ts              # Rotas + import dinâmico por página
    navegacao/router-spa.ts
    shell.ts               # Drawer, barra, #outlet-papiro
    outlet.ts              # mount/unmount sequencial
    menu-rotas.ts            # Menu + caminhos (fonte única com o router)
    paginas/*-page.ts
  infra/
    db/                    # cliente SQLocal, migrations, contrato gerado
    sync/
    sanitize.ts
    charts/
  modules/<nome>/
    aplicacao/
    dados/repositorio.ts, types.ts
    ui/
public/
```

---

## 5. Padrões obrigatórios

### Página montável

Cada rota implementa `PaginaMontavel`: `mount(container, sinal: AbortSignal)` e `unmount()`. No `unmount`: libertar editores TipTap, `dispose()` de ECharts, remover listeners (via `AbortSignal`), anular referências a strings HTML grandes.

### Dados

- Um portão ao SQLite: **`infra/db/`**; repositórios em `modules/*/dados/` não instanciam SQLocal à parte.
- **Listagens:** proibido `SELECT *` onde haja colunas pesadas; ex.: `conteudo` de `tbl_anotacao` só em query por **`id`** — ver **BANCO_DE_DADOS.md**.
- **`id_remoto`** é a identidade remota; **não** existe coluna `e_nuvem` no contrato.

### Sanitização e XSS

Qualquer HTML de utilizador: **`infra/sanitize.ts`** alinhado ao TipTap; renderização com `innerHTML` só após sanitizar.

### Nomenclatura pública (TypeScript)

Nomes em **pt-BR** para UI e APIs públicas de módulos, salvo convenções de ecossistema (`mount`, `id_remoto`, etc.).

---

## 6. Shell e navegação

- **`shell.ts`**: layout principal, **`#outlet-papiro`**.
- **`menu-rotas.ts`**: itens do menu + caminhos + lazy `import()` das páginas.
- **`router.ts`**: registo de rotas; **`router-spa.ts`**: `pushState`/`popstate`, cliques em `<a>` internos sob o `base` do Vite.

---

## 7. Migrações

`bun run db:gerar-migracoes` lê **`basedados.json`** e regenera `infra/db/migrations/*.sql` e `src/infra/db/contrato-bd.gerado.ts`. O runtime aplica migrações no cliente (ver **BANCO_DE_DADOS.md**).

---

## 8. Estado de implementação (macro)

O núcleo **fases 0–3** (Vite, WA, SQLocal v37, smoke no arranque, shell, router, menu) está fechado. **Waves 1–4** cobrem anotações, receitas, configurações, financeiro, metas, ministério, estudo, preparação, quiz, perfil, poesia, QR, cofre, guias. **Dashboard** (KPIs + gráficos) e **PWA** (manifest + service worker) estão presentes no build.

**Próximo foco sugerido:** hardening (Lighthouse em browser real, ícones maskable, backup/PIN/cofre conforme prioridade).

---

## 9. Definition of Done (resumo)

1. `bun run build` sem erros; `bun run lint` / `bun run test` quando tocar em lógica ou contratos.
2. CRUD ou fluxo verificável no navegador; dados sobrevivem a refresh (OPFS).
3. Tema apenas via **Web Awesome**; sem tokens paralelos.
4. Textos de UI centralizados em `modules/*/ui/textos-*.ts` (pt-BR + EN onde existir).
5. Acessibilidade básica (labels, `role` onde aplicável).

---

## 10. Comandos e CI

```bash
bun install
bun run dev
bun run build
bun run preview
bun run test
bun run lint
bun run db:gerar-migracoes   # após alterar basedados.json
```

CI de referência: `.github/workflows/ci.yml` (Bun pinado no projeto).

`base` em `vite.config.ts` deve coincidir com o subcaminho do GitHub Pages, se aplicável.

---

## 11. Decisões (porquê isto)

| Decisão | Nota |
| :-- | :-- |
| Web Awesome | UI + tema num só sistema; documentação em webawesome.com |
| SQLocal + OPFS | Offline-first relacional forte vs. SQL só em RAM |
| Sem ORM | Esquema único em `basedados.json` + SQL explícito |
| SPA estática | Um `dist/` servido por HTTPS; PWA simples |

---

## Documentação relacionada

[`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md) · [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) · [`GUIA_USUARIO.md`](./GUIA_USUARIO.md) · [`CHECKLIST_REVISAO_MANUAL.md`](./CHECKLIST_REVISAO_MANUAL.md) · [`AGENTS.md`](./AGENTS.md) · [`basedados.json`](./basedados.json) · [`README.md`](./README.md)
