# CRM Avançado â€” Sistema Jurídico ADV
> **Versão:** 1.0 | **Data:** Fevereiro 2026 | **Status:** Planejamento

---

## Visão Geral

Este documento especifica a evolução do módulo de comunicação atual para um **CRM completo** com capacidades de:

- ðŸ“¤ **Disparo em massa** (WhatsApp + E-mail) com controle de taxa e LGPD
- ðŸ¤– **Automações baseadas em fluxo** (drag-and-drop visual)
- ðŸŽ¯ **Segmentação avançada** de contatos por tags, status, área jurídica e comportamento
- ðŸ“Š **Analytics em tempo real**: taxa de abertura, resposta, conversão
- ðŸ’¬ **Chatbot jurídico** com IA para atendimento inicial
- ðŸ”„ **Funil de relacionamento** com clientes e prospectos

---

## Estado Atual do Sistema

### O que já existe e funciona

| Componente | Arquivo | Capacidade |
|---|---|---|
| Communication Engine | `src/lib/services/communication-engine.ts` | Event-driven, jobs queue, retry com backoff |
| Evolution API (WhatsApp) | `src/lib/integrations/evolution-api.ts` | Envio texto + mídia |
| E-mail SMTP | `src/lib/integrations/email-service.ts` | Templates HTML, envio individual |
| Message Templates | DB: `MessageTemplate` | Categorizado, variáveis dinâmicas |
| Conversations Inbox | `src/components/comunicacao/` | Inbox WhatsApp + E-mail |
| BullMQ Queue | `src/lib/queue/` | Fila de automação existente |
| Client Phones | DB: `ClientPhone` | Opt-in/Opt-out LGPD |
| Notification Rules | DB: `NotificationRule` | Event triggers, janela horária, dias úteis |

### Gaps que o CRM Avançado resolve

```
âŒ Sem disparo em massa (bulk send)
âŒ Sem segmentação por tags/grupos de contatos
âŒ Sem fluxos visuais de automação (workflows)
âŒ Sem funil CRM (Lead â†’ Prospecto â†’ Cliente â†’ Ativo)
âŒ Sem analytics de campanhas (abertura, resposta, clique)
âŒ Sem chatbot/atendimento automático
âŒ Sem agendamento recorrente de campanhas
âŒ Sem A/B testing de mensagens
```

---

## Arquitetura do CRM Avançado

### Diagrama de Módulos

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     CRM AVANÃ‡ADO                            â”‚
â”‚                                                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚  CONTATOS   â”‚  â”‚ CAMPANHAS   â”‚  â”‚    FLUXOS        â”‚    â”‚
â”‚  â”‚  Segmentos  â”‚  â”‚ Disparo em  â”‚  â”‚  Automações      â”‚    â”‚
â”‚  â”‚  Tags/Funil â”‚  â”‚   Massa     â”‚  â”‚  Drag-and-Drop   â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚         â”‚                â”‚                   â”‚              â”‚
â”‚         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â”‚
â”‚                          â”‚                                  â”‚
â”‚                â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                       â”‚
â”‚                â”‚   ENGINE CENTRAL   â”‚                       â”‚
â”‚                â”‚  (communication-   â”‚                       â”‚
â”‚                â”‚   engine.ts)       â”‚                       â”‚
â”‚                â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                       â”‚
â”‚                          â”‚                                  â”‚
â”‚          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                  â”‚
â”‚          â–¼               â–¼               â–¼                  â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”          â”‚
â”‚   â”‚  WhatsApp   â”‚ â”‚  E-mail  â”‚  â”‚   Analytics   â”‚          â”‚
â”‚   â”‚ Evolution   â”‚ â”‚  SMTP    â”‚  â”‚   Dashboard   â”‚          â”‚
â”‚   â”‚    API      â”‚ â”‚          â”‚  â”‚               â”‚          â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Módulos a Implementar

### ðŸ“ Módulo 1 â€” Segmentação de Contatos

**Objetivo:** Criar grupos dinâmicos e estáticos de clientes para comunicação direcionada.

#### Novas Entidades no Banco

