# Gates de correção crítica (Papiro)

Este documento alinha **o que a CI automatiza** com **o que exige revisão humana ou agente** (Cursor, etc.).

## O que o GitHub Actions faz (portões automatizáveis)

O workflow `.github/workflows/ci.yml` executa, em cada push/PR:

| Gate | Objetivo |
| :--- | :--- |
| **ESLint** | Inconsistências e classes de problemas que o linter consegue sinalizar |
| **`tsc` + build Vite** | Erros de tipo e falha de empacotamento (quebra de release) |
| **Vitest** | Regressões cobertas por testes |
| **`bun audit`** | Vulnerabilidades conhecidas em dependências |

Se tudo passa, a CI publica no resumo da execução: *nenhum sinal crítico nos gates automáticos* — **isto não significa** ausência de bugs lógicos graves não cobertos por testes.

## Rubrica de revisão profunda (não automatizável no runner)

Foco em bugs de **alta severidade**: perda de dados, crashes, falhas de segurança, quebra forte na experiência do utilizador.

### Estratégia de investigação

- Priorizar alterações comportamentais com **grande raio de explosão**.
- Procurar: corrupção de dados, condições de corrida que perdem escritos, desreferenciações nulas em caminhos críticos, bypass de permissões, loops infinitos, fugas de recursos, truncagem silenciosa de dados.
- **Rastrear o caminho completo** no código — não basta pattern-matching no diff: entender a cadeia de chamadas e efeitos a jusante.
- **Ignorar**: estilo, edge cases menores, preocupações teóricas sem gatilho concreto, degradações leves de UX.

### Barra de confiança

- Só se considera bug crítico se for possível descrever um **cenário concreto** que o dispare.
- Se não houver gatilho plausível, **não** se abre PR de “correção” especulativa.
- Em dúvida, reportar fora do merge (ex.: discussão na equipa) em vez de misturar fix de baixa confiança.

### Estratégia de correção

- Fix **mínimo** e de alta confiança.
- Acrescentar ou ajustar **testes** quando fizer sentido para fixar o comportamento.
- Evitar refactors amplos no mesmo PR que o fix crítico.

### Saída esperada (humano / agente)

Quando houver fix:

- Bug e impacto
- Causa raiz
- Fix e validação realizada

Quando **não** houver bug crítico: resumo curto do tipo *nenhum bug crítico encontrado* — resultado esperado na maior parte dos dias.
