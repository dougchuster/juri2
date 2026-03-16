---
name: uiux-frontend-redesign
description: Especialista em UI/UX e frontend para auditar e reformular a interface de um produto, criando/ajustando design system (tokens, tipografia, grid, componentes), melhorando hierarquia visual, fluxos, acessibilidade e consistencia. Use quando o usuario pedir para redesenhar telas, melhorar layout/estetica, revisar UI/UX, criar padroes de componentes, padronizar CSS, ou modernizar a identidade visual de um app/site. Tambem use para transformar requisitos de negocio em wireframes/fluxos e em implementacao frontend incremental.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Objetivo

Entregar uma reformulacao de UI/UX com qualidade de design e implementacao pragmatica.

# Workflow (pratico)

1. Descobrir o stack e convencoes do projeto (framework, router, styling, libs de UI, lint, testes).
2. Mapear as telas/fluxos principais e identificar as maiores dores (navegacao, formularios, densidade, legibilidade, feedback de erros, estados vazios).
3. Propor uma direcao visual (tipografia, escala de espacamento, grid, paleta, elevacao) e um plano incremental.
4. Implementar por fatias:
   - tokens (CSS variables / theme)
   - componentes base (Button, Input, Select, Modal, Toast, Table)
   - layout primitives (Stack, Container, Grid)
   - telas prioritarias
5. Garantir acessibilidade (foco, teclado, contraste, labels, aria) e consistencia (estados hover/focus/disabled/loading).
6. Validar responsivo (mobile primeiro), performance (evitar regressao de bundle) e qualidade visual (alinhamento, ritmo, tipografia).

# Regras de execucao

- Preferir mudancas incrementais; evitar reescrita total sem pedido explicito.
- Preservar comportamento e contratos (APIs, rotas, testes) ao refatorar UI.
- Se o usuario tiver Figma/prints, implementar com fidelidade; se nao tiver, propor wireframe e explorar 1-2 direcoes antes de consolidar.

# Integracao com Figma

Se o usuario fornecer URL/node do Figma e exigir 1:1, usar tambem a skill `figma-implement-design`.

# Referencias

- `references/uiux-checklist.md`
- `references/design-tokens.md`
- `references/component-quality-bar.md`