```sql
-- Tags de contato
ContactTag (
  id, escritorioId, name, color, description, createdAt
)

-- Associação cliente-tag
ClienteContactTag (
  clienteId, tagId, assignedAt, assignedBy
)

-- Segmentos dinâmicos (query salva)
ContactSegment (
  id, escritorioId, name, description,
  filterJson,         -- JSON com os filtros (status, área, tag, etc.)
  isDynamic,          -- Se true, recalcula em tempo real
  lastCalculatedAt,
  memberCount
)

-- Membros de segmento (cache para segmentos dinâmicos)
ContactSegmentMember (
  segmentId, clienteId, addedAt
)
```

#### Filtros de Segmentação suportados

```typescript
interface SegmentFilter {
  status?: StatusCliente[];           // ATIVO, PROSPECTO, INATIVO, INADIMPLENTE
  tipoPessoa?: TipoPessoa[];          // PF, PJ
  areasAtuacao?: string[];            // FAMÍLIA, TRABALHISTA, CÍVEL, etc.
  tags?: string[];                    // Tags manuais
  hasProcesso?: boolean;              // Tem processo ativo?
  hasDebitoVencido?: boolean;         // Tem fatura vencida?
  createdAfter?: Date;                // Cliente desde...
  createdBefore?: Date;
  lastContactAfter?: Date;            // Ãšltimo contato após...
  lastContactBefore?: Date;           // Sem contato há X dias
  customQuery?: string;               // Query Prisma raw (avançado)
}
```

#### Páginas

- `/crm/contatos` â€” Lista de contatos com filtros + tags
- `/crm/segmentos` â€” Criação e gestão de segmentos
- `/crm/segmentos/[id]` â€” Detalhe do segmento + preview de contatos

---

### ðŸ“ Módulo 2 â€” Campanhas de Disparo em Massa

**Objetivo:** Criar e executar campanhas de mensagem para grupos de contatos com controle total.

#### Modelo de Dados

```sql
Campaign (
  id, escritorioId, name, description,
  status,             -- DRAFT | SCHEDULED | RUNNING | PAUSED | COMPLETED | CANCELLED
  canal,              -- WHATSAPP | EMAIL | BOTH
  templateId,         -- Template a usar
  segmentId,          -- Segmento alvo (ou lista manual)
  scheduledAt,        -- Data/hora de execução
  startedAt,
  completedAt,
  totalRecipients,
  sentCount,
  failedCount,
  openCount,          -- Para e-mail
  replyCount,         -- Quantos responderam
  rateLimit,          -- Msgs/minuto (ex: 20 para WhatsApp)
  intervalMs,         -- Intervalo entre envios
  createdBy,
  createdAt
)

CampaignRecipient (
  id, campaignId, clienteId,
  phone, email,
  status,             -- PENDING | SENT | FAILED | BOUNCED | OPT_OUT
  sentAt,
  errorMessage,
  providerMsgId,
  openedAt,           -- E-mail tracking
  repliedAt
)
```

#### Fluxo de Execução de Campanha

```
[Criar Campanha] â†’ [Selecionar Segmento] â†’ [Escolher Template]
       â†“
[Preview: lista de destinatários + mensagem renderizada]
       â†“
[Agendar ou Executar Agora]
       â†“
[BullMQ: CampaignQueue processa em lotes]
       â†“
[Rate limiting: N msgs/min com delay configurável]
       â†“
[Evolution API / SMTP]
       â†“
[Atualiza CampaignRecipient]
       â†“
[Analytics em tempo real]
```

#### Rate Limiting & Segurança Anti-Ban (WhatsApp)

```typescript
// Configuração recomendada para WhatsApp
const WHATSAPP_RATE_CONFIG = {
  msgsPerMinute: 15,          // Máximo seguro para évitar ban
  intervalBetweenMs: 4000,    // 4 segundos entre mensagens
  batchSize: 5,               // Processar 5 por vez
  cooldownBetweenBatches: 30000, // 30s de pausa a cada lote
  workingHoursOnly: true,     // Só enviar entre 8h-20h
  maxDailyPerContact: 1,      // Máximo 1 msg/dia por cliente
};
```

