# Runbook - Operacao da Automacao de Reunioes

## Escopo

Este runbook cobre a operacao do modulo de reunioes automatizadas: bootstrap, diagnostico, fila, respostas do cliente e rollback operacional.

## Bootstrap inicial

1. Gerar schema e alinhar banco:
   - `npx prisma generate`
   - `npx prisma db push`
2. Carregar templates e regras default:
   - `npm run db:seed:meeting-automation`
3. Validar saude basica:
   - `npm run ops:meeting-automation:health`

## Comandos operacionais

- Seed default:
  - `npm run db:seed:meeting-automation`
- Teste unitario basico:
  - `npm run test:meeting-automation`
- Smoke test ponta a ponta:
  - `npm run test:meeting-automation:smoke`
- Regressao:
  - `npm run test:meeting-automation:regression`
- Health check:
  - `npm run ops:meeting-automation:health`
- Scheduler:
  - chamar `POST /api/jobs/scheduler`
- Processador de fila:
  - chamar `POST /api/jobs/process`

## O que monitorar

No painel `/admin/comunicacao`, aba `Reunioes`:

- `Aguardando confirmacao`
- `Jobs com falha`
- `Jobs atrasados`
- `Reminders falhos`
- lista de `Jobs com problema`
- proximas reunioes com status operacional

## Diagnostico rapido

### Sintoma: lembrete nao saiu

Verificar:

1. Existe `Compromisso` futuro com `tipo = REUNIAO`
2. Existe `CompromissoReminder`
3. Existe `CommunicationJob` vinculado ao `compromissoId`
4. O job ficou em `PENDING`, `PROCESSING`, `FAILED` ou `CANCELLED`
5. O cliente tem WhatsApp ou o responsavel tem e-mail

### Sintoma: cliente respondeu e nada mudou

Verificar:

1. A conversa correta esta vinculada ao `clienteId` e `atendimentoId`
2. O inbound caiu em `Message`
3. O handler encontrou um `Compromisso` elegivel
4. A mensagem tinha intencao classificavel:
   - `CONFIRMO`
   - `REMARCAR`
   - `CANCELAR`

### Sintoma: duplicidade

Verificar:

1. `correlationId` do reminder
2. reexecucao do scheduler
3. respostas repetidas do cliente
4. jobs terminais por evento:
   - `REUNIAO_CONFIRMADA`
   - `REUNIAO_REMARCACAO_SOLICITADA`
   - `REUNIAO_CANCELADA`

## Acoes corretivas

### Reagendar automacao de uma reuniao

- atualizar o `Compromisso`
- sincronizar calendario
- rodar novamente o scheduler para recalculo

### Cancelar automacao restante

- concluir ou cancelar o `Compromisso`
- os reminders ativos devem ser cancelados automaticamente

### Falha no provedor

- SMTP:
  - revisar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - rodar `npm run ops:meeting-automation:health`
- WhatsApp:
  - revisar conexao em `/admin/comunicacao`
  - reconectar se necessario
- Calendario:
  - revisar integracoes em `/admin/integracoes`

## Rollout recomendado

1. Ativar para uma equipe ou advogado piloto
2. Monitorar por 2-3 dias:
   - jobs falhos
   - duplicidades
   - remarcacoes/cancelamentos
3. Expandir gradualmente para os demais

## Rollback operacional

Se for necessario desativar rapidamente:

1. Desativar regras de reuniao no admin
2. Parar execucao operacional do scheduler, se aplicavel
3. Cancelar reminders pendentes das reunioes impactadas
4. Manter `Compromisso` e `Atendimento` como fonte de verdade, sem automacao ativa
