# Automacao de Atendimento e Alertas de Reuniao

## Objetivo

Desenhar um modulo completo de automacao de atendimento para o sistema juridico atual, com foco em:

- agendamento de reunioes e compromissos;
- lembretes automaticos para cliente e advogado responsavel;
- confirmacao de reuniao pelo cliente;
- painel administrativo para configurar regras, templates, janelas de envio e logs;
- reaproveitamento maximo da stack atual: Next.js, Prisma, PostgreSQL, Docker e WhatsApp via Baileys/Evolution compatibility layer.

## Artefatos operacionais

Para a operacao atual do modulo, ver tambem:

- `docs/meeting-automation-qa-checklist.md`
- `docs/meeting-automation-runbook.md`

---

## Diagnostico da base atual

O projeto ja possui fundacoes importantes:

- `Compromisso`, `Audiencia`, `Prazo` e `Atendimento` no schema.
- sincronizacao com Google Calendar e Outlook.
- fila de mensagens com `CommunicationJob`.
- templates e regras de notificacao com `MessageTemplate` e `NotificationRule`.
- scheduler HTTP em `/api/jobs/scheduler`.
- editor visual de automacoes CRM com `AutomationFlow` + `FlowExecution`.
- criacao de reuniao a partir da tela de comunicacao.

### O que ja pode ser reaproveitado

1. `Compromisso` deve continuar sendo a entidade operacional da reuniao.
2. `Atendimento.dataReuniao` e `Atendimento.statusReuniao` podem continuar como espelho operacional do atendimento.
3. `CommunicationJob` deve continuar sendo a fila unica de entrega.
4. `MessageTemplate` e `NotificationRule` devem ser expandidos, nao substituidos.
5. O editor visual de `AutomationFlow` pode ser reaproveitado como base do painel de automacoes de atendimento.

### Lacunas atuais

1. Nao existem eventos especificos para reuniao de atendimento.
2. O scheduler atual olha prazos e faturas, mas nao compromissos/reunioes.
3. `Compromisso` tem `clienteId`, mas hoje a relacao com `Cliente` nao esta modelada.
4. Nao existe controle de confirmacao da reuniao pelo cliente.
5. Nao existe idempotencia dedicada para lembretes de reuniao.
6. O painel de comunicacao atual permite regras, mas ainda nao e orientado ao dominio "atendimento/reuniao".

---

## Recomendacao de arquitetura

## 1. Fonte unica da verdade

Para reunioes de atendimento:

- `Compromisso` = fonte oficial do horario agendado.
- `Atendimento` = espelho operacional do relacionamento.
- `CalendarEvent` = espelho de integracao externa.
- `CommunicationJob` = fila de entrega.

Regra pratica:

- Se a reuniao foi criada, remarcada ou cancelada, o sistema atualiza primeiro `Compromisso`.
- Depois sincroniza `Atendimento`.
- Depois sincroniza calendarios.
- Depois dispara eventos de automacao.

---

## 2. Separar automacao deterministica de agente de IA

### Automacao deterministica

Deve cuidar de:

- D-1 para cliente;
- H-1 para cliente;
- D-1 para advogado;
- H-1 para advogado;
- pedido de confirmacao;
- tratamento de remarcacao/cancelamento;
- retry e observabilidade.

Isso deve ficar em codigo normal, scheduler e banco.

### Agente de IA

Pode entrar como camada opcional para:

- sugerir horarios com base na agenda;
- resumir contexto da reuniao;
- propor resposta automatica;
- classificar intencao da conversa;
- sugerir proxima acao.

O agente nao deve ser o motor principal do lembrete. Lembrete de reuniao e fluxo critico e precisa ser previsivel.

---

## 3. Evolucao de schema recomendada

## 3.1. Ajustes em `Compromisso`

Adicionar ou corrigir:

- relacao formal com `Cliente`;
- `atendimentoId` opcional;
- `timezone` com default `America/Sao_Paulo`;
- `statusConfirmacaoCliente` ou tabela dedicada;
- `confirmationRequestedAt`;
- `confirmedAt`;
- `cancelledAt`;
- `remindedD1At`;
- `remindedH1At`.

### Recomendacao melhor

Em vez de multiplicar colunas, criar uma tabela dedicada:

- `CompromissoReminder`
  - `id`
  - `compromissoId`
  - `kind` (`CLIENTE_D1`, `CLIENTE_H1`, `RESPONSAVEL_D1`, `RESPONSAVEL_H1`, `CLIENTE_CONFIRMACAO`)
  - `scheduledFor`
  - `jobId`
  - `status`
  - `sentAt`
  - `providerMessageId`
  - `errorMessage`

