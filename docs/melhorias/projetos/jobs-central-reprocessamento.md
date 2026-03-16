# Projeto: Central de Jobs com Reprocessamento

> Status: Proposto
> Prioridade: Muito alta
> Dependencias externas: Nenhuma obrigatoria

---

## 1. Objetivo

Criar uma central operacional para acompanhamento, filtragem, diagnostico e reprocessamento de jobs e execucoes do sistema, unificando automacoes juridicas, fluxos CRM e rotinas agendadas.

---

## 2. Problema atual

O sistema ja possui `AutomacaoJob` e `FlowExecution`, mas a operacao ainda esta dispersa. Faltam uma visao unica de falhas, botao de reprocessar, padronizacao de status, tentativa manual de retry e leitura operacional de logs.

---

## 3. Objetivos de negocio

- Reduzir dependencia tecnica para recuperar falhas.
- Aumentar confiabilidade percebida das automacoes.
- Melhorar suporte interno e tempo de resposta operacional.
- Criar trilha de execucao reutilizavel para BI e auditoria.

---

## 4. Escopo

### Inclui

- painel unico de jobs e execucoes;
- filtros por status, modulo, origem e periodo;
- detalhe do job com logs e payload resumido;
- reprocessamento manual;
- retry com controle de tentativas;
- cancelamento quando aplicavel;
- eventos auditaveis.

### Fora de escopo inicial

- motor novo de filas;
- orquestracao distribuida multi-worker;
- observabilidade externa tipo Datadog.

---

## 5. Entregas

- modulo admin/operacoes/jobs;
- servico padrao de reprocessamento;
- normalizacao de status e erro operacional;
- politicas de retry;
- auditoria de reprocessamento.

---

## 6. Requisitos funcionais

- O sistema deve listar jobs e execucoes recentes.
- O sistema deve permitir filtrar por `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`.
- O usuario deve abrir o detalhe e ver contexto operacional.
- O usuario autorizado deve poder clicar em `Reprocessar`.
- O reprocessamento deve criar nova tentativa ou nova execucao vinculada ao job original.
- O sistema deve registrar quem reprocessou, quando e por qual motivo.
- O sistema deve permitir diferenciar falha tecnica de falha funcional.

---

## 7. Requisitos nao funcionais

- Logs legiveis e paginados.
- Idempotencia sempre que possivel.
- Retry com limite configuravel.
- Acoes criticas registradas em auditoria.

---

## 8. Modelo de dados proposto

### Reaproveitar

- `AutomacaoJob`
- `FlowExecution`

### Novas entidades sugeridas

`JobExecutionAttempt`

- `id`
- `jobType`
- `jobId`
- `attemptNumber`
- `triggeredBy`
- `triggerSource` (`SYSTEM`, `MANUAL_RETRY`, `SCHEDULED`)
- `status`
- `errorCode`
- `errorMessage`
- `payloadSnapshot`
- `resultSnapshot`
- `startedAt`
- `finishedAt`

`JobRetryRequest`

- `id`
- `jobType`
- `jobId`
- `requestedById`
- `reason`
- `status`
- `createdAt`

---

## 9. Backend

### Servicos

- `src/lib/services/job-center.ts`
- `src/lib/services/job-retry.ts`
- adaptadores para `automacao-nacional`, `automation-engine` e outros modulos.

### Casos de uso

- listar jobs;
- abrir detalhe;
- reprocessar;
- cancelar;
- reenfileirar;
- consultar tentativas;
- consolidar status.

### Regras

- cada reprocessamento gera nova tentativa;
- reprocessar nao apaga historico anterior;
- falhas sem idempotencia exigem confirmacao manual;
- payload sensivel deve ser mascarado na UI.

---

## 10. Frontend

### Tela principal

- tabela de jobs;
- cards de KPIs operacionais;
- filtros rapidos;
- acoes em lote futuras.

### Tela de detalhe

- resumo do job;
- tentativas anteriores;
- logs;
- erro principal;
- acao de reprocessar/cancelar.

---

## 11. Fluxos principais

### Fluxo 1: Falha operacional

1. Job falha.
2. Sistema salva erro estruturado.
3. Job aparece na central como `FAILED`.
4. Operador analisa e reprocessa.

### Fluxo 2: Reprocessamento

1. Operador informa motivo.
2. Sistema valida permissao.
3. Nova tentativa e criada.
4. Resultado fica vinculado ao historico do job.

---

## 12. Fases de implementacao

### Fase 1

- tela de listagem;
- detalhe;
- consolidacao de status.

### Fase 2

- reprocessamento manual;
- historico de tentativas;
- auditoria.

### Fase 3

- retry em lote;
- politicas configuraveis;
- dashboards operacionais.

---

## 13. Criterios de aceite

- Operador consegue localizar jobs falhos em um painel unico.
- Reprocessamento nao exige acesso ao banco.
- Historico de tentativas fica preservado.
- Toda tentativa manual gera auditoria.
- Logs e status ficam compreensiveis para operacao.

---

## 14. Riscos

- reprocessar algo nao idempotente duplicar efeitos;
- falta de padrao entre modulos gerar adaptadores demais;
- logs muito extensos exigirem truncagem e mascaramento.

---

## 15. Medidas de sucesso

- tempo medio para recuperar job com falha;
- percentual de falhas recuperadas por reprocessamento;
- quantidade de falhas recorrentes por modulo;
- reducao de intervencao tecnica manual.