#### Páginas

- `/crm/campanhas` â€” Lista de campanhas + KPIs
- `/crm/campanhas/nova` â€” Wizard de criação (4 passos)
- `/crm/campanhas/[id]` â€” Detalhe + analytics em tempo real
- `/crm/campanhas/[id]/destinatarios` â€” Lista de destinatários + status individual

---

### ðŸ“ Módulo 3 â€” Fluxos de Automação (Workflows)

**Objetivo:** Editor visual de automações tipo "se X acontece â†’ faz Y â†’ espera Z â†’ faz W".

#### Conceito: Nós do Fluxo

```typescript
type FlowNodeType =
  | "TRIGGER"          // Ponto de entrada do fluxo
  | "CONDITION"        // Ramificação condicional (if/else)
  | "SEND_MESSAGE"     // Envia mensagem (WhatsApp/Email)
  | "WAIT"             // Aguarda X tempo
  | "ADD_TAG"          // Adiciona tag ao contato
  | "REMOVE_TAG"       // Remove tag
  | "UPDATE_STATUS"    // Muda status do cliente
  | "CREATE_TASK"      // Cria tarefa para advogado
  | "NOTIFY_TEAM"      // Notifica equipe internamente
  | "WEBHOOK"          // Chama endpoint externo
  | "END"              // Fim do fluxo
```

#### Triggers disponíveis

| Trigger | Descrição |
|---|---|
| `CLIENTE_CADASTRADO` | Novo cliente criado |
| `PROCESSO_ABERTO` | Novo processo cadastrado |
| `PRAZO_D5/D3/D1/D0` | Prazo se aproximando |
| `FATURA_VENCENDO` | Fatura vence em X dias |
| `FATURA_VENCIDA` | Fatura em atraso |
| `CLIENTE_INATIVO_30D` | Sem contato em 30 dias |
| `MENSAGEM_RECEBIDA` | Cliente enviou mensagem |
| `TAG_ADICIONADA` | Tag específica adicionada |
| `MANUAL` | Acionado manualmente |
| `CRON` | Agendamento recorrente (cron) |

#### Modelo de Dados do Fluxo

```sql
AutomationFlow (
  id, escritorioId, name, description,
  triggerType,        -- Tipo do trigger
  triggerConfig,      -- JSON: configurações do trigger
  nodes,              -- JSON: array de nós (posição, tipo, config)
  edges,              -- JSON: conexões entre nós
  isActive,
  version,
  executionCount,
  createdAt, updatedAt
)

FlowExecution (
  id, flowId, clienteId, processoId,
  status,             -- RUNNING | COMPLETED | FAILED | CANCELLED
  currentNodeId,
  startedAt, completedAt,
  errorMessage,
  log                 -- JSON: histórico de execução passo a passo
)
```

#### Editor Visual (Frontend)

Biblioteca recomendada: **React Flow** (já usado em sistemas similares, licença MIT)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  EDITOR DE FLUXO                          [Salvar] [â–¶]  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”               â”‚
â”‚  â”‚  ðŸŽ¯ TRIGGER  â”‚â”€â”€â”€â”€â”€â–¶â”‚ â± AGUARDAR  â”‚               â”‚
â”‚  â”‚  Novo Clienteâ”‚      â”‚   1 hora     â”‚               â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜               â”‚
â”‚                               â”‚                        â”‚
â”‚                        â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”               â”‚
â”‚                        â”‚ ðŸ’¬ ENVIAR    â”‚               â”‚
â”‚                        â”‚  WhatsApp    â”‚               â”‚
â”‚                        â”‚ "Bem-vindo!" â”‚               â”‚
â”‚                        â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜               â”‚
â”‚                               â”‚                        â”‚
â”‚                        â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”               â”‚
â”‚                        â”‚ â“ CONDIÃ‡ÃƒO  â”‚               â”‚
â”‚                        â”‚  Respondeu?  â”‚               â”‚
â”‚                        â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜               â”‚
â”‚                         SIM â”€â”€â”¤â”€â”€ NÃƒO                 â”‚
â”‚                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”          â”‚
â”‚              â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”           â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚              â”‚ ðŸ· ADD TAG â”‚           â”‚ ðŸ“‹ CRIAR    â”‚  â”‚
â”‚              â”‚ "Engajado" â”‚           â”‚  TAREFA     â”‚  â”‚
â”‚              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Páginas

