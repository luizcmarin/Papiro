# Papiro

PWA **offline-first** (em construção) — SPA em **TypeScript** com **Bun**, **Vite**, **Web Awesome**, **SQLocal**, **TipTap**. Visão técnica e estado: [DOCUMENTACAO.md](./DOCUMENTACAO.md).

## Sobre o produto

O Papiro é uma PWA offline-first para organizar vida espiritual, estudo, ministério, finanças, prontidão, receitas e acervo pessoal em um único aplicativo local no dispositivo. Funcionalidades descritas como futuras no [guia de fluxos](./GUIA_USUARIO.md) dependem de implementação posterior; o guia regista a direção de produto.

### Princípios

- Seus dados privados ficam no dispositivo.
- A base local é SQLite no navegador, com funcionamento offline após a preparação inicial da PWA.
- Conteúdos públicos (perguntas, poesias, guias, receitas, kits) podem ser obtidos de uma fonte externa numa etapa futura de sincronização.
- Dados sensíveis devem usar criptografia real quando armazenados como segredo; um PIN visual não deve ser tratado como proteção de dados em repouso.
- O app evita dependência de loja, backend obrigatório ou conexão permanente.

### Primeiro acesso

O primeiro uso deve apresentar uma introdução curta:

1. Boas-vindas e visão geral do Papiro.
2. Explicação sobre armazenamento local, privacidade e uso offline.
3. Configuração inicial de preferências essenciais (idioma, segurança quando os fluxos de PIN/cofre estiverem prontos).

Quando existir conteúdo de boas-vindas na base local, o Papiro pode criar uma anotação fixada de introdução para ajudar a começar.

## Documentação

| Documento | Conteúdo |
| :-- | :-- |
| [CHECKLIST_REVISAO_MANUAL.md](./CHECKLIST_REVISAO_MANUAL.md) | Revisão manual ordenada (QA) |
| [DOCUMENTACAO.md](./DOCUMENTACAO.md) | Stack, arquitetura `src/`, router SPA, estado macro, comandos |
| [BANCO_DE_DADOS.md](./BANCO_DE_DADOS.md) | SQLite, SQLocal, sync, lazy selection |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Web Awesome, tema Claro/Breu |
| [GUIA_USUARIO.md](./GUIA_USUARIO.md) | Fluxos detalhados por módulo |
| [AGENTS.md](./AGENTS.md) | Orientação para assistentes no repositório |
| [basedados.json](./basedados.json) | Esquema relacional soberano (**v37**) |

## Requisitos

- **[Bun](https://bun.sh)** **1.3+** (pin em [`.bun-version`](./.bun-version) e [`package.json`](./package.json) campo `packageManager`)
- O **postinstall** corre com `bun` e copia os ficheiros estáticos do **Web Awesome** para `public/webawesome/` (pasta ignorada no Git; em clone limpo: `bun install`)

Compatibilidade: quem ainda use **npm** pode instalar dependências e correr `npm run …`, mas o fluxo **canónico** do repo é **Bun** (scripts e CI alinhados a isso).

## Comandos

```bash
bun install
bun run dev
```

Qualidade:

```bash
bun run lint
bun run format
```

Testes unitários (**Vitest**, jsdom — domínio puro + `sanitize`, sem worker SQLocal):

```bash
bun run test
```

Build de produção:

```bash
bun run build
bun run preview
```

## Estado atual

Resumo em [DOCUMENTACAO.md](./DOCUMENTACAO.md) (secção **8. Estado de implementação**). Em traços: núcleo (Vite, WA, SQLocal v37, shell, router SPA), waves de módulos (anotações, receitas, config, financeiro, metas, ministério, estudo, preparação, quiz, perfil, poesia, QR, dashboard, PWA). Próximo foco sugerido: hardening (Lighthouse, ícones maskable, backup/PIN conforme prioridade).
