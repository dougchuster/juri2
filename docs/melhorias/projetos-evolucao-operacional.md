# Projetos de Evolucao Operacional

> Data: 2026-03-10
> Contexto: backlog estruturado a partir do gap entre o estado atual do Sistema Juridico ADV e os objetivos de maturidade operacional definidos para documentos, automacoes, seguranca, BI e LGPD.

---

## Objetivo

Consolidar cinco projetos de evolucao que podem ser implementados de forma incremental no monolito atual:

1. Versionamento real de documentos
2. Central de jobs com reprocessamento
3. MFA interno
4. Jurimetria e BI interno
5. LGPD operacional

Cada projeto possui sua especificacao detalhada em documento proprio.

---

## Premissas

- O sistema permanece como monolito modular em Next.js.
- O ambiente continua single-tenant por escritorio na v1.
- As entregas devem funcionar sem dependencia obrigatoria de terceiros.
- O banco principal continua sendo PostgreSQL via Prisma.
- Sempre que possivel, reutilizar entidades e fluxos ja existentes.

---

## Ordem recomendada

### 1. Central de jobs com reprocessamento

Primeiro porque melhora operacao, suporte e confiabilidade das automacoes que ja existem.

Documento:
[jobs-central-reprocessamento.md](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/docs/melhorias/projetos/jobs-central-reprocessamento.md)

### 2. Versionamento real de documentos

Segundo porque destrava governanca documental e fluxo de revisao, com impacto alto no dia a dia.

Documento:
[documentos-versionamento-real.md](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/docs/melhorias/projetos/documentos-versionamento-real.md)

### 3. MFA interno

Terceiro porque reduz risco de seguranca em usuarios administrativos e financeiros sem grande dependencia funcional.

Documento:
[mfa-interno.md](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/docs/melhorias/projetos/mfa-interno.md)

### 4. LGPD operacional

Quarto porque aproveita auditoria, CRM e seguranca ja existentes, e organiza compliance de forma executavel.

Documento:
[lgpd-operacional.md](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/docs/melhorias/projetos/lgpd-operacional.md)

### 5. Jurimetria e BI interno

Quinto porque depende de dados mais confiaveis, jobs estaveis, melhor trilha de eventos e classificacoes mais maduras.

Documento:
[jurimetria-bi-interno.md](/C:/Users/dougc/Documents/Sistema%20Juridico%20ADV/docs/melhorias/projetos/jurimetria-bi-interno.md)

---

## Mapa de dependencia

- `Central de jobs` melhora observabilidade e reprocessamento para automacoes e cargas de BI.
- `Versionamento de documentos` alimenta auditoria, revisao e trilha juridica.
- `MFA` fortalece seguranca antes de ampliar acessos sensiveis.
- `LGPD operacional` depende de auditoria confiavel e boa governanca de usuarios/dados.
- `Jurimetria/BI` depende de dados consistentes e operacao previsivel.

---

## Resultado esperado

Ao concluir os cinco projetos, o sistema passa a ter:

- governanca documental real;
- operacao assistida de automacoes e filas;
- seguranca de acesso mais forte;
- camada analitica gerencial e jurimetrica;
- compliance operacional de LGPD com trilha auditavel.