- `/crm/fluxos` â€” Lista de fluxos ativos/inativos
- `/crm/fluxos/novo` â€” Editor visual
- `/crm/fluxos/[id]` â€” Editor + histórico de execuções
- `/crm/fluxos/[id]/execucoes` â€” Logs de execução por cliente

---

### ðŸ“ Módulo 4 â€” Funil CRM (Pipeline)

**Objetivo:** Visualizar e mover clientes/prospectos através de estágios de relacionamento.

#### Estágios do Funil Jurídico

```
LEAD â†’ PROSPECTO â†’ EM_NEGOCIAÃ‡ÃƒO â†’ CLIENTE_ATIVO â†’ CLIENTE_FIDELIZADO
                                â†“
                          ARQUIVADO / PERDIDO
```

#### Modelo de Dados

```sql
CRMPipeline (
  id, escritorioId, name, stages  -- JSON: array de estágios customizáveis
)

CRMCard (
  id, pipelineId, clienteId,
  stage,            -- Estágio atual
  title,            -- Descrição da oportunidade
  value,            -- Valor estimado do contrato
  probability,      -- % de chance de fechar
  expectedCloseAt,
  assignedTo,       -- Advogado responsável
  notes,
  tags,
  history,          -- JSON: movimentações
  createdAt, updatedAt
)
```

#### View: Kanban Board

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   LEADS    â”‚ PROSPECTOS â”‚ EM NEGOC.  â”‚  CLIENTES  â”‚ FIDELIZADO â”‚
â”‚   (12)     â”‚    (8)     â”‚    (5)     â”‚   (42)     â”‚   (18)     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”‚            â”‚            â”‚
â”‚ â”‚João S. â”‚ â”‚ â”‚Maria C â”‚ â”‚ â”‚Emp. AB â”‚ â”‚    ...     â”‚    ...     â”‚
â”‚ â”‚R$ 3k   â”‚ â”‚ â”‚R$ 8k   â”‚ â”‚ â”‚R$ 25k  â”‚ â”‚            â”‚            â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚            â”‚            â”‚
â”‚    ...     â”‚    ...     â”‚    ...     â”‚            â”‚            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

### ðŸ“ Módulo 5 â€” Analytics de CRM

**Objetivo:** Dashboard com métricas de comunicação e relacionamento.

#### Métricas por Campanha

- Total de destinatários, enviados, falhas
- Taxa de entrega, abertura (e-mail), resposta (WhatsApp)
- Melhor horário de engajamento
- Tempo médio de resposta

#### Métricas do Funil

- Conversão por estágio
- Tempo médio em cada etapa
- Valor total do pipeline
- Receita projetada

#### Métricas de Comunicação

- Mensagens enviadas/recebidas por canal
- Clientes sem contato há X dias
- Templates mais efetivos

---

## Plano de Implementação

### Fase 1 â€” Infraestrutura do CRM (Semana 1-2)

```
[x] Sistema de comunicação base (EXISTENTE)
[ ] Migração do banco: ContactTag, ContactSegment, Campaign,
    CampaignRecipient, AutomationFlow, FlowExecution, CRMCard
[ ] Campaign Queue (BullMQ) com rate limiting
[ ] APIs REST: /api/crm/campanhas, /api/crm/segmentos, /api/crm/fluxos
```

#### Schema Prisma a adicionar