Isso resolve:

- idempotencia;
- auditoria;
- remarcacao;
- reprocessamento.

## 3.2. Eventos novos

Expandir `EventType` com:

- `ATENDIMENTO_REUNIAO_CRIADA`
- `ATENDIMENTO_REUNIAO_REMARCADA`
- `ATENDIMENTO_REUNIAO_CANCELADA`
- `ATENDIMENTO_REUNIAO_D1`
- `ATENDIMENTO_REUNIAO_H1`
- `ATENDIMENTO_REUNIAO_CONFIRMACAO_SOLICITADA`
- `ATENDIMENTO_REUNIAO_CONFIRMADA_CLIENTE`
- `ATENDIMENTO_REUNIAO_NAO_CONFIRMADA`

## 3.3. Regras mais ricas

Hoje `NotificationRule` ja ajuda, mas para atendimento convem adicionar:

- `entityType` (`PRAZO`, `FATURA`, `REUNIAO_ATENDIMENTO`, `COMPROMISSO_GERAL`)
- `audience` (`CLIENTE`, `RESPONSAVEL`, `EQUIPE_APOIO`, `AMBOS`)
- `delayUnit` (`MINUTES`, `HOURS`, `DAYS`)
- `relativeToField` (`dataInicio`, `dataReuniao`, `dataFatal`)

Se quiser reduzir impacto inicial, da para manter `NotificationRule` como esta e apenas acrescentar novos `EventType`.

---

## 4. Fluxo de negocio recomendado

## 4.1. Quando a reuniao e criada

1. cria/atualiza `Compromisso`;
2. vincula `clienteId` e `atendimentoId` quando houver;
3. atualiza `Atendimento`:
   - `dataReuniao`
   - `statusReuniao = AGENDADA`
   - `statusOperacional = REUNIAO_AGENDADA`
4. sincroniza calendarios;
5. dispara evento `ATENDIMENTO_REUNIAO_CRIADA`;
6. scheduler registra reminders D-1 e H-1.

## 4.2. Quando faltar 1 dia

O scheduler busca compromissos:

- `tipo = REUNIAO`
- `concluido = false`
- nao cancelados
- ainda sem reminder D-1 enviado
- inicio entre `agora + 24h` e janela de tolerancia

Depois:

- cria reminder para cliente;
- cria reminder para responsavel;
- opcionalmente envia CTA de confirmacao ao cliente.

## 4.3. Quando faltar 1 hora

Mesma logica, com janela de 1 hora.

## 4.4. Confirmacao do cliente

Quando o cliente responder:

- "confirmo"
- "ok"
- "estarei presente"

o webhook/message handler deve:

1. localizar conversa e atendimento;
2. localizar compromisso futuro mais proximo;
3. marcar confirmacao;
4. atualizar `Atendimento.statusReuniao = CONFIRMADA`;
5. opcionalmente notificar advogado/equipe.

## 4.5. Remarcacao

Ao remarcar:

- cancela reminders pendentes antigos;
- recalcula D-1 e H-1;
- atualiza calendarios;
- gera log de remarcacao.

---

## 5. Scheduler recomendado

O scheduler atual ja possui endpoint central. A recomendacao e:

- manter `/api/jobs/scheduler` como orquestrador unico;
- adicionar uma etapa nova: `scheduleMeetingReminders()`;
- rodar a cada 5 minutos;
- processar janelas curtas com idempotencia no banco.

### Janela sugerida

- D-1: compromissos com inicio entre `23h55` e `24h05` a partir do horario atual.
- H-1: compromissos com inicio entre `55min` e `65min`.

Isso evita dependencia de cron exatamente no minuto certo.

### Idempotencia

Antes de criar job:

- verificar se ja existe `CompromissoReminder` do mesmo `kind`;
- ou, em fase inicial, verificar `CommunicationJob` com `correlationId` padronizado.

Padrao sugerido:

- `meeting:{compromissoId}:cliente:d1`
- `meeting:{compromissoId}:cliente:h1`
- `meeting:{compromissoId}:responsavel:d1`
- `meeting:{compromissoId}:responsavel:h1`

---

## 6. Painel recomendado

Criar um modulo novo no admin:

- `/admin/automacoes-atendimento`

ou reaproveitar a UX de fluxo visual existente em CRM com rota nova:

- `/atendimento/automacoes/[id]`

## 6.1. Abas do painel

### Aba 1: Regras prontas

Lista de automacoes padrao:

- Confirmacao D-1 cliente
- Confirmacao H-1 cliente
- Aviso D-1 responsavel
- Aviso H-1 responsavel
- Aviso de reuniao nao confirmada
- Aviso de remarcacao

