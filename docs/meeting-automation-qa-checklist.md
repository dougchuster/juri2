# Checklist de QA - Automacao de Reunioes

## Objetivo

Validar o fluxo funcional completo de reunioes no sistema rodando antes de liberar para operacao ampla.

## Pre-requisitos

- `npm run db:seed:meeting-automation`
- `npm run dev` ou ambiente homologacao ativo
- Pelo menos um advogado com integracao de calendario, se o teste de agenda externa for exigido
- WhatsApp conectado e SMTP configurado, se a validacao for ponta a ponta com provedores reais

## Roteiro

### 1. Criacao da reuniao

- Criar uma reuniao futura pela agenda ou pela conversa
- Verificar no banco/painel que `Compromisso` foi criado com `clienteId` e `atendimentoId`
- Verificar no atendimento:
  - `statusReuniao = AGENDADA`
  - `statusOperacional = REUNIAO_AGENDADA` ou equivalente do fluxo atual
- Verificar no admin de comunicacao:
  - reminders criados
  - jobs iniciais na fila

### 2. Lembretes automáticos

- Rodar `/api/jobs/scheduler`
- Confirmar criacao dos reminders esperados:
  - `CLIENTE_CONFIRMACAO`
  - `CLIENTE_D1`
  - `CLIENTE_H1`
  - `RESPONSAVEL_D1`
  - `RESPONSAVEL_H1`
- Verificar `correlationId` padronizado por reminder
- Garantir que segunda execucao do scheduler nao duplica jobs

### 3. Confirmacao do cliente

- Enviar resposta inbound `CONFIRMO`
- Verificar:
  - `Compromisso.statusConfirmacao = CONFIRMADO`
  - `Atendimento.statusReuniao = CONFIRMADA`
  - `Atendimento.statusOperacional = REUNIAO_CONFIRMADA`
  - historico do atendimento criado
  - notificacao interna criada
  - job `REUNIAO_CONFIRMADA` criado uma unica vez

### 4. Pedido de remarcacao

- Enviar resposta inbound `REMARCAR`
- Verificar:
  - `Compromisso.statusConfirmacao = REMARCACAO_SOLICITADA`
  - reminders anteriores cancelados
  - jobs antigos de reminder cancelados
  - notificacao interna criada
  - job `REUNIAO_REMARCACAO_SOLICITADA` criado

### 5. Cancelamento

- Enviar resposta inbound `CANCELAR`
- Verificar:
  - `Compromisso.statusConfirmacao = CANCELADO`
  - `canceladoAt` preenchido
  - `Atendimento.statusReuniao = CANCELADA`
  - `Atendimento.statusOperacional = AGUARDANDO_CLIENTE`
  - reminders cancelados
  - job `REUNIAO_CANCELADA` criado

### 6. Casos de borda

- Cliente sem WhatsApp:
  - sistema nao cria reminder de cliente
  - cria apenas reminder do responsavel se houver e-mail
- Responsavel sem e-mail:
  - sistema nao cria reminder do responsavel
- Reuniao expirada:
  - scheduler ignora e nao cria job
- Repetir `CONFIRMO`, `REMARCAR` e `CANCELAR`:
  - sem duplicar historico
  - sem duplicar notificacao
  - sem duplicar job terminal

## Comandos de apoio

- `npm run test:meeting-automation`
- `npm run test:meeting-automation:smoke`
- `npm run test:meeting-automation:regression`
- `npm run ops:meeting-automation:health`

## Liberacao

Liberar para producao somente se:

- compilacao estiver verde
- smoke test estiver verde
- regressao estiver verde
- checklist manual estiver verde
- health check nao apontar falhas criticas