```prisma
model ContactTag {
  id          String   @id @default(cuid())
  escritorioId String
  name        String
  color       String   @default("#3B82F6")
  description String?
  createdAt   DateTime @default(now())

  clientes    ClienteContactTag[]
  escritorio  Escritorio @relation(fields: [escritorioId], references: [id])

  @@unique([escritorioId, name])
}

model ClienteContactTag {
  clienteId  String
  tagId      String
  assignedAt DateTime @default(now())
  assignedBy String?

  cliente    Cliente    @relation(fields: [clienteId], references: [id])
  tag        ContactTag @relation(fields: [tagId], references: [id])

  @@id([clienteId, tagId])
}

model ContactSegment {
  id              String   @id @default(cuid())
  escritorioId    String
  name            String
  description     String?
  filterJson      Json
  isDynamic       Boolean  @default(true)
  memberCount     Int      @default(0)
  lastCalculatedAt DateTime?
  createdAt       DateTime @default(now())

  members   ContactSegmentMember[]
  campaigns Campaign[]
  escritorio Escritorio @relation(fields: [escritorioId], references: [id])
}

model ContactSegmentMember {
  segmentId String
  clienteId String
  addedAt   DateTime @default(now())

  segment ContactSegment @relation(fields: [segmentId], references: [id])
  cliente Cliente        @relation(fields: [clienteId], references: [id])

  @@id([segmentId, clienteId])
}

model Campaign {
  id             String   @id @default(cuid())
  escritorioId   String
  name           String
  description    String?
  status         CampaignStatus @default(DRAFT)
  canal          CanalComunicacao
  templateId     String?
  segmentId      String?
  scheduledAt    DateTime?
  startedAt      DateTime?
  completedAt    DateTime?
  totalRecipients Int     @default(0)
  sentCount      Int      @default(0)
  failedCount    Int      @default(0)
  openCount      Int      @default(0)
  replyCount     Int      @default(0)
  rateLimit      Int      @default(15)
  intervalMs     Int      @default(4000)
  createdBy      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  template   MessageTemplate? @relation(fields: [templateId], references: [id])
  segment    ContactSegment?  @relation(fields: [segmentId], references: [id])
  recipients CampaignRecipient[]
  escritorio Escritorio @relation(fields: [escritorioId], references: [id])
}

model CampaignRecipient {
  id           String   @id @default(cuid())
  campaignId   String
  clienteId    String
  phone        String?
  email        String?
  status       RecipientStatus @default(PENDING)
  sentAt       DateTime?
  errorMessage String?
  providerMsgId String?
  openedAt     DateTime?
  repliedAt    DateTime?

  campaign Campaign @relation(fields: [campaignId], references: [id])
  cliente  Cliente  @relation(fields: [clienteId], references: [id])
}

model AutomationFlow {
  id             String   @id @default(cuid())
  escritorioId   String
  name           String
  description    String?
  triggerType    String
  triggerConfig  Json     @default("{}")
  nodes          Json     @default("[]")
  edges          Json     @default("[]")
  isActive       Boolean  @default(false)
  version        Int      @default(1)
  executionCount Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  executions FlowExecution[]
  escritorio Escritorio @relation(fields: [escritorioId], references: [id])
}

model FlowExecution {
  id          String   @id @default(cuid())
  flowId      String
  clienteId   String?
  processoId  String?
  status      FlowExecutionStatus @default(RUNNING)
  currentNodeId String?
  startedAt   DateTime @default(now())
  completedAt DateTime?
  errorMessage String?
  log         Json     @default("[]")

  flow    AutomationFlow @relation(fields: [flowId], references: [id])
  cliente Cliente?       @relation(fields: [clienteId], references: [id])
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  RUNNING
  PAUSED
  COMPLETED
  CANCELLED
}

enum RecipientStatus {
  PENDING
  SENT
  FAILED
  BOUNCED
  OPT_OUT
}

enum FlowExecutionStatus {
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

### Fase 2 â€” Interface de Campanhas (Semana 3-4)

```
[ ] Página /crm/campanhas (lista + KPIs)
[ ] Wizard de criação de campanha (4 passos):
    Passo 1: Nome, canal, descrição
    Passo 2: Selecionar segmento ou importar lista
    Passo 3: Escolher template + preview personalizado
    Passo 4: Agendar ou executar + configurar rate limit