Campos:

- ativa/inativa
- canal
- horario permitido
- dias uteis apenas
- template
- destino

### Aba 2: Templates

Templates separados por contexto:

- cliente D-1
- cliente H-1
- advogado D-1
- advogado H-1
- confirmacao
- cancelamento
- remarcacao

Variaveis recomendadas:

- `{nome}`
- `{primeiro_nome}`
- `{data_reuniao}`
- `{hora_reuniao}`
- `{local}`
- `{link_confirmacao}`
- `{nome_responsavel}`
- `{escritorio}`

### Aba 3: Fluxos visuais

Reaproveitar `AutomationFlow` para automacoes avancadas:

- trigger de reuniao criada;
- condicao por area juridica;
- wait ate H-24;
- enviar WhatsApp;
- wait ate H-1;
- notificar equipe;
- criar tarefa se nao confirmar.

### Aba 4: Logs e entregas

Exibir:

- compromisso;
- cliente;
- responsavel;
- tipo do lembrete;
- status;
- tentativas;
- erro;
- horario programado;
- horario enviado.

### Aba 5: Monitoramento

Indicadores:

- reunioes futuras;
- alertas programados;
- alertas enviados;
- falhas de envio;
- confirmacoes pendentes;
- confirmacoes recebidas.

---

## 7. Reaproveitamento recomendado do que ja existe

## Reaproveitar sem hesitar

- `CommunicationJob`
- `MessageTemplate`
- `NotificationRule`
- `calendar-sync`
- `createConversationMeeting`
- editor visual `AutomationFlow`

## Ajustar

- `Compromisso` para virar entidade melhor conectada ao atendimento
- `communication-engine` para novos eventos
- `scheduler` para reminders de reuniao

## Nao misturar

- `admin/workflows` atual e workflow de tarefas por fase processual.
- automacao de atendimento deve ficar em modulo separado para nao confundir o usuario.

---

## 8. Roadmap de implementacao

## Fase 1 - Base de dominio

- corrigir relacao `Compromisso -> Cliente`
- adicionar `Compromisso -> Atendimento` opcional
- criar `CompromissoReminder`
- criar migration Prisma

## Fase 2 - Eventos e scheduler

- expandir `EventType`
- implementar `scheduleMeetingReminders()`
- integrar no `/api/jobs/scheduler`
- criar correlation ids padronizados

## Fase 3 - Entrega e confirmacao

- templates padrao de reuniao
- regras padrao de notificacao
- parser simples de confirmacao via WhatsApp
- atualizacao automatica de `statusReuniao`

## Fase 4 - Painel admin

- pagina `admin/automacoes-atendimento`
- CRUD de regras focadas em reuniao
- logs por compromisso
- filtros por responsavel/canal/status

## Fase 5 - Fluxos avancados

- reaproveitar editor visual CRM para atendimento
- trigger `ATENDIMENTO_REUNIAO_CRIADA`
- nodes de mensagem, espera, tarefa e notify team

## Fase 6 - IA opcional

- agente para sugerir horarios
- agente para resumir dossie da reuniao
- agente para sugerir proxima acao na conversa

---

## OpenClaw: usar ou nao?

## Recomendacao curta

Nao usaria OpenClaw como motor principal desse modulo.

## Motivo

Seu problema principal e de:

- workflow deterministico;
- agenda;
- notificacao confiavel;
- idempotencia;
- integracao com banco e fila;
- rastreabilidade juridica.

Isso combina muito melhor com:

- Prisma + PostgreSQL
- scheduler proprio
- `CommunicationJob`
- automacao visual interna

## Onde OpenClaw poderia entrar

Apenas como camada opcional, por exemplo:

- um agente interno para operador consultar agenda;
- um copiloto para sugerir resposta;
- um operador para acionar ferramentas do sistema via chat.

Mesmo nesse caso, eu manteria:

- regras criticas no seu backend;
- lembretes e confirmacoes fora do agente;
- auditoria e persistencia no seu banco.

## Conclusao pratica

Para este caso:

- sim para agentes pontuais;
- nao para o core de automacao e alertas.

---

## Decisao arquitetural recomendada

Implementar o modulo dentro do proprio sistema, reaproveitando os componentes existentes, com a seguinte estrategia:

1. `Compromisso` como origem oficial da reuniao.
2. `CommunicationJob` como fila unica.
3. `MessageTemplate` + `NotificationRule` expandidos para eventos de reuniao.
4. scheduler proprio para D-1 e H-1.
5. painel especifico de automacoes de atendimento.
6. editor visual reaproveitado para regras avancadas.
7. IA apenas como camada auxiliar, nunca como orquestrador principal.
