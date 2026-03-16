# Projeto: LGPD Operacional

> Status: Partes 1, 2 e 3 concluidas
> Prioridade: Alta
> Dependencias externas: Nenhuma obrigatoria

---

## 1. Objetivo

Implementar uma camada operacional de LGPD que torne executaveis os direitos do titular, a governanca de consentimento, a retencao e a trilha de tratamento de dados dentro do sistema.

---

## 2. Problema atual

O sistema ja possui sinais de LGPD no CRM e log de auditoria, mas ainda nao tem um fluxo operacional completo para solicitar exportacao, anonimizar, excluir, aplicar retencao e acompanhar o ciclo de atendimento de privacidade.

---

## 3. Objetivos de negocio

- Reduzir risco juridico e operacional.
- Estruturar tratamento de dados de clientes e contatos.
- Permitir resposta auditavel a solicitacoes de titulares.

---

## 4. Escopo

### Inclui

- central de solicitacoes LGPD;
- catalogo de acoes do titular;
- exportacao de dados;
- anonimizacao assistida;
- exclusao logica quando aplicavel;
- politicas de retencao;
- consentimento e historico.

### Fora de escopo inicial

- DPO portal externo;
- integracao com assinatura ou certificacao externa;
- automacao juridica de pareceres de privacidade.

---

## 5. Entregas

- modulo admin/LGPD;
- trilha de solicitacoes;
- exportador interno de dados;
- rotina de retencao;
- painel de consentimento por cliente.

---

## 6. Requisitos funcionais

- Usuario autorizado deve abrir solicitacao LGPD.
- Sistema deve classificar tipo da solicitacao: acesso, correcao, anonimizacao, exclusao, revogacao de consentimento.
- Sistema deve gerar exportacao consolidada de dados do titular.
- Sistema deve permitir anonimizar registros elegiveis.
- Sistema deve registrar base legal, operador responsavel e resultado.
- Sistema deve manter historico de consentimento por canal e data.
- Sistema deve permitir configurar regras de retencao por entidade.

---

## 7. Requisitos nao funcionais

- todas as acoes precisam gerar auditoria;
- exportacoes devem ter expiracao;
- dados anonimizados nao podem ser reidentificados pela UI;
- regras precisam respeitar preservacao minima quando houver exigencia legal.

---

## 8. Modelo de dados proposto

### Reaproveitar

- `CRMLGPDEvent`
- `LogAuditoria`
- campos de consentimento em `Cliente`

### Novas entidades

`LgpdRequest`

- `id`
- `clienteId`
- `requestType`
- `status`
- `requestedById`
- `legalBasis`
- `notes`
- `openedAt`
- `completedAt`

`LgpdDataExport`

- `id`
- `requestId`
- `fileUrl`
- `expiresAt`
- `generatedAt`
- `generatedById`

`RetentionPolicy`

- `id`
- `entityName`
- `retentionDays`
- `actionType`
- `isActive`

`RetentionExecution`

- `id`
- `policyId`
- `status`
- `processedCount`
- `errorCount`
- `executedAt`

---

## 9. Backend

### Servicos

- `src/lib/services/lgpd-service.ts`
- `src/lib/services/lgpd-export.ts`
- `src/lib/services/retention-engine.ts`

### Casos de uso

- abrir solicitacao;
- gerar pacote de exportacao;
- executar anonimizacao;
- executar exclusao logica;
- registrar revogacao de consentimento;
- rodar rotina de retencao.

### Regras

- exclusao total so quando juridicamente permitida;
- anonimizacao deve preservar integridade operacional quando necessario;
- toda execucao deve ser reversivel apenas se ainda nao concluida.

---

## 10. Frontend

### Areas

- detalhe do cliente;
- painel administrativo de LGPD;
- fila de solicitacoes;
- tela de politicas de retencao.

### Componentes

- `LgpdRequestTable`
- `LgpdConsentPanel`
- `LgpdExportAction`
- `RetentionPolicyManager`

---

## 11. Fluxos principais

### Fluxo 1: Pedido de acesso

1. Operador abre solicitacao.
2. Sistema consolida dados do titular.
3. Gera exportacao.
4. Registra entrega e encerramento.

### Fluxo 2: Pedido de anonimizacao

1. Operador valida elegibilidade.
2. Sistema executa rotina por entidades.
3. Registra campos anonimizados e auditoria.

### Fluxo 3: Retencao

1. Politica identifica registros vencidos.
2. Sistema aplica acao prevista.
3. Gera sumario de execucao.

---

## 12. Fases de implementacao

### Fase 1

- solicitacoes LGPD;
- consentimento consolidado;
- auditoria.

Status atual:

- concluida em 11 de marco de 2026 com modulo `/admin/lgpd`;
- inclui abertura, acompanhamento, transicao de status e leitura consolidada do historico de consentimento;
- nao inclui ainda exportacao, anonimizacao assistida ou retencao automatizada.

### Fase 2

- exportacao;
- anonimizacao assistida;
- tela administrativa.

Status atual:

- concluida em 11 de marco de 2026 com geracao de pacote consolidado por solicitacao;
- inclui download controlado por rota autenticada, expiracao logica do pacote, registro do operador responsavel e execucao auditavel de anonimizacao, exclusao logica e revogacao de consentimento;
- nao inclui ainda politica automatizada de retencao ou relatorio continuo de compliance.

### Fase 3

- engine de retencao;
- relatorios de compliance;
- automacoes de vencimento.

Status atual:

- concluida em 11 de marco de 2026 com politicas por entidade, execucao manual e automatica e historico persistido de execucoes;
- inclui limpeza de pacotes LGPD expirados, anonimizacao automatizada de clientes arquivados elegiveis e rota de cron dedicada;
- o relatorio administrativo fica centralizado no proprio `/admin/lgpd`, com cards de elegibilidade, politicas e historico de execucao.

---

## 13. Criterios de aceite

- Solicitacao LGPD pode ser aberta, acompanhada e encerrada.
- Exportacao de dados pode ser gerada para um titular.
- Consentimento e revogacao ficam historicos.
- Anonimizacao gera trilha auditavel.
- Politicas de retencao podem ser configuradas e executadas.

---

## 14. Riscos

- anonimizacao quebrar relacoes importantes se mal desenhada;
- excesso de acesso a dados exportados sem expiracao;
- regras juridicas variarem por tipo documental e contratual.

---

## 15. Medidas de sucesso

- tempo medio para atender solicitacao de titular;
- percentual de solicitacoes concluidas no prazo;
- cobertura de entidades pela politica de retencao;
- rastreabilidade completa das acoes de privacidade.