[ ] Página de detalhe com analytics em tempo real
[ ] Server-Sent Events (SSE) para progresso ao vivo
[ ] Botões: Pausar, Retomar, Cancelar campanha
```

---

### Fase 3 â€” Segmentos e Tags (Semana 3)

```
[ ] Gestão de tags (criar, editar, cor)
[ ] Adicionar/remover tags em clientes (bulk selection)
[ ] Builder de segmentos com preview ao vivo
[ ] Segmentos dinâmicos recalculados via cron diário
[ ] Exportação de segmento para CSV
```

---

### Fase 4 â€” Editor de Fluxos (Semana 5-6)

```
[ ] Instalar React Flow (@xyflow/react)
[ ] Nós customizados: Trigger, Condition, SendMessage, Wait,
    AddTag, UpdateStatus, CreateTask, NotifyTeam, End
[ ] Engine de execução de fluxos (server-side)
[ ] Integração com BullMQ para execução assíncrona
[ ] Logs de execução por cliente (FlowExecution)
[ ] Página de fluxos com status e métricas
```

---

### Fase 5 â€” Funil CRM e Analytics (Semana 7-8)

```
[ ] Kanban board com drag-and-drop (dnd-kit)
[ ] Dashboard analytics: taxa de conversão, tempo por etapa
[ ] Relatório de campanhas enviadas
[ ] Gráficos de engajamento (Chart.js ou Recharts)
[ ] Exportação de relatórios PDF/Excel
```

---

## Estrutura de Arquivos Planejada

```
src/
â”œâ”€â”€ app/(dashboard)/
â”‚   â””â”€â”€ crm/
â”‚       â”œâ”€â”€ layout.tsx
â”‚       â”œâ”€â”€ page.tsx                    # Dashboard CRM
â”‚       â”œâ”€â”€ campanhas/
â”‚       â”‚   â”œâ”€â”€ page.tsx                # Lista campanhas
â”‚       â”‚   â”œâ”€â”€ nova/
â”‚       â”‚   â”‚   â””â”€â”€ page.tsx            # Wizard criação
â”‚       â”‚   â””â”€â”€ [id]/
â”‚       â”‚       â”œâ”€â”€ page.tsx            # Detalhe + analytics
â”‚       â”‚       â””â”€â”€ destinatarios/
â”‚       â”‚           â””â”€â”€ page.tsx
â”‚       â”œâ”€â”€ segmentos/
â”‚       â”‚   â”œâ”€â”€ page.tsx
â”‚       â”‚   â””â”€â”€ [id]/
â”‚       â”‚       â””â”€â”€ page.tsx
â”‚       â”œâ”€â”€ fluxos/
â”‚       â”‚   â”œâ”€â”€ page.tsx
â”‚       â”‚   â”œâ”€â”€ novo/
â”‚       â”‚   â”‚   â””â”€â”€ page.tsx            # Editor visual
â”‚       â”‚   â””â”€â”€ [id]/
â”‚       â”‚       â”œâ”€â”€ page.tsx            # Editor + histórico
â”‚       â”‚       â””â”€â”€ execucoes/
â”‚       â”‚           â””â”€â”€ page.tsx
â”‚       â””â”€â”€ pipeline/
â”‚           â””â”€â”€ page.tsx                # Kanban board
â”‚
â”œâ”€â”€ components/crm/
â”‚   â”œâ”€â”€ campaign-wizard.tsx
â”‚   â”œâ”€â”€ campaign-stats.tsx
â”‚   â”œâ”€â”€ segment-builder.tsx
â”‚   â”œâ”€â”€ flow-editor/
â”‚   â”‚   â”œâ”€â”€ flow-canvas.tsx
â”‚   â”‚   â”œâ”€â”€ nodes/
â”‚   â”‚   â”‚   â”œâ”€â”€ trigger-node.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ send-message-node.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ condition-node.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ wait-node.tsx
â”‚   â”‚   â”‚   â””â”€â”€ action-node.tsx
â”‚   â”‚   â””â”€â”€ sidebar-palette.tsx
â”‚   â””â”€â”€ pipeline-board.tsx
â”‚
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ dal/crm/
â”‚   â”‚   â”œâ”€â”€ campaigns.ts
â”‚   â”‚   â”œâ”€â”€ segments.ts
â”‚   â”‚   â””â”€â”€ flows.ts
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ campaign-engine.ts          # Motor de disparo em massa
â”‚   â”‚   â”œâ”€â”€ segment-engine.ts           # Cálculo de segmentos dinâmicos
â”‚   â”‚   â””â”€â”€ flow-executor.ts            # Execução de fluxos de automação
â”‚   â””â”€â”€ queue/
â”‚       â”œâ”€â”€ campaign-queue.ts           # BullMQ para campanhas
â”‚       â””â”€â”€ flow-queue.ts               # BullMQ para fluxos
â”‚
â””â”€â”€ app/api/crm/
    â”œâ”€â”€ campanhas/
    â”‚   â”œâ”€â”€ route.ts                    # GET list, POST create
    â”‚   â””â”€â”€ [id]/
    â”‚       â”œâ”€â”€ route.ts                # GET, PATCH, DELETE
    â”‚       â”œâ”€â”€ start/route.ts          # POST: inicia campanha
    â”‚       â”œâ”€â”€ pause/route.ts          # POST: pausa
    â”‚       â””â”€â”€ progress/route.ts       # GET SSE: progresso ao vivo
    â”œâ”€â”€ segmentos/
    â”‚   â”œâ”€â”€ route.ts
    â”‚   â”œâ”€â”€ [id]/route.ts
    â”‚   â””â”€â”€ [id]/preview/route.ts      # GET: preview de destinatários
    â””â”€â”€ fluxos/
        â”œâ”€â”€ route.ts
        â””â”€â”€ [id]/
            â”œâ”€â”€ route.ts
            â””â”€â”€ execucoes/route.ts
```

---

## Regras de Negócio e Compliance

### LGPD (Lei Geral de Proteção de Dados)

- âœ… Respeitar `whatsappOptIn = "OPTED_OUT"` (já implementado)
- âœ… Adicionar link de descadastro em todas as campanhas
- âœ… Registrar consentimento com timestamp ao adicionar contato
- âœ… Relatório de descadastros para o escritório
- âœ… Máximo de X mensagens por cliente por dia (configurável)

### Anti-Spam WhatsApp

- âš ï¸ Rate limit máximo: **15 msgs/minuto**
- âš ï¸ Intervalo mínimo entre msgs para o mesmo número: **24h**
- âš ï¸ Só enviar em horário comercial: **8hâ€“20h**
- âš ï¸ Não enviar em domingos e feriados nacionais
- âš ï¸ Mensagens devem ser personalizadas (variáveis obrigatórias)

### Auditoria

- Todo disparo deve ter `campaignId` ou `ruleId` rastreável
- Log de execução por destinatário com timestamp
- Quem criou/disparou cada campanha (`createdBy`)

---

## Dependências a Instalar

```bash
# Editor visual de fluxos
npm install @xyflow/react

# Drag-and-drop para Kanban
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Gráficos de analytics
npm install recharts

# Data export
npm install xlsx  # (já existe no projeto)
```

---

## Referências e Inspiração

| Sistema | O que usar de referência |
|---|---|
| **RD Station** | Segmentação e funil de leads |
| **ActiveCampaign** | Editor visual de automações |
| **Kommo (antigo amoCRM)** | Kanban de pipeline |
| **Zenvia** | Disparo em massa WhatsApp |
| **YClient** | Agendamentos + CRM integrado |

---

## Próximos Passos Imediatos

1. **Aprovar este plano** e definir prioridade dos módulos
2. **Executar migração do banco** com os novos modelos Prisma
3. **Iniciar pelo Módulo 2 (Campanhas)** â€” impacto imediato no negócio
4. **Conectar ao módulo de Clientes existente** â€” aproveitar dados já cadastrados

---

> ðŸ“Œ **Observação:** O CommunicationEngine existente (`communication-engine.ts`) será estendido, não reescrito. O CRM avançado é uma camada adicional que reutiliza toda a infraestrutura de envio já testada.

